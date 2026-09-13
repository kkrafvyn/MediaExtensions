import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const base = process.env.DATABASE_URL;
const urls = [
  ["pooler", base],
  ["direct", base.replace("-pooler", "")],
];

for (const [label, url] of urls) {
  const t0 = Date.now();
  try {
    const sql = neon(url);
    const rows = await sql`select 1 as ok`;
    console.log(label, "OK", JSON.stringify(rows), `${Date.now() - t0}ms`);
  } catch (e) {
    console.log(label, "FAIL", e.message, `${Date.now() - t0}ms`);
  }
}
