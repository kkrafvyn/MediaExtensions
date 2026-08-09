import type { Request, Response, NextFunction } from "express";
import type { User } from "../db/schema.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    cartSessionId?: string;
  }
}

export type AuthedRequest = Request & { user?: User | null };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRoles(...roles: Array<User["role"]>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function getCartSessionId(req: Request): string {
  if (!req.session.cartSessionId) {
    req.session.cartSessionId = crypto.randomUUID();
  }
  return req.session.cartSessionId;
}
