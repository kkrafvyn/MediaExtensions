ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'technician';

ALTER TABLE "repair_orders" ADD COLUMN IF NOT EXISTS "imei" text;
ALTER TABLE "repair_orders" ADD COLUMN IF NOT EXISTS "quote_decision" text NOT NULL DEFAULT 'pending';

ALTER TABLE "payment_records" ALTER COLUMN "order_id" DROP NOT NULL;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "repair_order_id" uuid;
DO $$ BEGIN
  ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_repair_order_id_repair_orders_id_fk"
    FOREIGN KEY ("repair_order_id") REFERENCES "public"."repair_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
