import { neonConfig, Pool, neon } from "@neondatabase/serverless";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import ws from "ws";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = process.env.DATABASE_URL;
const onVercel = process.env.VERCEL === "1";

neonConfig.webSocketConstructor = ws;

type AppDb = ReturnType<typeof drizzleWs<typeof schema>> | ReturnType<typeof drizzleHttp<typeof schema>>;

let poolRef: Pool | null = null;
let dbRef: AppDb;

if (onVercel) {
  // HTTP driver — no long-lived sockets. Avoid relational `db.query` + `with` on this path.
  dbRef = drizzleHttp(neon(connectionString), { schema });
} else {
  poolRef = new Pool({ connectionString });
  poolRef.on("error", (err: Error) => {
    console.warn("[database pool]", err?.message || err);
  });
  dbRef = drizzleWs(poolRef, { schema });
}

export const db = dbRef;

export const pool = new Proxy({} as Pool, {
  get(_t, prop, receiver) {
    if (!poolRef) {
      throw new Error("Postgres pool is unavailable on Vercel");
    }
    const value = Reflect.get(poolRef, prop, receiver);
    return typeof value === "function" ? value.bind(poolRef) : value;
  },
});

export async function warmDb() {
  return db;
}
