ALTER TABLE "entries" ADD COLUMN "image_hash" text;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_image_data_url_unique" UNIQUE("image_data_url");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_image_hash_unique" UNIQUE("image_hash");