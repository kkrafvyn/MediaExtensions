import { z } from "zod";
import { createHash } from "node:crypto";

export const newPasswordSchema = z.string().min(12).max(128);

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: ReadonlySet<string>) {
  return !origin || allowedOrigins.has(origin);
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}