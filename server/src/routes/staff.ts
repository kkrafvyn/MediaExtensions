import { Router } from "express";
import multer from "multer";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import {
  auditLogs,
  categories,
  orderReturns,
  orderItems,
  paymentRecords,
  orders,
  products,
  repairOrders,
  repairServices,
  users,
} from "../db/schema.js";
import { requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { cancelOrder, fulfillOrder, markOrderPaid, reserveStockForOrder } from "../services/orders.js";
import { canPersistUploads, putObject, safeStorageFilename, uploadsDisabledReason } from "../lib/storage.js";
import { ensureStoreConfig, saveStoreConfig, type StoreConfig } from "../lib/storeConfig.js";
import { availableStock } from "../lib/inventory.js";
import {
  canTransitionFulfillmentStatus,
  canTransitionOrderStatus,
  canTransitionRepairStatus,
  canTransitionReturnStatus,
  type FulfillmentStatus,
} from "../lib/orderTransitions.js";
import { recordAuditLog } from "../lib/audit.js";
import { isEmailConfigured } from "../lib/mailer.js";
import { notifyOrderFulfillment, notifyRepairStatusUpdate, notifyReturnUpdate } from "../lib/notify.js";
import { newPasswordSchema } from "../lib/security.js";
import { initiateRefund } from "../lib/paystack.js";
import { formatGhs, slugify } from "../lib/utils.js";

const router = Router();

function parseListQuery(req: { query: unknown }) {
  const parsed = z
    .object({
      q: z.string().trim().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .safeParse(req.query);
  if (!parsed.success) {
    return { q: undefined as string | undefined, page: 1, limit: 25, offset: 0 };
  }
  const { q, page, limit } = parsed.data;
  return { q: q || undefined, page, limit, offset: (page - 1) * limit };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const digitalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.use(requireRoles("admin", "manager", "technician"));

router.use((req: AuthedRequest, res, next) => {
  if (req.user?.role !== "technician") return next();
  const path = req.path;
  const allowed =
    path === "/dashboard" ||
    path === "/repairs" ||
    path.startsWith("/repairs/");
  if (!allowed) {
    return res.status(403).json({ error: "Technicians can only access repairs" });
  }
  next();
});

router.post("/uploads", requireRoles("admin", "manager"), upload.single("file"), async (req, res) => {
  const uploadBlock = uploadsDisabledReason();
  if (uploadBlock) {
    return res.status(503).json({ error: uploadBlock });
  }
  if (!req.file) {
    return res.status(400).json({ error: "file required" });
  }
  try {
    const filename = safeStorageFilename(req.file.originalname);
    const stored = await putObject("uploads", filename, req.file.buffer, req.file.mimetype);
    res.status(201).json({
      url: stored.publicUrl ?? `/uploads/${stored.key}`,
      filename: stored.key,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error("[storage] upload error", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

router.post("/uploads/digital", requireRoles("admin", "manager"), digitalUpload.single("file"), async (req, res) => {
  const uploadBlock = uploadsDisabledReason();
  if (uploadBlock) {
    return res.status(503).json({ error: uploadBlock });
  }
  if (!req.file) {
    return res.status(400).json({ error: "file required" });
  }
  try {
    const filename = safeStorageFilename(req.file.originalname);
    const stored = await putObject("downloads", filename, req.file.buffer, req.file.mimetype);
    res.status(201).json({
      path: stored.key,
      filename: stored.key,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("[storage] digital upload error", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

router.get("/analytics", async (_req, res) => {
  const config = await ensureStoreConfig();
  const threshold = config.lowStockThreshold;

  const [paidRevenue] = await db
    .select({
      total: sql<number>`coalesce(sum(${orders.totalPesewas}), 0)::int`,
    })
    .from(orders)
    .where(inArray(orders.status, ["paid", "fulfilled"]));

  const ordersByStatus = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .groupBy(orders.status);

  const repairsByStatus = await db
    .select({
      status: repairOrders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(repairOrders)
    .groupBy(repairOrders.status);

  const topProducts = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      quantitySold: sql<number>`sum(${orderItems.quantity})::int`,
      revenuePesewas: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPricePesewas})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(inArray(orders.status, ["paid", "fulfilled"]))
    .groupBy(orderItems.productId, orderItems.name)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(10);

  const lowStock = await db
    .select()
    .from(products)
    .where(
      and(
        sql`(${products.stock} - ${products.reserved}) <= ${threshold}`,
        inArray(products.fulfillment, ["physical", "both"]),
        eq(products.active, true),
      ),
    )
    .orderBy(sql`(${products.stock} - ${products.reserved})`, asc(products.name));

  res.json({
    paidRevenuePesewas: paidRevenue.total,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r.count])),
    repairsByStatus: Object.fromEntries(repairsByStatus.map((r) => [r.status, r.count])),
    orderStatusCounts: Object.fromEntries(ordersByStatus.map((r) => [r.status, r.count])),
    repairStatusCounts: Object.fromEntries(repairsByStatus.map((r) => [r.status, r.count])),
    topProducts,
    lowStock,
    lowStockThreshold: threshold,
    smtpConfigured: isEmailConfigured(),
    lowStockCount: lowStock.length,
  });
});

router.get("/settings", requireRoles("admin", "manager"), async (_req, res) => {
  const config = await ensureStoreConfig();
  res.json({
    settings: config,
    paystackEnabled: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    storageDriver: process.env.STORAGE_DRIVER?.trim().toLowerCase() === "s3" ? "s3" : "local",
    uploadsEnabled: canPersistUploads(),
    uploadsWarning: uploadsDisabledReason(),
    note: "Paystack keys remain in environment variables for security.",
  });
});

router.put("/settings", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    shipping: z
      .object({
        accraPesewas: z.number().int().min(0),
        otherPesewas: z.number().int().min(0),
      })
      .optional(),
    momo: z
      .object({
        network: z.string().max(40),
        number: z.string().max(40),
        name: z.string().max(120),
      })
      .optional(),
    bank: z
      .object({
        bankName: z.string().max(120),
        accountNumber: z.string().max(40),
        accountName: z.string().max(120),
      })
      .optional(),
    pickup: z
      .object({
        name: z.string().min(1).max(120),
        address: z.string().max(240),
        landmark: z.string().max(240),
        hours: z.string().max(120),
        mapUrl: z.string().max(500),
      })
      .optional(),
    store: z
      .object({
        phone: z.string().max(40),
        whatsapp: z.string().max(40),
        email: z.string().email().or(z.literal("")),
      })
      .optional(),
    lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid store settings", details: parsed.error.flatten() });
  }

  const settings = await saveStoreConfig(parsed.data as Partial<StoreConfig>);
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "store_settings_updated",
    entityType: "store_settings",
    entityId: "store",
    details: { changedSections: Object.keys(parsed.data) },
  });
  res.json({ settings, ok: true });
});

router.get("/dashboard", async (_req, res) => {
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  const [repairCount] = await db.select({ count: sql<number>`count(*)::int` }).from(repairOrders);
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const recentOrders = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit: 5,
  });
  const recentRepairs = await db.query.repairOrders.findMany({
    orderBy: [desc(repairOrders.createdAt)],
    limit: 5,
    with: { service: true },
  });
  res.json({
    stats: {
      orders: orderCount.count,
      repairs: repairCount.count,
      products: productCount.count,
    },
    recentOrders,
    recentRepairs,
  });
});

router.get("/orders", async (req, res) => {
  const { q, page, limit, offset } = parseListQuery(req);
  const where = q
    ? or(ilike(orders.email, `%${q}%`), ilike(orders.name, `%${q}%`), ilike(orders.id, `%${q}%`))
    : undefined;
  const rows = await db.query.orders.findMany({
    where,
    with: { items: true, payments: { with: { recordedBy: true } } },
    orderBy: [desc(orders.createdAt)],
    limit,
    offset,
  });
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  res.json({ orders: rows, page, limit, total: countRow?.count ?? rows.length });
});

router.get("/audit-logs", requireRoles("admin"), async (_req, res) => {
  const rows = await db.query.auditLogs.findMany({
    with: { actor: true },
    orderBy: [desc(auditLogs.createdAt)],
    limit: 200,
  });
  res.json({ auditLogs: rows.map(({ actor, ...entry }) => ({ ...entry, actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : null })) });
});

router.get("/returns", async (_req, res) => {
  const rows = await db.query.orderReturns.findMany({
    with: { order: true, requestedBy: true, reviewedBy: true },
    orderBy: [desc(orderReturns.requestedAt)],
  });
  res.json({ returns: rows });
});

router.patch("/returns/:id", async (req: AuthedRequest, res) => {
  const schema = z.object({
    status: z.enum(["approved", "rejected", "refund_pending", "refunded"]),
    decisionNotes: z.string().trim().max(1000).optional(),
    refundPesewas: z.number().int().positive().optional(),
    refundReference: z.string().trim().min(1).max(160).optional(),
  }).refine((data) => data.status !== "refunded" || (data.refundPesewas !== undefined && Boolean(data.refundReference)))
    .refine((data) => data.status !== "refund_pending" || data.refundPesewas !== undefined);
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Refunds require a positive amount and transaction reference" });

  const request = await db.query.orderReturns.findFirst({
    where: eq(orderReturns.id, req.params.id),
    with: { order: true },
  });
  if (!request) return res.status(404).json({ error: "Return request not found" });
  if ((parsed.data.status === "refunded" || parsed.data.status === "refund_pending") && req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can issue or record refunds" });
  }
  if (!canTransitionReturnStatus(request.status, parsed.data.status)) {
    return res.status(409).json({ error: "Invalid return review transition" });
  }
  if ((parsed.data.status === "refunded" || parsed.data.status === "refund_pending") && parsed.data.refundPesewas! > request.order.totalPesewas) {
    return res.status(400).json({ error: "Refund cannot exceed the order total" });
  }

  if (parsed.data.status === "refund_pending") {
    if (request.order.paymentMethod !== "paystack" || !request.order.paystackReference) {
      return res.status(400).json({ error: "Automatic refunds require a verified Paystack transaction" });
    }
    if (request.status !== "approved" && request.status !== "refund_failed") {
      return res.status(409).json({ error: "Only approved or failed refunds can be queued" });
    }
    const [claimed] = await db.update(orderReturns).set({
      status: "refund_pending",
      decisionNotes: parsed.data.decisionNotes || request.decisionNotes,
      refundPesewas: parsed.data.refundPesewas,
      refundReference: null,
      reviewedByUserId: req.user!.id,
      updatedAt: new Date(),
    }).where(and(eq(orderReturns.id, request.id), eq(orderReturns.status, request.status))).returning();
    if (!claimed) return res.status(409).json({ error: "Return request changed; reload and try again" });

    let providerRefund;
    try {
      providerRefund = await initiateRefund({
        transactionReference: request.order.paystackReference,
        amountPesewas: parsed.data.refundPesewas!,
        customerNote: `Return request ${request.id.slice(0, 8)}`,
        merchantNote: parsed.data.decisionNotes || request.reason,
      });
    } catch (err) {
      await db.update(orderReturns).set({
        decisionNotes: "Refund request response was uncertain. Verify status in Paystack before retrying.",
        updatedAt: new Date(),
      }).where(eq(orderReturns.id, claimed.id));
      await recordAuditLog({
        actorUserId: req.user!.id,
        action: "paystack_refund_response_uncertain",
        entityType: "order_return",
        entityId: claimed.id,
        details: { orderId: request.orderId, refundPesewas: claimed.refundPesewas },
      });
      console.error("[paystack:refund] response uncertain", err);
      return res.status(502).json({ error: "Refund response was not confirmed. Check Paystack before retrying." });
    }

    const providerReference = providerRefund.refund_reference || (providerRefund.id ? String(providerRefund.id) : null);
    const [updated] = await db.update(orderReturns).set({
      refundReference: providerReference,
      updatedAt: new Date(),
    }).where(eq(orderReturns.id, claimed.id)).returning();
    await recordAuditLog({
      actorUserId: req.user!.id,
      action: "paystack_refund_queued",
      entityType: "order_return",
      entityId: claimed.id,
      details: { orderId: request.orderId, refundPesewas: claimed.refundPesewas, providerReference },
    });
    void notifyReturnUpdate({
      id: claimed.id,
      orderId: request.orderId,
      email: request.order.email,
      name: request.order.name,
      phone: request.order.phone,
      reason: request.reason,
      details: request.details,
      status: "refund_pending",
      decisionNotes: claimed.decisionNotes,
      refundPesewas: claimed.refundPesewas,
      refundReference: providerReference,
    }).catch((err) => console.error("[notify:return] refund queued", err));
    res.json({ returnRequest: updated });
    return;
  }

  if (parsed.data.status === "refunded" && request.order.paymentMethod === "paystack") {
    return res.status(409).json({ error: "Paystack refunds are marked complete by the provider webhook" });
  }

  const [updated] = await db.update(orderReturns).set({
    status: parsed.data.status,
    decisionNotes: parsed.data.decisionNotes || null,
    refundPesewas: parsed.data.status === "refunded" ? parsed.data.refundPesewas : request.refundPesewas,
    refundReference: parsed.data.status === "refunded" ? parsed.data.refundReference : request.refundReference,
    reviewedByUserId: req.user!.id,
    updatedAt: new Date(),
  }).where(and(eq(orderReturns.id, request.id), eq(orderReturns.status, request.status))).returning();
  if (!updated) return res.status(409).json({ error: "Return request changed; reload and try again" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: `return_${updated.status}`,
    entityType: "order_return",
    entityId: updated.id,
    details: { orderId: request.orderId, refundPesewas: updated.refundPesewas, refundReference: updated.refundReference },
  });
  void notifyReturnUpdate({
    id: updated.id,
    orderId: request.orderId,
    email: request.order.email,
    name: request.order.name,
    phone: request.order.phone,
    reason: request.reason,
    details: request.details,
    status: updated.status,
    decisionNotes: updated.decisionNotes,
    refundPesewas: updated.refundPesewas,
    refundReference: updated.refundReference,
  }).catch((err) => console.error("[notify:return] update failed", err));
  res.json({ returnRequest: updated });
});

router.post("/orders/:id/payments", async (req: AuthedRequest, res) => {
  const schema = z.object({
    method: z.enum(["cash", "momo", "bank", "other"]),
    amountPesewas: z.number().int().positive(),
    reference: z.string().max(160).optional(),
    notes: z.string().max(500).optional(),
    receivedAt: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payment record" });

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
    with: { payments: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "pending_payment" && order.status !== "awaiting_pickup") {
    return res.status(409).json({ error: "Payments can only be recorded for unpaid orders" });
  }

  const received = order.payments.reduce((total, payment) => total + payment.amountPesewas, 0);
  const remaining = order.totalPesewas - received;
  if (parsed.data.amountPesewas > remaining) {
    return res.status(400).json({ error: `Payment exceeds outstanding balance of ${formatGhs(remaining)}` });
  }

  const [payment] = await db.insert(paymentRecords).values({
    orderId: order.id,
    method: parsed.data.method,
    amountPesewas: parsed.data.amountPesewas,
    reference: parsed.data.reference?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
    recordedByUserId: req.user!.id,
  }).returning();

  const paidTotal = received + payment.amountPesewas;
  const updated = paidTotal === order.totalPesewas ? await markOrderPaid(order.id) : order;
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "offline_payment_recorded",
    entityType: "order_payment",
    entityId: payment.id,
    details: { orderId: order.id, method: payment.method, amountPesewas: payment.amountPesewas, reference: payment.reference },
  });
  res.status(201).json({ payment, paidTotalPesewas: paidTotal, order: updated });
});

router.patch("/orders/:id", async (req: AuthedRequest, res) => {
  const schema = z.object({
    status: z.enum(["pending_payment", "awaiting_pickup", "paid", "fulfilled", "cancelled"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const existing = await db.query.orders.findFirst({ where: eq(orders.id, req.params.id) });
  if (!existing) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!canTransitionOrderStatus(existing.status, parsed.data.status)) {
    return res.status(409).json({ error: "Invalid order status transition. Record payment before fulfillment." });
  }

  if (parsed.data.status === "fulfilled") {
    if (existing.fulfillmentMethod !== "digital") {
      return res.status(409).json({ error: "Update physical fulfillment through its delivery or pickup steps" });
    }
    await fulfillOrder(existing.id);
    const updated = await db.query.orders.findFirst({
      where: eq(orders.id, existing.id),
      with: { items: { with: { downloadTokens: true } } },
    });
    await recordAuditLog({ actorUserId: req.user!.id, action: "digital_order_fulfilled", entityType: "order", entityId: existing.id });
    return res.json({ order: updated });
  }

  if (parsed.data.status === "cancelled") {
    const updated = await cancelOrder(existing.id);
    await recordAuditLog({ actorUserId: req.user!.id, action: "order_cancelled", entityType: "order", entityId: existing.id });
    return res.json({ order: updated });
  }

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, existing.id))
    .returning();

  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "order_status_updated",
    entityType: "order",
    entityId: existing.id,
    details: { from: existing.status, to: parsed.data.status },
  });

  res.json({ order: updated });
});

router.patch("/orders/:id/notes", async (req: AuthedRequest, res) => {
  const schema = z.object({ staffNotes: z.string().max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid notes" });
  const [updated] = await db
    .update(orders)
    .set({ staffNotes: parsed.data.staffNotes.trim() || null, updatedAt: new Date() })
    .where(eq(orders.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Order not found" });
  res.json({ order: updated });
});

router.patch("/orders/:id/fulfillment", async (req: AuthedRequest, res) => {
  const schema = z.object({
    fulfillmentStatus: z.enum([
      "not_required",
      "unfulfilled",
      "preparing",
      "ready_to_ship",
      "shipped",
      "delivered",
      "ready_for_pickup",
      "collected",
    ]).optional(),
    trackingCarrier: z.string().trim().max(120).nullable().optional(),
    trackingNumber: z.string().trim().max(160).nullable().optional(),
    trackingUrl: z.string().trim().max(500).url().refine((value) => /^https?:\/\//i.test(value)).or(z.literal("")).nullable().optional(),
  }).refine((data) => Object.values(data).some((value) => value !== undefined));
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid fulfillment update" });

  const order = await db.query.orders.findFirst({ where: eq(orders.id, req.params.id) });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "paid" && order.status !== "fulfilled") {
    return res.status(409).json({ error: "Payment must be confirmed before fulfillment" });
  }
  if (order.fulfillmentMethod === "digital") {
    return res.status(409).json({ error: "Digital orders do not require physical fulfillment" });
  }
  if (order.fulfillmentMethod === "pickup" && (parsed.data.trackingCarrier || parsed.data.trackingNumber || parsed.data.trackingUrl)) {
    return res.status(400).json({ error: "Shipment tracking is only available for delivery orders" });
  }
  if (parsed.data.fulfillmentStatus && parsed.data.fulfillmentStatus !== order.fulfillmentStatus && !canTransitionFulfillmentStatus(
    order.fulfillmentMethod,
    order.fulfillmentStatus,
    parsed.data.fulfillmentStatus as FulfillmentStatus,
  )) {
    return res.status(409).json({ error: "Invalid fulfillment status transition" });
  }

  const nextStatus = parsed.data.fulfillmentStatus ?? order.fulfillmentStatus;
  const trackingNumber = parsed.data.trackingNumber === undefined ? order.trackingNumber : parsed.data.trackingNumber || null;
  const trackingUrl = parsed.data.trackingUrl === undefined ? order.trackingUrl : parsed.data.trackingUrl || null;
  if (nextStatus === "shipped" && !trackingNumber && !trackingUrl) {
    return res.status(400).json({ error: "Add a tracking number or tracking link before marking this shipped" });
  }

  const [updated] = await db.update(orders).set({
    fulfillmentStatus: nextStatus,
    trackingCarrier: parsed.data.trackingCarrier === undefined ? order.trackingCarrier : parsed.data.trackingCarrier || null,
    trackingNumber,
    trackingUrl,
    status: nextStatus === "delivered" || nextStatus === "collected" ? "fulfilled" : order.status,
    fulfilledAt: nextStatus === "delivered" || nextStatus === "collected" ? new Date() : order.fulfilledAt,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id)).returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "order_fulfillment_updated",
    entityType: "order",
    entityId: order.id,
    details: { from: order.fulfillmentStatus, to: nextStatus, carrier: parsed.data.trackingCarrier, trackingNumber },
  });
  if (nextStatus !== order.fulfillmentStatus || trackingNumber !== order.trackingNumber || trackingUrl !== order.trackingUrl) {
    void notifyOrderFulfillment({
      id: updated.id,
      email: order.email,
      name: order.name,
      phone: order.phone,
      fulfillmentMethod: order.fulfillmentMethod,
      fulfillmentStatus: updated.fulfillmentStatus,
      trackingCarrier: updated.trackingCarrier,
      trackingNumber: updated.trackingNumber,
      trackingUrl: updated.trackingUrl,
    }).catch((err) => console.error("[notify:fulfillment] update failed", err));
  }
  res.json({ order: updated });
});

router.get("/products", async (req, res) => {
  const { q, page, limit, offset } = parseListQuery(req);
  const where = q
    ? or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`))
    : undefined;
  const rows = await db.query.products.findMany({
    where,
    with: { category: true },
    orderBy: [asc(products.name)],
    limit,
    offset,
  });
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(where);
  res.json({ products: rows, page, limit, total: countRow?.count ?? rows.length });
});

/**
 * Counter sale for stock handed over in the shop. Payment is recorded in the
 * ledger before the order is marked paid, which also finalizes inventory.
 */
router.post("/pos/orders", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1),
    customerName: z.string().max(120).optional(),
    customerPhone: z.string().max(40).optional(),
    customerEmail: z.string().email().optional(),
    paymentMethod: z.enum(["cash", "momo", "bank", "paystack"]),
    paymentReference: z.string().max(160).optional(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter at least one valid item" });

  const quantities = new Map<string, number>();
  for (const line of parsed.data.items) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }
  const selected = await db.query.products.findMany({
    where: inArray(products.id, [...quantities.keys()]),
  });
  if (selected.length !== quantities.size || selected.some((product) => !product.active)) {
    return res.status(409).json({ error: "One or more selected products are unavailable" });
  }
  if (selected.some((product) => product.fulfillment !== "digital" && availableStock(product) < (quantities.get(product.id) ?? 0))) {
    return res.status(409).json({ error: "One or more items no longer have enough stock" });
  }

  const totalPesewas = selected.reduce(
    (sum, product) => sum + product.pricePesewas * (quantities.get(product.id) ?? 0),
    0,
  );
  const customerName = parsed.data.customerName?.trim() || "Walk-in customer";
  const customerEmail = parsed.data.customerEmail?.trim().toLowerCase() || "walk-in@mediaextensions.local";
  const [order] = await db.insert(orders).values({
    email: customerEmail,
    name: customerName,
    phone: parsed.data.customerPhone?.trim() || null,
    status: "pending_payment",
    fulfillmentMethod: selected.some((product) => product.fulfillment !== "digital") ? "pickup" : "digital",
    fulfillmentStatus: selected.some((product) => product.fulfillment !== "digital") ? "collected" : "not_required",
    paymentMethod: parsed.data.paymentMethod,
    subtotalPesewas: totalPesewas,
    totalPesewas,
    currency: "GHS",
    paymentNote: parsed.data.notes?.trim() || null,
  }).returning();

  await db.insert(orderItems).values(selected.map((product) => ({
    orderId: order.id,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    quantity: quantities.get(product.id) ?? 0,
    unitPricePesewas: product.pricePesewas,
    fulfillment: product.fulfillment,
    digitalAssetPath: product.digitalAssetPath,
  })));

  try {
    await reserveStockForOrder(order.id);
    await db.insert(paymentRecords).values({
      orderId: order.id,
      method: parsed.data.paymentMethod,
      amountPesewas: totalPesewas,
      reference: parsed.data.paymentReference?.trim() || null,
      notes: parsed.data.notes?.trim() || "In-store POS sale",
      recordedByUserId: req.user!.id,
    });
    const paid = await markOrderPaid(order.id);
    await recordAuditLog({
      actorUserId: req.user!.id,
      action: "pos_sale_recorded",
      entityType: "order",
      entityId: order.id,
      details: { totalPesewas, paymentMethod: parsed.data.paymentMethod, items: parsed.data.items },
    });
    return res.status(201).json({ order: paid });
  } catch (err) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
    return res.status(409).json({ error: err instanceof Error ? err.message : "Could not complete counter sale" });
  }
});

/** Create a walk-in GSM ticket without making the customer use the website. */
router.post("/pos/repairs", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1).max(120),
    phone: z.string().min(8).max(40),
    email: z.string().email().optional(),
    deviceBrand: z.string().min(1).max(100),
    deviceModel: z.string().min(1).max(120),
    issue: z.string().min(4).max(2000),
    serviceId: z.string().uuid().nullable().optional(),
    quotePesewas: z.number().int().min(0).nullable().optional(),
    paymentMethod: z.enum(["cash", "momo", "bank", "paystack"]),
    paymentStatus: z.enum(["unpaid", "paid"]),
    staffNotes: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter the customer's device and repair details" });

  let service = null;
  if (parsed.data.serviceId) {
    service = await db.query.repairServices.findFirst({ where: eq(repairServices.id, parsed.data.serviceId) });
    if (!service || !service.active) return res.status(400).json({ error: "Selected repair service is unavailable" });
  }
  const quotePesewas = parsed.data.quotePesewas ?? service?.pricePesewas ?? null;
  const [repair] = await db.insert(repairOrders).values({
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    email: parsed.data.email?.trim().toLowerCase() || "walk-in@mediaextensions.local",
    deviceBrand: parsed.data.deviceBrand.trim(),
    deviceModel: parsed.data.deviceModel.trim(),
    issue: parsed.data.issue.trim(),
    serviceId: parsed.data.serviceId ?? null,
    quotePesewas,
    paymentMethod: parsed.data.paymentMethod,
    paymentStatus: parsed.data.paymentStatus,
    status: quotePesewas != null ? "quoted" : "submitted",
    staffNotes: parsed.data.staffNotes?.trim() || "Walk-in POS intake",
  }).returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "pos_repair_created",
    entityType: "repair_order",
    entityId: repair.id,
    details: { quotePesewas, paymentStatus: repair.paymentStatus, serviceId: repair.serviceId },
  });
  res.status(201).json({ repair });
});

router.post("/products", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    pricePesewas: z.number().int().positive(),
    categoryId: z.string().uuid().nullable().optional(),
    fulfillment: z.enum(["digital", "physical", "both"]),
    stock: z.number().int().min(0).default(0),
    digitalAssetPath: z.string().nullable().optional(),
    images: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product" });
  }

  let slug = slugify(parsed.data.name);
  const clash = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const [row] = await db
    .insert(products)
    .values({ ...parsed.data, slug })
    .returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "product_created",
    entityType: "product",
    entityId: row.id,
    details: { name: row.name, pricePesewas: row.pricePesewas },
  });
  res.status(201).json({ product: row });
});

router.patch("/products/:id", async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricePesewas: z.number().int().positive().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    fulfillment: z.enum(["digital", "physical", "both"]).optional(),
    stock: z.number().int().min(0).optional(),
    digitalAssetPath: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product update" });
  }
  if (parsed.data.pricePesewas != null && req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can change prices" });
  }

  const existing = await db.query.products.findFirst({ where: eq(products.id, req.params.id) });
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (parsed.data.stock != null && parsed.data.stock < (existing.reserved ?? 0)) {
    return res.status(400).json({
      error: `Stock cannot be below reserved quantity (${existing.reserved ?? 0})`,
    });
  }

  const [row] = await db
    .update(products)
    .set(parsed.data)
    .where(eq(products.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "product_updated",
    entityType: "product",
    entityId: row.id,
    details: { changes: parsed.data },
  });
  res.json({ product: row });
});

router.delete("/products/:id", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const [row] = await db
    .update(products)
    .set({ active: false })
    .where(eq(products.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "product_archived",
    entityType: "product",
    entityId: row.id,
    details: { name: row.name },
  });
  res.json({ product: row });
});

router.get("/repairs", async (req, res) => {
  const { q, page, limit, offset } = parseListQuery(req);
  const where = q
    ? or(
        ilike(repairOrders.email, `%${q}%`),
        ilike(repairOrders.name, `%${q}%`),
        ilike(repairOrders.id, `%${q}%`),
      )
    : undefined;
  const rows = await db.query.repairOrders.findMany({
    where,
    with: { service: true, payments: true },
    orderBy: [desc(repairOrders.createdAt)],
    limit,
    offset,
  });
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairOrders)
    .where(where);
  res.json({ repairs: rows, page, limit, total: countRow?.count ?? rows.length });
});

router.patch("/repairs/:id", async (req: AuthedRequest, res) => {
  const schema = z.object({
    status: z
      .enum([
        "submitted",
        "diagnosing",
        "quoted",
        "in_progress",
        "ready",
        "completed",
        "cancelled",
      ])
      .optional(),
    quotePesewas: z.number().int().min(0).nullable().optional(),
    staffNotes: z.string().optional(),
    paymentStatus: z.enum(["unpaid", "paid"]).optional(),
    paymentMethod: z.enum(["cash", "momo", "bank", "pickup", "paystack"]).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update" });
  }
  if (parsed.data.quotePesewas !== undefined && req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can set repair quotes" });
  }

  const existing = await db.query.repairOrders.findFirst({ where: eq(repairOrders.id, req.params.id) });
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (parsed.data.status && !canTransitionRepairStatus(existing.status, parsed.data.status)) {
    return res.status(409).json({ error: "Invalid repair status transition" });
  }

  const [row] = await db
    .update(repairOrders)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(repairOrders.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "repair_updated",
    entityType: "repair_order",
    entityId: row.id,
    details: { status: parsed.data.status, quotePesewas: parsed.data.quotePesewas, paymentStatus: parsed.data.paymentStatus, paymentMethod: parsed.data.paymentMethod },
  });
  if (parsed.data.status && parsed.data.status !== existing.status) {
    void notifyRepairStatusUpdate(row, existing.status).catch((err) =>
      console.error("[notify:repair-status]", err),
    );
  }
  res.json({ repair: row });
});

router.post("/repairs/:id/payments", async (req: AuthedRequest, res) => {
  const schema = z.object({
    method: z.enum(["cash", "momo", "bank", "other"]),
    amountPesewas: z.number().int().positive(),
    reference: z.string().max(160).optional(),
    notes: z.string().max(500).optional(),
    receivedAt: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payment record" });

  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, req.params.id),
    with: { payments: true },
  });
  if (!repair) return res.status(404).json({ error: "Repair not found" });

  const duePesewas = repair.quotePesewas;
  if (duePesewas == null || duePesewas <= 0) {
    return res.status(409).json({ error: "Set a repair quote before recording payments" });
  }

  const received = repair.payments.reduce((total, payment) => total + payment.amountPesewas, 0);
  const remaining = duePesewas - received;
  if (parsed.data.amountPesewas > remaining) {
    return res.status(400).json({ error: `Payment exceeds outstanding balance of ${formatGhs(remaining)}` });
  }

  const [payment] = await db
    .insert(paymentRecords)
    .values({
      repairOrderId: repair.id,
      method: parsed.data.method,
      amountPesewas: parsed.data.amountPesewas,
      reference: parsed.data.reference?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
      recordedByUserId: req.user!.id,
    })
    .returning();

  const paidTotal = received + payment.amountPesewas;
  if (paidTotal >= duePesewas) {
    await db
      .update(repairOrders)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(repairOrders.id, repair.id));
  }

  const updated = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, repair.id),
    with: { service: true, payments: true },
  });

  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "repair_payment_recorded",
    entityType: "repair_payment",
    entityId: payment.id,
    details: { repairId: repair.id, method: payment.method, amountPesewas: payment.amountPesewas },
  });

  res.status(201).json({ payment, paidTotalPesewas: paidTotal, repair: updated ?? repair });
});

router.get("/export/orders", requireRoles("admin", "manager"), async (req, res) => {
  const { q, limit } = parseListQuery(req);
  const where = q
    ? or(
        ilike(orders.email, `%${q}%`),
        ilike(orders.name, `%${q}%`),
        ilike(orders.id, `%${q}%`),
      )
    : undefined;
  const rows = await db.query.orders.findMany({
    where,
    orderBy: [desc(orders.createdAt)],
    limit: Math.min(limit, 5000),
  });
  const header = "id,email,name,status,total_pesewas,payment_method,created_at\n";
  const body = rows
    .map((o) =>
      [o.id, o.email, o.name, o.status, o.totalPesewas, o.paymentMethod ?? "", o.createdAt.toISOString()]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
  res.send(header + body);
});

router.get("/export/repairs", requireRoles("admin", "manager", "technician"), async (req, res) => {
  const { q, limit } = parseListQuery(req);
  const where = q
    ? or(
        ilike(repairOrders.email, `%${q}%`),
        ilike(repairOrders.name, `%${q}%`),
        ilike(repairOrders.id, `%${q}%`),
      )
    : undefined;
  const rows = await db.query.repairOrders.findMany({
    where,
    orderBy: [desc(repairOrders.createdAt)],
    limit: Math.min(limit, 5000),
  });
  const header = "id,email,name,device,status,quote_pesewas,payment_status,imei,created_at\n";
  const body = rows
    .map((r) =>
      [
        r.id,
        r.email,
        r.name,
        `${r.deviceBrand} ${r.deviceModel}`,
        r.status,
        r.quotePesewas ?? "",
        r.paymentStatus,
        r.imei ?? "",
        r.createdAt.toISOString(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="repairs.csv"');
  res.send(header + body);
});

router.get("/export/payments", requireRoles("admin", "manager"), async (req, res) => {
  const { limit } = parseListQuery(req);
  const rows = await db.query.paymentRecords.findMany({
    orderBy: [desc(paymentRecords.receivedAt)],
    limit: Math.min(limit, 5000),
    with: { order: true, repairOrder: true },
  });
  const header = "id,order_id,repair_order_id,method,amount_pesewas,reference,received_at\n";
  const body = rows
    .map((p) =>
      [
        p.id,
        p.orderId ?? "",
        p.repairOrderId ?? "",
        p.method,
        p.amountPesewas,
        p.reference ?? "",
        p.receivedAt.toISOString(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="payments.csv"');
  res.send(header + body);
});

router.get("/repair-services", async (_req, res) => {
  const rows = await db.query.repairServices.findMany({ orderBy: [asc(repairServices.name)] });
  res.json({ services: rows });
});

router.post("/repair-services", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    pricePesewas: z.number().int().positive().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid service" });
  let slug = slugify(parsed.data.name);
  const clash = await db.query.repairServices.findFirst({ where: eq(repairServices.slug, slug) });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const [row] = await db
    .insert(repairServices)
    .values({ ...parsed.data, slug, pricePesewas: parsed.data.pricePesewas ?? null })
    .returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "repair_service_created",
    entityType: "repair_service",
    entityId: row.id,
    details: { name: row.name, pricePesewas: row.pricePesewas },
  });
  res.status(201).json({ service: row });
});

router.patch("/repair-services/:id", async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricePesewas: z.number().int().min(0).nullable().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
  if (parsed.data.pricePesewas !== undefined && req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can change service prices" });
  }

  const [row] = await db
    .update(repairServices)
    .set(parsed.data)
    .where(eq(repairServices.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "repair_service_updated",
    entityType: "repair_service",
    entityId: row.id,
    details: { changes: parsed.data },
  });
  res.json({ service: row });
});

router.delete("/repair-services/:id", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const [row] = await db
    .update(repairServices)
    .set({ active: false })
    .where(eq(repairServices.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "repair_service_archived",
    entityType: "repair_service",
    entityId: row.id,
    details: { name: row.name },
  });
  res.json({ service: row });
});

// Admin-only category + user management
router.get("/categories", async (_req, res) => {
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  });
  res.json({ categories: rows });
});

router.post("/categories", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().int().default(0),
    active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category" });

  let slug = slugify(parsed.data.name);
  const clash = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const [row] = await db
    .insert(categories)
    .values({ ...parsed.data, slug })
    .returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "category_created",
    entityType: "category",
    entityId: row.id,
    details: { name: row.name, slug: row.slug },
  });
  res.status(201).json({ category: row });
});

router.patch("/categories/:id", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category" });

  const [row] = await db
    .update(categories)
    .set(parsed.data)
    .where(eq(categories.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "category_updated",
    entityType: "category",
    entityId: row.id,
    details: { changes: parsed.data },
  });
  res.json({ category: row });
});

router.delete("/categories/:id", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, req.params.id) });
  if (!category) return res.status(404).json({ error: "Not found" });
  await db.delete(categories).where(eq(categories.id, req.params.id));
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "category_deleted",
    entityType: "category",
    entityId: category.id,
    details: { name: category.name, slug: category.slug },
  });
  res.json({ ok: true });
});

router.get("/users", requireRoles("admin"), async (_req, res) => {
  const rows = await db.query.users.findMany({ orderBy: [asc(users.email)] });
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
});

router.patch("/users/:id", requireRoles("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    role: z.enum(["admin", "manager", "technician", "consumer"]).optional(),
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    password: newPasswordSchema.optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });

  const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
  if (!target) return res.status(404).json({ error: "Not found" });

  if (parsed.data.role && target.role === "admin" && parsed.data.role !== "admin") {
    const admins = await db.query.users.findMany({ where: eq(users.role, "admin") });
    if (admins.length <= 1) {
      return res.status(400).json({ error: "Cannot demote the last admin" });
    }
  }

  const update: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;
  if (parsed.data.password) update.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [row] = await db.update(users).set(update).where(eq(users.id, target.id)).returning();
  await recordAuditLog({
    actorUserId: req.user!.id,
    action: "user_updated",
    entityType: "user",
    entityId: row.id,
    details: {
      role: parsed.data.role,
      name: parsed.data.name,
      phoneChanged: parsed.data.phone !== undefined,
      passwordChanged: Boolean(parsed.data.password),
    },
  });
  res.json({
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      role: row.role,
    },
  });
});

export default router;
