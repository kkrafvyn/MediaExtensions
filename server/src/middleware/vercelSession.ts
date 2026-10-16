import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Session, SessionData } from "express-session";

const COOKIE_NAME = "connect.sid";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

type SessionPayload = {
  userId?: string;
  cartSessionId?: string;
  sessionVersion?: number;
  nonce: string;
  expiresAt: number;
};

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionPayload(data: Omit<SessionPayload, "expiresAt">, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...data, expiresAt: now + SESSION_MAX_AGE_MS })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySessionPayload(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 4096) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = signature(payload, secret);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt! <= now || typeof parsed.nonce !== "string") return null;
    if (parsed.userId !== undefined && typeof parsed.userId !== "string") return null;
    if (parsed.cartSessionId !== undefined && typeof parsed.cartSessionId !== "string") return null;
    if (parsed.sessionVersion !== undefined && typeof parsed.sessionVersion !== "number") return null;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export function vercelSession(secret: string, secure: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const saved = verifySessionPayload(req.cookies?.[COOKIE_NAME], secret);
    let destroyed = false;
    const session = Object.assign(Object.create(null), {
      userId: saved?.userId,
      cartSessionId: saved?.cartSessionId,
      sessionVersion: saved?.sessionVersion,
      nonce: saved?.nonce ?? randomUUID(),
      destroy(callback?: (err?: Error) => void) {
        destroyed = true;
        delete session.userId;
        delete session.cartSessionId;
        callback?.();
      },
      regenerate(callback?: (err?: Error) => void) {
        delete session.userId;
        delete session.cartSessionId;
        session.nonce = randomUUID();
        callback?.();
      },
      save(callback?: (err?: Error) => void) {
        callback?.();
      },
      reload(callback?: (err?: Error) => void) {
        callback?.();
      },
      touch(callback?: (err?: Error) => void) {
        callback?.();
      },
    }) as Session & SessionData & { nonce: string };
    req.session = session;

    const originalEnd = res.end.bind(res);
    res.end = ((...args: Parameters<Response["end"]>) => {
      if (!res.headersSent) {
        if (destroyed) {
          res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
        } else if (session.userId || session.cartSessionId) {
          const token = signSessionPayload({
            userId: session.userId,
            cartSessionId: session.cartSessionId,
            sessionVersion: (session as { sessionVersion?: number }).sessionVersion,
            nonce: session.nonce,
          }, secret);
          res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_MS / 1000}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
        }
      }
      return originalEnd(...args);
    }) as Response["end"];

    next();
  };
}