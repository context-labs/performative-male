ALTER TABLE "entries" ADD COLUMN "social_platform" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "social_url" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "podium_opt_in" boolean DEFAULT true NOT NULL;
