import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { paymentRecords, repairOrders } from "../db/schema.js";
import { notifyRepairStatusUpdate } from "../lib/notify.js";

/**
 * Idempotently mark a repair as paid after Paystack success.
 * Inserts a payment_records row when transitioning from unpaid.
 */
export async function markRepairPaidByPaystack(opts: {
  repairId: string;
  amountPesewas: number;
  reference: string;
}) {
  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, opts.repairId),
  });
  if (!repair) return null;

  if (repair.paymentStatus === "paid") {
    return repair;
  }

  const [claimed] = await db
    .update(repairOrders)
    .set({
      paymentStatus: "paid",
      paymentMethod: "paystack",
      paystackReference: opts.reference,
      updatedAt: new Date(),
    })
    .where(and(eq(repairOrders.id, opts.repairId), eq(repairOrders.paymentStatus, "unpaid")))
    .returning();

  if (!claimed) {
    return db.query.repairOrders.findFirst({ where: eq(repairOrders.id, opts.repairId) });
  }

  await db.insert(paymentRecords).values({
    repairOrderId: claimed.id,
    method: "paystack",
    amountPesewas: opts.amountPesewas,
    reference: opts.reference,
    notes: "Paystack charge.success",
  });

  void notifyRepairStatusUpdate(claimed, repair.status).catch((err) =>
    console.error("[notify:repair] paystack paid", err),
  );

  return claimed;
}
