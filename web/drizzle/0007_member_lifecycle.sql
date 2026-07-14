ALTER TABLE "organization_members" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "organization_members" SET "last_active_at" = COALESCE("last_active_at", "created_at");--> statement-breakpoint