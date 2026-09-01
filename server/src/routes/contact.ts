import { Router } from "express";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { contactMessages, notifications } from "../db/schema.js";
import { notifyContactMessage, notifyNewsletterSignup } from "../lib/notify.js";
import { requireRoles } from "../middleware/auth.js";

const router = Router();

router.post("/", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    topic: z.enum(["general", "order", "repair", "wholesale"]).default("general"),
    message: z.string().min(10),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid contact form" });
  }

  const [row] = await db
    .insert(contactMessages)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      topic: parsed.data.topic,
      message: parsed.data.message,
    })
    .returning();

  void notifyContactMessage({
    id: row.id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    topic: parsed.data.topic,
    message: parsed.data.message,
  }).catch((err) => console.error("[notify:contact]", err));

  res.status(201).json({ ok: true, id: row.id });
});

router.post("/newsletter", async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const email = parsed.data.email.toLowerCase();
  await db.insert(notifications).values({
    channel: "log",
    recipient: email,
    subject: "Newsletter signup",
    body: `Newsletter subscription: ${email}`,
    meta: { source: "footer" },
  });

  void notifyNewsletterSignup(email).catch((err) => console.error("[notify:newsletter]", err));

  res.status(201).json({ ok: true });
});

router.get("/", requireRoles("admin", "manager"), async (_req, res) => {
  const rows = await db.query.contactMessages.findMany({
    orderBy: [desc(contactMessages.createdAt)],
    limit: 100,
  });
  res.json({ messages: rows });
});

export default router;
