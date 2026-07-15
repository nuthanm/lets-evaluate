CREATE TABLE IF NOT EXISTS "office_locations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "office_locations_org_name_unique" UNIQUE("organization_id", "name")
);

DO $$ BEGIN
 ALTER TABLE "office_locations" ADD CONSTRAINT "office_locations_organization_id_organizations_id_fk"
 FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "office_locations_org_idx" ON "office_locations" USING btree ("organization_id");
