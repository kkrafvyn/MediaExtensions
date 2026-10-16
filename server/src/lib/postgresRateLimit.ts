import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

/** Shared rate limit counter (works across Vercel isolates when Postgres is available). */
export async function hitRateLimit(bucketKey: string, max: number, windowMs: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limit_buckets (bucket_key, hits, reset_at)
      VALUES (${bucketKey}, 1, ${resetAt})
      ON CONFLICT (bucket_key) DO UPDATE SET
        hits = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
          ELSE rate_limit_buckets.hits + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN ${resetAt}
          ELSE rate_limit_buckets.reset_at
        END
      RETURNING hits, reset_at
    `);
    const rows =
      "rows" in result && Array.isArray(result.rows)
        ? result.rows
        : Array.isArray(result)
          ? result
          : [];
    const row = rows[0] as { hits?: number } | undefined;
    const hits = Number(row?.hits ?? 1);
    return hits <= max;
  } catch (err) {
    console.warn("[rate-limit] bucket update failed", err);
    return true;
  }
}
