import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = process.env.DATABASE_URL;
const onVercel = process.env.VERCEL === "1";

type AppDb = NeonHttpDatabase<typeof schema> | NeonDatabase<typeof schema>;

async function createWsBundle() {
  const { neonConfig, Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString });
  pool.on("error", (err: Error) => {
    console.warn("[database pool]", err?.message || err);
  });
  return { db: drizzle(pool, { schema }), pool };
}

const localBundle = onVercel ? null : await createWsBundle();

export const db: AppDb = onVercel
  ? drizzleHttp(neon(connectionString), { schema })
  : localBundle!.db;

export const pool = new Proxy({} as NonNullable<typeof localBundle>["pool"], {
  get(_t, prop, receiver) {
    if (!localBundle?.pool) {
      throw new Error("Postgres pool is unavailable on Vercel");
    }
    const value = Reflect.get(localBundle.pool, prop, receiver);
    return typeof value === "function" ? value.bind(localBundle.pool) : value;
  },
});

/** Kept for the serverless entry; HTTP client needs no warm-up. */
export async function warmDb() {
  return db;
}
