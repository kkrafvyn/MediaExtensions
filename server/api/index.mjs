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

  const run = await getHandler();
  return run(req, res);
}
