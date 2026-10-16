import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { categories, products, repairServices } from "../src/db/schema.js";

neonConfig.webSocketConstructor = ws;

async function main() {
  if (process.env.PURGE_CATALOG_CONFIRM !== "1") {
    console.error(
      "Refusing to purge catalog. Set PURGE_CATALOG_CONFIRM=1 to delete all products, repair services, and categories.",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  async function counts() {
    const [[p], [s], [c]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(products),
      db.select({ count: sql<number>`count(*)::int` }).from(repairServices),
      db.select({ count: sql<number>`count(*)::int` }).from(categories),
    ]);
    return {
      products: p?.count ?? 0,
      repair_services: s?.count ?? 0,
      categories: c?.count ?? 0,
    };
  }

  const before = await counts();
  console.log("Before:", before);

  await db.delete(products);
  await db.delete(repairServices);
  await db.delete(categories);

  const after = await counts();
  console.log("After:", after);
  console.log("Catalog purge complete. Orders, repairs, users, and settings were not modified.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
