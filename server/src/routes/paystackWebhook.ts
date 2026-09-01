import crypto from "node:crypto";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { verifyTransaction } from "../lib/paystack.js";
import { markOrderPaid } from "../services/orders.js";

function verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

export async function handlePaystackWebhook(req: Request, res: Response) {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: { event?: string; data?: { reference?: string } };
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as typeof payload;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return res.json({ ok: true, ignored: true });
  }

  const reference = payload.data.reference;
  const order = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, reference),
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status === "paid" || order.status === "fulfilled") {
    return res.json({ ok: true, alreadyPaid: true });
  }

  try {
    const verified = await verifyTransaction(reference);
    if (!verified || verified.status !== "success") {
      return res.status(402).json({ error: "Payment not successful" });
    }
    if (verified.amount < order.totalPesewas) {
      return res.status(402).json({ error: "Amount mismatch" });
    }
    await markOrderPaid(order.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[paystack:webhook]", err);
    return res.status(502).json({ error: "Webhook processing failed" });
  }
}
