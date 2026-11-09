ALTER TABLE "repair_orders" ADD COLUMN IF NOT EXISTS "paystack_reference" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repair_orders_paystack_reference_uidx" ON "repair_orders" ("paystack_reference") WHERE "paystack_reference" IS NOT NULL;
