import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import {
  categories,
  orderItems,
  orders,
  products,
  repairOrders,
  repairServices,
  users,
} from "../db/schema.js";
import { requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { fulfillOrder, markOrderPaid } from "../services/orders.js";
import { slugify } from "../lib/utils.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../storage/uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireRoles("admin", "manager"));

router.post("/uploads", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "file required" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({
    url,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

router.get("/analytics", async (_req, res) => {
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

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
        lte(products.stock, threshold),
        inArray(products.fulfillment, ["physical", "both"]),
        eq(products.active, true),
      ),
    )
    .orderBy(asc(products.stock), asc(products.name));

  res.json({
    paidRevenuePesewas: paidRevenue.total,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r.count])),
    repairsByStatus: Object.fromEntries(repairsByStatus.map((r) => [r.status, r.count])),
    topProducts,
    lowStock,
    lowStockThreshold: threshold,
  });
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
    with: { items: true },
    orderBy: [desc(orders.createdAt)],
  });
  res.json({ orders: rows });
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
    if (existing.status !== "paid" && existing.status !== "awaiting_pickup") {
      await markOrderPaid(existing.id);
    }
    await fulfillOrder(existing.id);
    const updated = await db.query.orders.findFirst({
      where: eq(orders.id, existing.id),
      with: { items: { with: { downloadTokens: true } } },
    });
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

router.post("/products", async (req, res) => {
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

router.patch("/products/:id", async (req, res) => {
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

router.patch("/repairs/:id", async (req, res) => {
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
    paymentMethod: z.enum(["momo", "bank", "pickup", "paystack"]).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update" });
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

router.post("/repair-services", async (req, res) => {
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

router.patch("/repair-services/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricePesewas: z.number().int().min(0).nullable().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });

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
