import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { orderReturns, orders } from "../db/schema.js";
import { getCartSessionId, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { canViewOrderAsCustomer } from "../lib/orderAccess.js";
import { grantOrderAccess } from "../services/guestLinking.js";
import { getOrderDownloads } from "../services/orders.js";
import { formatGhs, paymentInstructions } from "../lib/utils.js";
import { isPhysicalReturnEligible } from "../lib/orderTransitions.js";
import { notifyReturnUpdate } from "../lib/notify.js";

const router = Router();

router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, req.user!.id),
    with: { items: true },
    orderBy: [desc(orders.createdAt)],
  });
  res.json({ orders: rows });
});

router.get("/mine/downloads", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, req.user!.id),
    orderBy: [desc(orders.createdAt)],
  });

  const downloads = [];
  for (const order of rows) {
    if (order.status !== "paid" && order.status !== "fulfilled") continue;
    const items = await getOrderDownloads(order.id);
    for (const item of items) {
      downloads.push({ ...item, orderId: order.id });
    }
  }

  res.json({ downloads });
});

router.post("/track", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    orderId: z.string().uuid(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "email and orderId required" });
  }

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, parsed.data.orderId),
      eq(orders.email, parsed.data.email.toLowerCase()),
    ),
    with: { items: true },
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  grantOrderAccess(req, order.id);

  const downloads =
    order.status === "paid" || order.status === "fulfilled"
      ? await getOrderDownloads(order.id)
      : [];

  res.json({
    order: {
      id: order.id,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentMethod: order.paymentMethod,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      subtotalPesewas: order.subtotalPesewas,
      shippingPesewas: order.shippingPesewas,
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
});

router.post("/:id/returns", async (req: AuthedRequest, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    reason: z.enum(["damaged", "incorrect_item", "not_as_described", "changed_mind", "other"]),
    details: z.string().trim().min(10).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a return reason and at least 10 characters of detail" });

  const order = await db.query.orders.findFirst({ where: eq(orders.id, req.params.id) });
  if (!order) return res.status(404).json({ error: "Order not found" });
  const sessionId = getCartSessionId(req);
  const suppliedEmail = parsed.data.email?.toLowerCase();
  const isOwner = (req.user && order.userId === req.user.id)
    || (!!order.sessionId && order.sessionId === sessionId)
    || (suppliedEmail && suppliedEmail === order.email.toLowerCase());
  if (!isOwner) return res.status(403).json({ error: "Not allowed to request a return for this order" });

  if (!isPhysicalReturnEligible(order)) {
    return res.status(409).json({ error: "Returns are available for delivered or collected physical orders within 7 days" });
  }

  const activeRequest = await db.query.orderReturns.findFirst({
    where: and(eq(orderReturns.orderId, order.id), inArray(orderReturns.status, [
      "requested",
      "approved",
      "refund_pending",
      "refund_processing",
      "refund_needs_attention",
      "refund_failed",
      "refunded",
    ])),
  });
  if (activeRequest) return res.status(409).json({ error: "A return request already exists for this order" });

  const [returnRequest] = await db.insert(orderReturns).values({
    orderId: order.id,
    requestedByUserId: req.user?.id ?? null,
    reason: parsed.data.reason,
    details: parsed.data.details,
  }).returning();
  void notifyReturnUpdate({
    id: returnRequest.id,
    orderId: order.id,
    email: order.email,
    name: order.name,
    phone: order.phone,
    reason: returnRequest.reason,
    details: returnRequest.details,
    status: returnRequest.status,
  }).catch((err) => console.error("[notify:return] request failed", err));
  res.status(201).json({ returnRequest });
});

router.get("/:id/receipt", async (req: AuthedRequest, res) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
    with: { items: true },
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!canViewOrderAsCustomer(req, order)) {
    return res.status(403).json({ error: "Not allowed to view this receipt" });
  }

  const store = paymentInstructions().store;
  res.json({
    receipt: {
      brand: "Media Extensions",
      orderId: order.id,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentMethod: order.paymentMethod,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
      },
      shipping: order.shipping,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPricePesewas: item.unitPricePesewas,
        lineTotalPesewas: item.unitPricePesewas * item.quantity,
        unitPriceFormatted: formatGhs(item.unitPricePesewas),
        lineTotalFormatted: formatGhs(item.unitPricePesewas * item.quantity),
      })),
      subtotalPesewas: order.subtotalPesewas,
      shippingPesewas: order.shippingPesewas,
      totalPesewas: order.totalPesewas,
      subtotalFormatted: formatGhs(order.subtotalPesewas),
      shippingFormatted: formatGhs(order.shippingPesewas),
      totalFormatted: formatGhs(order.totalPesewas),
      currency: order.currency,
      createdAt: order.createdAt,
      store,
    },
  });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
    with: { items: { with: { downloadTokens: true } }, returns: true },
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!canViewOrderAsCustomer(req, order)) {
    return res.status(403).json({ error: "Not allowed to view this order" });
  }

  const downloads =
    order.status === "paid" || order.status === "fulfilled"
      ? await getOrderDownloads(order.id)
      : [];

  res.json({ order, downloads });
});

export default router;
