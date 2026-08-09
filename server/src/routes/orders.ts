import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { getCartSessionId, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getOrderDownloads } from "../services/orders.js";
import { formatGhs, paymentInstructions } from "../lib/utils.js";

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

  res.json({
    order: {
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
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
  });
});

router.get("/:id/receipt", async (req: AuthedRequest, res) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
    with: { items: true },
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const sessionId = getCartSessionId(req);
  const isOwner =
    (req.user && order.userId === req.user.id) ||
    (!!order.sessionId && order.sessionId === sessionId) ||
    (req.user && (req.user.role === "admin" || req.user.role === "manager")) ||
    (typeof req.query.email === "string" &&
      req.query.email.toLowerCase() === order.email.toLowerCase());

  if (!isOwner) {
    return res.status(403).json({ error: "Not allowed to view this receipt" });
  }

  const store = paymentInstructions().store;
  res.json({
    receipt: {
      brand: "Media Extensions",
      orderId: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
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
    with: { items: { with: { downloadTokens: true } } },
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const sessionId = getCartSessionId(req);
  const isOwner =
    (req.user && order.userId === req.user.id) ||
    (!!order.sessionId && order.sessionId === sessionId) ||
    (req.user && (req.user.role === "admin" || req.user.role === "manager"));

  if (!isOwner) {
    return res.status(403).json({ error: "Not allowed to view this order" });
  }

  const downloads =
    order.status === "paid" || order.status === "fulfilled"
      ? await getOrderDownloads(order.id)
      : [];

  res.json({ order, downloads });
});

export default router;
