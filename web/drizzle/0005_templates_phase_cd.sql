-- Mail templates (org-scoped, placeholder-driven — no external email provider)
CREATE TABLE IF NOT EXISTS "mail_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "audience" text NOT NULL DEFAULT 'candidate',
  "description" text DEFAULT '',
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mail_templates_org_slug_idx" ON "mail_templates" ("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "mail_templates_org_idx" ON "mail_templates" ("organization_id");

-- Interviewer weekly availability windows (minutes from midnight, local)
CREATE TABLE IF NOT EXISTS "interviewer_availability" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "day_of_week" integer NOT NULL,
  "start_minute" integer NOT NULL,
  "end_minute" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "availability_org_user_idx" ON "interviewer_availability" ("organization_id", "user_id");

-- Richer candidate record (Phase D)
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '';
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "source" text DEFAULT '';
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "consent_at" timestamp with time zone;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '';
