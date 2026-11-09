import crypto from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { orderReturns, orders, repairOrders } from "../db/schema.js";
import { recordAuditLog } from "../lib/audit.js";
import { paystackRefundStatusForEvent, canTransitionReturnStatus } from "../lib/orderTransitions.js";
import { verifyTransaction } from "../lib/paystack.js";
import { notifyReturnUpdate } from "../lib/notify.js";
import { markOrderPaid } from "../services/orders.js";
import { markRepairPaidByPaystack } from "../services/repairs.js";

function verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(hash, "hex");
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

export async function handlePaystackWebhook(req: Request, res: Response) {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: {
    event?: string;
    data?: {
      reference?: string;
      transaction_reference?: string;
      refund_reference?: string | null;
      amount?: number | string;
      currency?: string;
    };
  };
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as typeof payload;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const refundStatus = paystackRefundStatusForEvent(payload.event ?? "");
  if (refundStatus) {
    const transactionReference = payload.data?.transaction_reference;
    if (!transactionReference) return res.status(400).json({ error: "Refund transaction reference required" });
    const order = await db.query.orders.findFirst({ where: eq(orders.paystackReference, transactionReference) });
    if (!order) return res.status(404).json({ error: "Order not found for refund" });
    const request = await db.query.orderReturns.findFirst({
      where: and(
        eq(orderReturns.orderId, order.id),
        inArray(orderReturns.status, ["refund_pending", "refund_processing", "refund_needs_attention", "refund_failed"]),
      ),
      with: { order: true },
    });
    if (!request) return res.json({ ok: true, ignored: true });
    const eventAmount = Number(payload.data?.amount);
    if (Number.isFinite(eventAmount) && request.refundPesewas != null && eventAmount !== request.refundPesewas) {
      return res.status(400).json({ error: "Refund amount mismatch" });
    }
    if (request.status !== refundStatus && !canTransitionReturnStatus(request.status, refundStatus)) {
      return res.json({ ok: true, ignored: true });
    }
    if (request.status === refundStatus) return res.json({ ok: true, duplicate: true });

    const [updated] = await db.update(orderReturns).set({
      status: refundStatus,
      refundReference: payload.data?.refund_reference ?? request.refundReference,
      updatedAt: new Date(),
    }).where(and(eq(orderReturns.id, request.id), eq(orderReturns.status, request.status))).returning();
    if (!updated) return res.json({ ok: true, duplicate: true });
    await recordAuditLog({
      actorUserId: null,
      action: `paystack_${refundStatus}`,
      entityType: "order_return",
      entityId: request.id,
      details: { orderId: order.id, providerReference: updated.refundReference, amountPesewas: updated.refundPesewas },
    });
    void notifyReturnUpdate({
      id: updated.id,
      orderId: order.id,
      email: order.email,
      name: order.name,
      phone: order.phone,
      reason: updated.reason,
      details: updated.details,
      status: updated.status,
      decisionNotes: updated.decisionNotes,
      refundPesewas: updated.refundPesewas,
      refundReference: updated.refundReference,
    }).catch((err) => console.error("[notify:return] Paystack status failed", err));
    return res.json({ ok: true });
  }

  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return res.json({ ok: true, ignored: true });
  }

  const reference = payload.data.reference;

  try {
    const verified = await verifyTransaction(reference);
    if (!verified || verified.status !== "success") {
      return res.status(402).json({ error: "Payment not successful" });
    }
    if (verified.currency !== "GHS") {
      return res.status(402).json({ error: "Currency mismatch" });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.paystackReference, reference),
    });
    if (order) {
      if (order.status === "paid" || order.status === "fulfilled") {
        return res.json({ ok: true, alreadyPaid: true, kind: "order" });
      }
      if (verified.amount !== order.totalPesewas) {
        return res.status(402).json({ error: "Amount mismatch" });
      }
      await markOrderPaid(order.id);
      return res.json({ ok: true, kind: "order" });
    }

    const repair = await db.query.repairOrders.findFirst({
      where: eq(repairOrders.paystackReference, reference),
    });
    if (!repair) {
      return res.status(404).json({ error: "Order or repair not found for reference" });
    }
    if (repair.paymentStatus === "paid") {
      return res.json({ ok: true, alreadyPaid: true, kind: "repair" });
    }
    if (repair.quotePesewas == null || verified.amount !== repair.quotePesewas) {
      return res.status(402).json({ error: "Amount mismatch" });
    }
    await markRepairPaidByPaystack({
      repairId: repair.id,
      amountPesewas: repair.quotePesewas,
      reference,
    });
    return res.json({ ok: true, kind: "repair" });
  } catch (err) {
    console.error("[paystack:webhook]", err);
    return res.status(502).json({ error: "Webhook processing failed" });
  }
}
