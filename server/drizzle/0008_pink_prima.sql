CREATE TYPE "public"."order_fulfillment_status" AS ENUM('not_required', 'unfulfilled', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'ready_for_pickup', 'collected');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" "order_fulfillment_status" DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_url" text;
--> statement-breakpoint
UPDATE "orders"
SET "fulfillment_status" = CASE
	WHEN "fulfillment_method" = 'digital' THEN 'not_required'::"public"."order_fulfillment_status"
	WHEN "status" = 'fulfilled' AND "fulfillment_method" = 'pickup' THEN 'collected'::"public"."order_fulfillment_status"
	WHEN "status" = 'fulfilled' THEN 'delivered'::"public"."order_fulfillment_status"
	ELSE 'unfulfilled'::"public"."order_fulfillment_status"
END;