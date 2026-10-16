import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, repairOrders } from "../db/schema.js";
import { verifyTrackToken } from "../lib/trackToken.js";
import { getOrderDownloads } from "../services/orders.js";
import { grantOrderAccess, grantRepairAccess } from "../services/guestLinking.js";

const router = Router();

router.get("/:token", async (req, res) => {
  const payload = verifyTrackToken(req.params.token);
  if (!payload) {
    return res.status(404).json({ error: "Invalid or expired tracking link" });
  }

  if (payload.k === "order") {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, payload.id),
      with: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    grantOrderAccess(req, order.id);
    const downloads =
      order.status === "paid" || order.status === "fulfilled"
        ? await getOrderDownloads(order.id)
        : [];
    return res.json({
      kind: "order",
      order: {
        id: order.id,
        status: order.status,
        fulfillmentMethod: order.fulfillmentMethod,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentMethod: order.paymentMethod,
        trackingCarrier: order.trackingCarrier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        totalPesewas: order.totalPesewas,
        currency: order.currency,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPricePesewas: item.unitPricePesewas,
          fulfillment: item.fulfillment,
        })),
      },
      downloads,
    });
  }

  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, payload.id),
    with: { service: true, payments: true },
  });
  if (!repair) return res.status(404).json({ error: "Repair not found" });
  grantRepairAccess(req, repair.id);
  return res.json({ kind: "repair", repair });
});

export default router;
