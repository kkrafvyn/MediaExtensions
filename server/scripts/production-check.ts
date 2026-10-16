import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function main() {
  console.log("Media Extensions production checklist\n");
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  checks.push({
    name: "DATABASE_URL",
    ok: Boolean(process.env.DATABASE_URL?.trim()),
    detail: process.env.DATABASE_URL ? "set" : "missing",
  });
  checks.push({
    name: "SESSION_SECRET",
    ok: Boolean(process.env.SESSION_SECRET?.trim()) && process.env.SESSION_SECRET !== "change-me",
    detail: process.env.SESSION_SECRET ? "set" : "missing or default",
  });
  checks.push({
    name: "CLIENT_URL",
    ok: Boolean(process.env.CLIENT_URL?.trim()),
    detail: process.env.CLIENT_URL ?? "missing",
  });
  const storage = process.env.STORAGE_DRIVER?.trim().toLowerCase() === "s3";
  checks.push({
    name: "R2/S3 uploads (production)",
    ok: !process.env.VERCEL || storage,
    detail: storage ? "STORAGE_DRIVER=s3" : "local uploads (set STORAGE_DRIVER=s3 on Vercel)",
  });
  checks.push({
    name: "MOMO_NUMBER",
    ok: Boolean(process.env.MOMO_NUMBER?.trim()),
    detail: process.env.MOMO_NUMBER ? "set in env" : "empty — use Staff → Settings or env",
  });

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    try {
      const mig = await db.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM "__drizzle_migrations"`,
      );
      const migRows = (mig as { rows?: { count: number }[] }).rows ?? mig;
      const migrationCount = Number(migRows[0]?.count ?? 0);
      checks.push({
        name: "Database migrations",
        ok: migrationCount >= 16,
        detail: migrationCount ? `${migrationCount} applied (expect ≥16)` : "could not read __drizzle_migrations",
      });
      const [prodRes, catRes, servRes] = await Promise.all([
        db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM products`),
        db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM categories`),
        db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM repair_services`),
      ]);
      const row = (res: unknown) => {
        const rows = (res as { rows?: { count: number }[] }).rows ?? (res as { count: number }[]);
        return Number(rows[0]?.count ?? 0);
      };
      const p = row(prodRes);
      const c = row(catRes);
      const s = row(servRes);
      checks.push({
        name: "Catalog populated",
        ok: p > 0 && s > 0,
        detail: `products=${p}, categories=${c}, repair_services=${s}`,
      });
    } catch (err) {
      checks.push({
        name: "Database probe",
        ok: false,
        detail: err instanceof Error ? err.message : "failed",
      });
    } finally {
      await pool.end();
    }
  }

  for (const c of checks) {
    console.log(`${c.ok ? "OK" : "!!"} ${c.name}: ${c.detail}`);
  }
  const failed = checks.filter((c) => !c.ok).length;
  if (failed) {
    console.log(`\n${failed} check(s) need attention. See RUNBOOK.md.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
