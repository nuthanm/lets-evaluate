ALTER TABLE "organization_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "resume_hash" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "previous_screening_id" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_previous_screening_id_screenings_id_fk" FOREIGN KEY ("previous_screening_id") REFERENCES "public"."screenings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_email_config_organization_id_unique" ON "org_email_config" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "screenings_resume_hash_idx" ON "screenings" USING btree ("organization_id","resume_hash");