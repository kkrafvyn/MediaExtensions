ALTER TYPE "public"."return_request_status" ADD VALUE 'refund_pending' BEFORE 'refunded';--> statement-breakpoint
ALTER TYPE "public"."return_request_status" ADD VALUE 'refund_processing' BEFORE 'refunded';--> statement-breakpoint
ALTER TYPE "public"."return_request_status" ADD VALUE 'refund_needs_attention' BEFORE 'refunded';--> statement-breakpoint
ALTER TYPE "public"."return_request_status" ADD VALUE 'refund_failed' BEFORE 'refunded';