import type { Request } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, repairOrders, users } from "../db/schema.js";

/** Attach guest checkout/bookings to the user after login or register. */
export async function mergeGuestOrdersAndRepairsIntoUser(req: Request, userId: string) {
  const sessionId = req.session.cartSessionId;
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return;

  const email = user.email.toLowerCase();

  if (sessionId) {
    await db
      .update(orders)
      .set({ userId })
      .where(and(eq(orders.sessionId, sessionId), isNull(orders.userId)));
    await db
      .update(repairOrders)
      .set({ userId })
      .where(and(eq(repairOrders.sessionId, sessionId), isNull(repairOrders.userId)));
  }

  await db
    .update(orders)
    .set({ userId })
    .where(and(eq(orders.email, email), isNull(orders.userId)));
  await db
    .update(repairOrders)
    .set({ userId })
    .where(and(eq(repairOrders.email, email), isNull(repairOrders.userId)));
}

export function grantOrderAccess(req: Request, orderId: string) {
  const session = req.session as { grantedOrderIds?: string[] };
  if (!session.grantedOrderIds) session.grantedOrderIds = [];
  if (!session.grantedOrderIds.includes(orderId)) {
    session.grantedOrderIds.push(orderId);
    if (session.grantedOrderIds.length > 20) {
      session.grantedOrderIds = session.grantedOrderIds.slice(-20);
    }
  }
}

export function grantRepairAccess(req: Request, repairId: string) {
  const session = req.session as { grantedRepairIds?: string[] };
  if (!session.grantedRepairIds) session.grantedRepairIds = [];
  if (!session.grantedRepairIds.includes(repairId)) {
    session.grantedRepairIds.push(repairId);
    if (session.grantedRepairIds.length > 20) {
      session.grantedRepairIds = session.grantedRepairIds.slice(-20);
    }
  }
}

export function hasGrantedOrderAccess(req: Request, orderId: string): boolean {
  const ids = (req.session as { grantedOrderIds?: string[] }).grantedOrderIds;
  return Boolean(ids?.includes(orderId));
}

export function hasGrantedRepairAccess(req: Request, repairId: string): boolean {
  const ids = (req.session as { grantedRepairIds?: string[] }).grantedRepairIds;
  return Boolean(ids?.includes(repairId));
}
