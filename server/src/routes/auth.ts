import { Router } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import { emailVerificationTokens, notifications, passwordResetTokens, users } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { mergeGuestCartIntoUser } from "../services/cart.js";
import { mergeGuestOrdersAndRepairsIntoUser } from "../services/guestLinking.js";
import { sendEmail, isEmailConfigured } from "../lib/mailer.js";
import { hashEmailVerificationToken, hashPasswordResetToken, newPasswordSchema } from "../lib/security.js";
import { decryptTotpSecret, encryptTotpSecret, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, totpSetupUri, verifyTotp } from "../lib/totp.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
  recoveryCode: z.string().regex(/^(?:[A-Fa-f0-9]{16}|[A-Fa-f0-9]{8}-[A-Fa-f0-9]{8})$/).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});
const registrationSchema = credentialsSchema.extend({ password: newPasswordSchema });

async function issueEmailVerification(user: typeof users.$inferSelect) {
  if (user.emailVerifiedAt || (process.env.NODE_ENV === "production" && !isEmailConfigured())) return;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({ userId: user.id, tokenHash, expiresAt });

  const clientUrl = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");
  const verificationLink = `${clientUrl}/verify-email?token=${token}`;
  const message = `Verify your Media Extensions email address: ${verificationLink}\nThis link expires in 24 hours.`;
  await db.insert(notifications).values({
    channel: isEmailConfigured() ? "email" : "log",
    recipient: user.email,
    subject: "Verify your email",
    body: "Email verification instructions were sent to the account email address.",
    meta: { userId: user.id },
  });
  if (isEmailConfigured()) {
    try {
      await sendEmail({ to: user.email, subject: "Verify your Media Extensions email", text: message });
    } catch (err) {
      console.error("[auth:verify-email] email send failed", err);
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`[auth:verify-email] ${user.email} → ${verificationLink}`);
  }
}

async function startUserSession(req: AuthedRequest, userId: string) {
  const guestCartSessionId = req.session.cartSessionId;
  const [user] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => err ? reject(err) : resolve());
  });
  if (guestCartSessionId) req.session.cartSessionId = guestCartSessionId;
  req.session.userId = userId;
  (req.session as { sessionVersion?: number }).sessionVersion = user?.sessionVersion ?? 1;
}

async function bumpSessionVersion(userId: string) {
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}

router.post("/register", async (req, res) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.name) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash,
      role: "consumer",
    })
    .returning();

  await issueEmailVerification(user);
  await startUserSession(req as AuthedRequest, user.id);
  await mergeGuestCartIntoUser(req, user.id);
  await mergeGuestOrdersAndRepairsIntoUser(req, user.id);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, emailVerifiedAt: user.emailVerifiedAt, mfaEnabled: user.mfaEnabled },
  });
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.role === "admin" && user.mfaEnabled) {
    if (!parsed.data.totpCode && !parsed.data.recoveryCode) return res.json({ mfaRequired: true });
    const validTotp = parsed.data.totpCode && user.mfaSecret
      ? verifyTotp(decryptTotpSecret(user.mfaSecret), parsed.data.totpCode)
      : false;
    if (validTotp) {
      // The TOTP is sufficient; recovery codes are only consumed on explicit recovery login.
    } else if (parsed.data.recoveryCode) {
      const recoveryHash = hashRecoveryCode(parsed.data.recoveryCode);
      if (!user.mfaRecoveryCodes.includes(recoveryHash)) {
        return res.status(401).json({ error: "Invalid or already-used recovery code" });
      }
      const remainingCodes = user.mfaRecoveryCodes.filter((code) => code !== recoveryHash);
      const [updatedUser] = await db.update(users).set({ mfaRecoveryCodes: remainingCodes })
        .where(and(eq(users.id, user.id), eq(users.mfaRecoveryCodes, user.mfaRecoveryCodes))).returning();
      if (!updatedUser) return res.status(401).json({ error: "Recovery code was already used; try again" });
    } else {
      return res.status(401).json({ error: "Invalid verification code" });
    }
  }

  await startUserSession(req as AuthedRequest, user.id);
  await mergeGuestCartIntoUser(req, user.id);
  await mergeGuestOrdersAndRepairsIntoUser(req, user.id);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, emailVerifiedAt: user.emailVerifiedAt, mfaEnabled: user.mfaEnabled },
  });
});

router.post("/logout", async (req: AuthedRequest, res) => {
  if (req.user?.id) {
    await bumpSessionVersion(req.user.id);
  }
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req: AuthedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const { id, email, name, phone, role, emailVerifiedAt, mfaEnabled } = req.user;
  res.json({ user: { id, email, name, phone, role, emailVerifiedAt, mfaEnabled } });
});

