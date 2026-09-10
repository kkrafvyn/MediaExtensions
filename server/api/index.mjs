import serverless from "serverless-http";

let cached;

async function getHandler() {
  if (!cached) {
    const { default: app } = await import("../dist/app.js");
    cached = serverless(app);
  }
  return cached;
}

export default async function handler(req, res) {
  // Fast path — never touch Express/DB for health checks
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
