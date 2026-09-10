import serverless from "serverless-http";
import app from "./app.js";
import { warmDb, db } from "./db/index.js";
import { products } from "./db/schema.js";
import { count } from "drizzle-orm";

let run: ReturnType<typeof serverless> | null = null;

async function getRun() {
  if (!run) {
    await warmDb();
    run = serverless(app);
  }
  return run;
}

export default async function handler(req: any, res: any) {
  const url = String(req.url ?? "");
  if (url === "/api/health" || url.startsWith("/api/health?")) {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, brand: "Media Extensions" }));
    return;
  }

  if (url === "/api/health/products" || url.startsWith("/api/health/products?")) {
    const t0 = Date.now();
    try {
      await warmDb();
      const [row] = await db.select({ total: count() }).from(products);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, total: row?.total ?? 0, ms: Date.now() - t0 }));
    } catch (e: any) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e), ms: Date.now() - t0 }));
    }
    return;
  }

  const handle = await getRun();
  return handle(req, res);
}
