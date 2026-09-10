import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = process.env.DATABASE_URL;
const onVercel = process.env.VERCEL === "1";

type AnyDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pool: any;
};

let bundle: AnyDb | null = null;
let warming: Promise<AnyDb> | null = null;

async function createDb(): Promise<AnyDb> {
  if (onVercel) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const sql = neon(connectionString!);
    return { db: drizzle(sql, { schema }), pool: null };
  }

  const { neonConfig, Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: connectionString! });
  pool.on("error", (err: Error) => {
    console.warn("[database pool]", err?.message || err);
  });
  return { db: drizzle(pool, { schema }), pool };
}

/** Warm the DB client before handling requests (required on Vercel). */
export async function warmDb() {
  if (bundle) return bundle;
  if (!warming) warming = createDb().then((b) => {
    bundle = b;
    return b;
  });
  return warming;
}

export const pool = new Proxy({} as AnyDb["pool"], {
  get(_t, prop, receiver) {
    if (!bundle?.pool) {
      throw new Error("Postgres pool unavailable (Vercel uses Neon HTTP)");
    }
    const value = Reflect.get(bundle.pool, prop, receiver);
    return typeof value === "function" ? value.bind(bundle.pool) : value;
  },
});

export const db = new Proxy({} as AnyDb["db"], {
  get(_t, prop, receiver) {
    if (!bundle) {
      throw new Error("Database not warmed — await warmDb() first");
    }
    const value = Reflect.get(bundle.db, prop, receiver);
    return typeof value === "function" ? value.bind(bundle.db) : value;
  },
});

// Local Node server: warm at import so existing sync handlers keep working
if (!onVercel) {
  await warmDb();
}
