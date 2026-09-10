import serverless from "serverless-http";
import app from "./app.js";
import { warmDb } from "./db/index.js";

await warmDb();

const run = serverless(app);

export default async function handler(req: any, res: any) {
  const url = String(req.url ?? "");
  if (url === "/api/health" || url.startsWith("/api/health?")) {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, brand: "Media Extensions" }));
    return;
  }
  return run(req, res);
}
