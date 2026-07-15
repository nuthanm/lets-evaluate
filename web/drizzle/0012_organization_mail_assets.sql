CREATE TABLE IF NOT EXISTS "organization_mail_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "logo_asset_key" text DEFAULT '' NOT NULL,
  "header_image_asset_key" text DEFAULT '' NOT NULL,
  "footer_image_asset_key" text DEFAULT '' NOT NULL,
  "apply_scope" text DEFAULT 'all' NOT NULL,
  "template_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "organization_mail_assets" ADD CONSTRAINT "organization_mail_assets_organization_id_organizations_id_fk"
 FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "organization_mail_assets_org_unique" ON "organization_mail_assets" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "organization_mail_assets_org_idx" ON "organization_mail_assets" USING btree ("organization_id");
