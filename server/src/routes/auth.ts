import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import { notifications, passwordResetTokens, users } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { mergeGuestCartIntoUser } from "../services/cart.js";
import { sendEmail, isEmailConfigured } from "../lib/mailer.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
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

  req.session.userId = user.id;
  await mergeGuestCartIntoUser(req, user.id);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
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

  req.session.userId = user.id;
  await mergeGuestCartIntoUser(req, user.id);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req: AuthedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const { id, email, name, phone, role } = req.user;
  res.json({ user: { id, email, name, phone, role } });
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

  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const clientUrl = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");
  const resetLink = `${clientUrl}/reset-password?token=${token}`;
  const body = `Reset your Media Extensions password: ${resetLink}\nThis link expires in 1 hour.`;

  await db.insert(notifications).values({
    channel: isEmailConfigured() ? "email" : "log",
    recipient: user.email,
    subject: "Password reset",
    body,
    meta: { userId: user.id, resetLink },
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

  if (process.env.NODE_ENV !== "production" || !isEmailConfigured()) {
    console.log(`[auth:forgot-password] ${user.email} → ${resetLink}`);
  }

  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const schema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "token and password (min 6) required" });
  }

  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, parsed.data.token),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  });

  if (!row) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  res.json({ ok: true });
});

router.patch("/profile", async (req: AuthedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const schema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    currentPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6).optional(),
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

  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
  });
});

export default router;
