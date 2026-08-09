import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { repairOrders, repairServices } from "../db/schema.js";
import {
  getCartSessionId,
  requireAuth,
  type AuthedRequest,
} from "../middleware/auth.js";

const router = Router();

router.get("/services", async (_req, res) => {
  const services = await db.query.repairServices.findMany({
    where: eq(repairServices.active, true),
    orderBy: [asc(repairServices.name)],
  });
  res.json({ services });
});

router.post("/book", async (req: AuthedRequest, res) => {
  const schema = z.object({
    serviceId: z.string().uuid().optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    name: z.string().min(1),
    deviceBrand: z.string().min(1),
    deviceModel: z.string().min(1),
    issue: z.string().min(5),
    dropOffNotes: z.string().optional(),
    paymentMethod: z.enum(["momo", "bank", "pickup"]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking data" });
  }

  let quotePesewas: number | null = null;
  if (parsed.data.serviceId) {
    const service = await db.query.repairServices.findFirst({
      where: eq(repairServices.id, parsed.data.serviceId),
    });
    if (!service) {
      return res.status(400).json({ error: "Unknown repair service" });
    }
    quotePesewas = service.pricePesewas;
  }

  const [row] = await db
    .insert(repairOrders)
    .values({
      userId: req.user?.id ?? null,
      sessionId: getCartSessionId(req),
      serviceId: parsed.data.serviceId,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      name: parsed.data.name,
      deviceBrand: parsed.data.deviceBrand,
      deviceModel: parsed.data.deviceModel,
      issue: parsed.data.issue,
      dropOffNotes: parsed.data.dropOffNotes,
      paymentMethod: parsed.data.paymentMethod,
      quotePesewas,
      status: "submitted",
      paymentStatus: "unpaid",
    })
    .returning();

  res.status(201).json({ repair: row });
});

router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db.query.repairOrders.findMany({
    where: eq(repairOrders.userId, req.user!.id),
    with: { service: true },
    orderBy: [desc(repairOrders.createdAt)],
  });
  res.json({ repairs: rows });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, req.params.id),
    with: { service: true },
  });
  if (!repair) {
    return res.status(404).json({ error: "Repair not found" });
  }

  const sessionId = getCartSessionId(req);
  const allowed =
    (req.user && repair.userId === req.user.id) ||
    (!!repair.sessionId && repair.sessionId === sessionId) ||
    (req.user && (req.user.role === "admin" || req.user.role === "manager"));

  if (!allowed) {
    return res.status(403).json({ error: "Not allowed" });
  }

  res.json({ repair });
});

export default router;
