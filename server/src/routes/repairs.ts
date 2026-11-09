import { Router } from "express";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import { repairOrders, repairServices } from "../db/schema.js";
import { notifyRepairBooked } from "../lib/notify.js";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "../lib/paystack.js";
import { createTrackToken } from "../lib/trackToken.js";
import {
  getCartSessionId,
  requireAuth,
  type AuthedRequest,
} from "../middleware/auth.js";
import { grantRepairAccess, hasGrantedRepairAccess } from "../services/guestLinking.js";
import { isStaffViewer } from "../lib/orderAccess.js";
import { markRepairPaidByPaystack } from "../services/repairs.js";

const router = Router();

function canAccessRepair(
  req: AuthedRequest,
  repair: { id: string; userId: string | null; sessionId: string | null },
) {
  const sessionId = getCartSessionId(req);
  return (
    (req.user && repair.userId === req.user.id) ||
    (!!repair.sessionId && repair.sessionId === sessionId) ||
    isStaffViewer(req.user) ||
    hasGrantedRepairAccess(req, repair.id)
  );
}

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
    /** Optional — synthetic email derived from phone when omitted */
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(8),
    name: z.string().min(1),
    /** Simple intake: single "phone name" field */
    deviceName: z.string().min(1).optional(),
    deviceBrand: z.string().min(1).optional(),
    deviceModel: z.string().min(1).optional(),
    issue: z.string().min(5),
    dropOffNotes: z.string().optional(),
    paymentMethod: z.enum(["momo", "bank", "pickup"]).optional(),
    imei: z
      .string()
      .regex(/^\d{15}$/)
      .optional()
      .or(z.literal("")),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking data" });
  }

  const deviceName = parsed.data.deviceName?.trim();
  const deviceBrand = (parsed.data.deviceBrand?.trim() || deviceName || "Phone").slice(0, 120);
  const deviceModel = (parsed.data.deviceModel?.trim() || deviceName || "Unknown").slice(0, 120);
  if (!deviceName && (!parsed.data.deviceBrand || !parsed.data.deviceModel)) {
    return res.status(400).json({ error: "Enter the phone or device name" });
  }

  const phoneDigits = parsed.data.phone.replace(/\D/g, "");
  const email =
    parsed.data.email?.trim().toLowerCase() ||
    `repair-${phoneDigits || nanoid(8)}@customers.mediaextensions.org`;

  let quotePesewas: number | null = null;
  let serviceName: string | null = null;
  if (parsed.data.serviceId) {
    const service = await db.query.repairServices.findFirst({
      where: eq(repairServices.id, parsed.data.serviceId),
    });
    if (!service) {
      return res.status(400).json({ error: "Unknown repair service" });
    }
    quotePesewas = service.pricePesewas;
    serviceName = service.name;
  }

  const [row] = await db
    .insert(repairOrders)
    .values({
      userId: req.user?.id ?? null,
      sessionId: getCartSessionId(req),
      serviceId: parsed.data.serviceId,
      email,
      phone: parsed.data.phone,
      name: parsed.data.name,
      deviceBrand,
      deviceModel,
      issue: parsed.data.issue,
      dropOffNotes: parsed.data.dropOffNotes,
      imei: parsed.data.imei?.trim() || null,
      paymentMethod: parsed.data.paymentMethod,
      quotePesewas,
      status: "submitted",
      paymentStatus: "unpaid",
    })
    .returning();

  grantRepairAccess(req, row.id);

  void notifyRepairBooked({
    ...row,
    serviceName,
  }).catch((err) => console.error("[notify:repair]", err));

  res.status(201).json({ repair: row });
});

router.post("/track", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    repairId: z.string().uuid(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and repair ID required" });
  }

  const email = parsed.data.email.toLowerCase();
  const repairId = parsed.data.repairId.trim();

  const repair = await db.query.repairOrders.findFirst({
    where: and(eq(repairOrders.id, repairId), ilike(repairOrders.email, email)),
    with: { service: true },
  });

  if (!repair) {
    return res.status(404).json({ error: "Repair not found for that email and ticket ID" });
  }

  grantRepairAccess(req, repair.id);

  const trackToken = createTrackToken("repair", repair.id);
  const clientBase = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");

  res.json({
    repair,
    trackToken,
    shareUrl: `${clientBase}/track/t/${trackToken}`,
  });
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
    with: { service: true, payments: true },
  });
  if (!repair) {
    return res.status(404).json({ error: "Repair not found" });
  }

  const sessionId = getCartSessionId(req);
  const allowed =
    (req.user && repair.userId === req.user.id) ||
    (!!repair.sessionId && repair.sessionId === sessionId) ||
    isStaffViewer(req.user) ||
    hasGrantedRepairAccess(req, repair.id);

  if (!allowed) {
    return res.status(403).json({ error: "Not allowed" });
  }

  res.json({ repair });
});

