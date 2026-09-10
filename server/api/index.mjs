import serverless from "serverless-http";

let cached;

async function getHandler() {
  if (!cached) {
    const [{ default: app }, { warmDb }] = await Promise.all([
      import("../dist/app.js"),
      import("../dist/db/index.js"),
    ]);
    await warmDb();
    cached = serverless(app);
  }
  return cached;
}

export default async function handler(req, res) {
  const url = req.url ?? "";

  if (url === "/api/health" || url.startsWith("/api/health?")) {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, brand: "Media Extensions" }));
    return;
  }

  if (url === "/api/health/db" || url.startsWith("/api/health/db?")) {
    const t0 = Date.now();
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`select 1 as ok`;
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, rows, ms: Date.now() - t0 }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e), ms: Date.now() - t0 }));
    }
    return;
  }

  if (url === "/api/health/app" || url.startsWith("/api/health/app?")) {
    const t0 = Date.now();
    try {
      await getHandler();
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, appLoaded: true, ms: Date.now() - t0 }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e), ms: Date.now() - t0 }));
    }
    return;
  }

  if (url === "/api/health/drizzle" || url.startsWith("/api/health/drizzle?")) {
    const t0 = Date.now();
    try {
      const { warmDb, db } = await import("../dist/db/index.js");
      await warmDb();
      const { products } = await import("../dist/db/schema.js");
      const { count } = await import("drizzle-orm");
      const [row] = await db.select({ total: count() }).from(products);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, total: row?.total ?? 0, ms: Date.now() - t0 }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e), ms: Date.now() - t0 }));
    }
    return;
  }

  const run = await getHandler();
  return run(req, res);
}
