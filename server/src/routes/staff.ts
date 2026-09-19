import { Router } from "express";
import multer from "multer";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import {
  categories,
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
import { putObject, safeStorageFilename } from "../lib/storage.js";
import { ensureStoreConfig, saveStoreConfig, type StoreConfig } from "../lib/storeConfig.js";
import { availableStock } from "../lib/inventory.js";
import { slugify } from "../lib/utils.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const digitalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.use(requireRoles("admin", "manager"));

router.post("/uploads", upload.single("file"), async (req, res) => {
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

router.post("/uploads/digital", digitalUpload.single("file"), async (req, res) => {
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
  });
});

router.get("/settings", requireRoles("admin", "manager"), async (_req, res) => {
  const config = await ensureStoreConfig();
  res.json({
    settings: config,
    paystackEnabled: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    note: "Paystack keys remain in environment variables for security.",
  });
});

router.put("/settings", requireRoles("admin"), async (req, res) => {
  const schema = z.object({
    shipping: z
      .object({
        accraPesewas: z.number().int().min(0),
        otherPesewas: z.number().int().min(0),
      })
      .optional(),
    momo: z
      .object({
        network: z.string().min(1).max(40),
        number: z.string().min(1).max(40),
        name: z.string().min(1).max(120),
      })
      .optional(),
    bank: z
      .object({
        bankName: z.string().min(1).max(120),
        accountNumber: z.string().min(1).max(40),
        accountName: z.string().min(1).max(120),
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

router.get("/orders", async (_req, res) => {
  const rows = await db.query.orders.findMany({
    with: { items: true, payments: { with: { recordedBy: true } } },
    orderBy: [desc(orders.createdAt)],
  });
  res.json({ orders: rows });
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
  if (order.status === "cancelled") return res.status(409).json({ error: "Cancelled orders cannot receive payments" });

  const received = order.payments.reduce((total, payment) => total + payment.amountPesewas, 0);
  const remaining = order.totalPesewas - received;
  if (parsed.data.amountPesewas > remaining) {
    return res.status(400).json({ error: `Payment exceeds outstanding balance of ${remaining} pesewas` });
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
  res.status(201).json({ payment, paidTotalPesewas: paidTotal, order: updated });
});

router.patch("/orders/:id", async (req, res) => {
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

  if (parsed.data.status === "paid") {
    const updated = await markOrderPaid(existing.id);
    return res.json({ order: updated });
  }

  if (parsed.data.status === "fulfilled") {
    if (existing.status !== "paid") {
      await markOrderPaid(existing.id);
    }
    await fulfillOrder(existing.id);
    const updated = await db.query.orders.findFirst({
      where: eq(orders.id, existing.id),
      with: { items: { with: { downloadTokens: true } } },
    });
    return res.json({ order: updated });
  }

  if (parsed.data.status === "cancelled") {
    const updated = await cancelOrder(existing.id);
    return res.json({ order: updated });
  }

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, existing.id))
    .returning();

  res.json({ order: updated });
});

router.get("/products", async (_req, res) => {
  const rows = await db.query.products.findMany({
    with: { category: true },
    orderBy: [asc(products.name)],
  });
  res.json({ products: rows });
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
    return res.status(201).json({ order: paid });
  } catch (err) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
    return res.status(409).json({ error: err instanceof Error ? err.message : "Could not complete counter sale" });
  }
});

/** Create a walk-in GSM ticket without making the customer use the website. */
router.post("/pos/repairs", requireRoles("admin"), async (_req: AuthedRequest, res) => {
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
  const parsed = schema.safeParse(_req.body);
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
  res.status(201).json({ repair });
});

router.post("/products", requireRoles("admin"), async (req, res) => {
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

  const [row] = await db
    .update(products)
    .set(parsed.data)
    .where(eq(products.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ product: row });
});

router.get("/repairs", async (_req, res) => {
  const rows = await db.query.repairOrders.findMany({
    with: { service: true },
    orderBy: [desc(repairOrders.createdAt)],
  });
  res.json({ repairs: rows });
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

  const [row] = await db
    .update(repairOrders)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(repairOrders.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ repair: row });
});

router.get("/repair-services", async (_req, res) => {
  const rows = await db.query.repairServices.findMany({ orderBy: [asc(repairServices.name)] });
  res.json({ services: rows });
});

router.post("/repair-services", requireRoles("admin"), async (req, res) => {
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
  res.json({ service: row });
});

// Admin-only category + user management
router.get("/categories", async (_req, res) => {
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  });
  res.json({ categories: rows });
});

router.post("/categories", requireRoles("admin"), async (req, res) => {
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
  res.status(201).json({ category: row });
});

router.patch("/categories/:id", requireRoles("admin"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category" });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name) data.slug = slugify(parsed.data.name);

  const [row] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ category: row });
});

router.delete("/categories/:id", requireRoles("admin"), async (req, res) => {
  await db.delete(categories).where(eq(categories.id, req.params.id));
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
    role: z.enum(["admin", "manager", "consumer"]).optional(),
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    password: z.string().min(6).optional(),
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
