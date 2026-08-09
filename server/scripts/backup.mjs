#!/usr/bin/env node
/**
 * Database backup helper for Media Extensions (Neon / Postgres).
 *
 * Usage:
 *   node scripts/backup.mjs              # print instructions; run pg_dump if available
 *   node scripts/backup.mjs --dry-run    # instructions only
 *
 * Requires DATABASE_URL in server/.env (or the environment).
 * Install PostgreSQL client tools so `pg_dump` is on PATH.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
config({ path: path.join(serverRoot, ".env") });

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;

console.log(`
Media Extensions — Postgres backup
==================================
1. Ensure PostgreSQL client tools are installed (pg_dump).
   - Windows: install from https://www.postgresql.org/download/windows/
   - macOS: brew install libpq && brew link --force libpq
   - Linux: apt install postgresql-client

2. Set DATABASE_URL (Neon connection string) in server/.env

3. Run:
   node scripts/backup.mjs

4. Or dump manually:
   pg_dump "$DATABASE_URL" --no-owner --format=custom -f backups/me-$(date +%Y%m%d).dump

Restore:
   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/me-YYYYMMDD.dump
`);

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

if (dryRun) {
  console.log("Dry run — skipping pg_dump.");
  process.exit(0);
}

const backupsDir = path.join(serverRoot, "backups");
fs.mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = path.join(backupsDir, `me-${stamp}.dump`);

const check = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
if (check.error || check.status !== 0) {
  console.warn("pg_dump not found on PATH. Printed instructions above; install client tools to dump automatically.");
  process.exit(0);
}

console.log(`Running pg_dump → ${outFile}`);
const result = spawnSync(
  "pg_dump",
  [databaseUrl, "--no-owner", "--format=custom", "-f", outFile],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "pg_dump failed");
  process.exit(result.status ?? 1);
}

console.log("Backup complete:", outFile);
