import { Router } from "express";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { contactMessages } from "../db/schema.js";
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

  res.status(201).json({ ok: true, id: row.id });
});

router.get("/", requireRoles("admin", "manager"), async (_req, res) => {
  const rows = await db.query.contactMessages.findMany({
    orderBy: [desc(contactMessages.createdAt)],
    limit: 100,
  });
  res.json({ messages: rows });
});

export default router;