router.post("/:id/quote-decision", async (req: AuthedRequest, res) => {
  const schema = z.object({
    decision: z.enum(["approved", "declined"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid decision" });

  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, req.params.id),
  });
  if (!repair) return res.status(404).json({ error: "Repair not found" });
  if (repair.status !== "quoted") {
    return res.status(409).json({ error: "Quote approval is only available when status is quoted" });
  }

  const sessionId = getCartSessionId(req);
  const allowed =
    (req.user && repair.userId === req.user.id) ||
    (!!repair.sessionId && repair.sessionId === sessionId) ||
    hasGrantedRepairAccess(req, repair.id);
  if (!allowed) return res.status(403).json({ error: "Not allowed" });

  const updates: Partial<typeof repairOrders.$inferInsert> = {
    quoteDecision: parsed.data.decision,
    updatedAt: new Date(),
  };
  if (parsed.data.decision === "declined") {
    updates.status = "cancelled";
  }

  const [row] = await db
    .update(repairOrders)
    .set(updates)
    .where(eq(repairOrders.id, repair.id))
    .returning();

  res.json({ repair: row });
});

router.post("/paystack/verify", async (req: AuthedRequest, res) => {
  const schema = z.object({ reference: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Reference required" });
  if (!isPaystackConfigured()) {
    return res.status(503).json({ error: "Paystack is not configured" });
  }

  const reference = parsed.data.reference.trim();
  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.paystackReference, reference),
  });
  if (!repair) return res.status(404).json({ error: "Repair not found for reference" });
  if (!canAccessRepair(req, repair) && !hasGrantedRepairAccess(req, repair.id)) {
    grantRepairAccess(req, repair.id);
  }

  if (repair.paymentStatus === "paid") {
    return res.json({ repair, alreadyPaid: true });
  }
  if (repair.quotePesewas == null || repair.quotePesewas <= 0) {
    return res.status(409).json({ error: "Repair has no quote amount" });
  }

  try {
    const verified = await verifyTransaction(reference);
    if (!verified || verified.status !== "success") {
      return res.status(402).json({ error: "Payment not successful" });
    }
    if (verified.amount !== repair.quotePesewas || verified.currency !== "GHS") {
      return res.status(402).json({ error: "Amount or currency mismatch" });
    }
    const updated = await markRepairPaidByPaystack({
      repairId: repair.id,
      amountPesewas: repair.quotePesewas,
      reference,
    });
    grantRepairAccess(req, repair.id);
    return res.json({ repair: updated });
  } catch (err) {
    console.error("[paystack:repair:verify]", err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Unable to verify payment",
    });
  }
});

router.post("/:id/paystack", async (req: AuthedRequest, res) => {
  if (!isPaystackConfigured()) {
    return res.status(503).json({ error: "Paystack is not configured" });
  }

  const repair = await db.query.repairOrders.findFirst({
    where: eq(repairOrders.id, req.params.id),
  });
  if (!repair) return res.status(404).json({ error: "Repair not found" });
  if (!canAccessRepair(req, repair)) {
    return res.status(403).json({ error: "Not allowed" });
  }
  if (repair.paymentStatus === "paid") {
    return res.status(409).json({ error: "Repair is already paid" });
  }
  if (repair.quotePesewas == null || repair.quotePesewas <= 0) {
    return res.status(409).json({ error: "Quote amount is required before Paystack payment" });
  }
  if (repair.quoteDecision === "declined" || repair.status === "cancelled") {
    return res.status(409).json({ error: "This repair cannot be paid" });
  }
  if (repair.quoteDecision !== "approved" && repair.status === "quoted") {
    return res.status(409).json({ error: "Approve the quote before paying online" });
  }

  const reference = repair.paystackReference?.startsWith("me_r_")
    ? repair.paystackReference
    : `me_r_${nanoid(16)}`;

  try {
    const paystackInit = await initializeTransaction({
      channel: "repair",
      email: repair.email,
      amountPesewas: repair.quotePesewas,
      reference,
      metadata: { repairId: repair.id, channel: "repair" },
    });
    if (!paystackInit) {
      return res.status(503).json({ error: "Paystack is not configured" });
    }

    await db
      .update(repairOrders)
      .set({
        paystackReference: reference,
        paymentMethod: "paystack",
        updatedAt: new Date(),
      })
      .where(eq(repairOrders.id, repair.id));

    return res.json({
      repairId: repair.id,
      authorizationUrl: paystackInit.authorization_url,
      authorization_url: paystackInit.authorization_url,
      access_code: paystackInit.access_code,
      reference: paystackInit.reference,
    });
  } catch (err) {
    console.error("[paystack:repair:init]", err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Unable to start secure payment",
    });
  }
});

export default router;
