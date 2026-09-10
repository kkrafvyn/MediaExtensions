import app from "./app.js";
import { warmDb, db } from "./db/index.js";
import { products } from "./db/schema.js";
import { count } from "drizzle-orm";

// Warm DB once per isolate
const ready = warmDb();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, brand: "Media Extensions" });
});

app.get("/api/health/products", async (_req, res) => {
  const t0 = Date.now();
  try {
    await ready;
    const [row] = await db.select({ total: count() }).from(products);
    res.json({ ok: true, total: row?.total ?? 0, ms: Date.now() - t0 });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e), ms: Date.now() - t0 });
  }
});

// Vercel Node supports exporting an Express app directly (no serverless-http).
await ready;
export default app;
