CREATE TYPE "public"."order_fulfillment_method" AS ENUM('digital', 'delivery', 'pickup');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'pay_on_pickup' BEFORE 'paystack';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_method" "order_fulfillment_method" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
UPDATE "orders" AS o
SET "fulfillment_method" = CASE
	WHEN EXISTS (
		SELECT 1 FROM "order_items" AS i
		WHERE i."order_id" = o."id" AND i."fulfillment" IN ('physical', 'both')
	) AND (o."payment_method" = 'pickup' OR o."shipping" IS NULL) THEN 'pickup'::"public"."order_fulfillment_method"
	WHEN EXISTS (
		SELECT 1 FROM "order_items" AS i
		WHERE i."order_id" = o."id" AND i."fulfillment" IN ('physical', 'both')
	) THEN 'delivery'::"public"."order_fulfillment_method"
	ELSE 'digital'::"public"."order_fulfillment_method"
END;