router.post("/verify-email", async (req, res) => {
  const parsed = z.object({ token: z.string().min(32).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Verification token required" });
  const tokenHash = hashEmailVerificationToken(parsed.data.token);
  const token = await db.query.emailVerificationTokens.findFirst({
    where: and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())),
  });
  if (!token) return res.status(400).json({ error: "Verification link is invalid or expired" });
  const [claimed] = await db.update(emailVerificationTokens).set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.id, token.id), isNull(emailVerificationTokens.usedAt))).returning();
  if (!claimed) return res.status(400).json({ error: "Verification link has already been used" });
  const [user] = await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, token.userId)).returning();
  res.json({ ok: true, email: user.email });
});

router.post("/email-verification/resend", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Not signed in" });
  await issueEmailVerification(req.user);
  res.json({ ok: true });
});

router.post("/mfa/setup", async (req: AuthedRequest, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin account required" });
  const parsed = z.object({ currentPassword: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Current password required" });
  if (!(await bcrypt.compare(parsed.data.currentPassword, req.user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (req.user.mfaEnabled) return res.status(409).json({ error: "MFA is already enabled" });

  const secret = generateTotpSecret();
  await db.update(users).set({ mfaSecret: encryptTotpSecret(secret), mfaRecoveryCodes: [] }).where(eq(users.id, req.user.id));
  res.json({ secret, otpauthUrl: totpSetupUri(secret, req.user.email), ok: true });
});

router.post("/mfa/enable", async (req: AuthedRequest, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin account required" });
  const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success || !req.user.mfaSecret) return res.status(400).json({ error: "Set up MFA before enabling it" });
  if (!verifyTotp(decryptTotpSecret(req.user.mfaSecret), parsed.data.code)) {
    return res.status(401).json({ error: "Invalid verification code" });
  }
  const recoveryCodes = generateRecoveryCodes();
  await db.update(users).set({
    mfaEnabled: true,
    mfaRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
  }).where(eq(users.id, req.user.id));
  res.json({ ok: true, mfaEnabled: true, recoveryCodes });
});

router.post("/mfa/disable", async (req: AuthedRequest, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin account required" });
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success || !req.user.mfaEnabled || !req.user.mfaSecret) {
    return res.status(400).json({ error: "Valid password and MFA code required" });
  }
  if (!(await bcrypt.compare(parsed.data.currentPassword, req.user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (!verifyTotp(decryptTotpSecret(req.user.mfaSecret), parsed.data.code)) {
    return res.status(401).json({ error: "Invalid verification code" });
  }
  await db.update(users).set({ mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] }).where(eq(users.id, req.user.id));
  res.json({ ok: true, mfaEnabled: false });
});

router.post("/forgot-password", async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Always return ok to avoid email enumeration
  if (!user) {
    return res.json({ ok: true });
  }

  if (process.env.NODE_ENV === "production" && !isEmailConfigured()) {
    return res.json({ ok: true });
  }

  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: hashPasswordResetToken(token),
    expiresAt,
  });

  const clientUrl = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");
  const resetLink = `${clientUrl}/reset-password?token=${token}`;
  const body = `Reset your Media Extensions password: ${resetLink}\nThis link expires in 1 hour.`;

  await db.insert(notifications).values({
    channel: "email",
    recipient: user.email,
    subject: "Password reset",
    body: "Password reset instructions were sent to the account email address.",
    meta: { userId: user.id },
  });

  if (isEmailConfigured()) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Media Extensions password",
        text: body,
      });
    } catch (err) {
      console.error("[auth:forgot-password] email send failed", err);
    }
  }

  if (process.env.NODE_ENV !== "production" && !isEmailConfigured()) {
    console.log(`[auth:forgot-password] ${user.email} → ${resetLink}`);
  }

  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const schema = z.object({
    token: z.string().min(1),
    password: newPasswordSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "token and password (min 12) required" });
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.token, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning();

  if (!row) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await bumpSessionVersion(row.userId);

  res.json({ ok: true });
});

router.patch("/profile", async (req: AuthedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const schema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: newPasswordSchema.optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile data" });
  }

  if (parsed.data.newPassword && !parsed.data.currentPassword) {
    return res.status(400).json({ error: "Current password required to set a new password" });
  }

  const updates: { name?: string; phone?: string | null; passwordHash?: string } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;

  if (parsed.data.newPassword) {
    const ok = await bcrypt.compare(parsed.data.currentPassword!, req.user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    updates.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: "No changes provided" });
  }

  const [user] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, req.user.id))
    .returning();

  if (parsed.data.newPassword) {
    await bumpSessionVersion(req.user.id);
    const [fresh] = await db
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    (req.session as { sessionVersion?: number }).sessionVersion = fresh?.sessionVersion ?? 1;
  }

  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
  });
});

export default router;
