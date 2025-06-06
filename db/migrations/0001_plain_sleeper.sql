ALTER TABLE "api_keys" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "is_enabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_notifications" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_notifications" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_notifications" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "market_insights" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "market_insights" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_saved_articles" ALTER COLUMN "saved_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "author" varchar(255);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "sentiment_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "keywords" jsonb;