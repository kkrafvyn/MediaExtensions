import type { Request } from "express";
import type { User } from "../db/schema.js";
import { getCartSessionId, type AuthedRequest } from "../middleware/auth.js";
import { hasGrantedOrderAccess } from "../services/guestLinking.js";

type OrderLike = { id: string; userId: string | null; sessionId: string | null; email: string };

export function isStaffViewer(user: User | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

export function canViewOrderAsCustomer(req: AuthedRequest, order: OrderLike): boolean {
  const sessionId = getCartSessionId(req);
  if (req.user && order.userId === req.user.id) return true;
  if (order.sessionId && order.sessionId === sessionId) return true;
  if (isStaffViewer(req.user)) return true;
  return hasGrantedOrderAccess(req, order.id);
}
