ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "staff_notes" text;
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL
);
