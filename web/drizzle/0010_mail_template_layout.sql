ALTER TABLE "mail_templates"
  ADD COLUMN IF NOT EXISTS "header" text DEFAULT '' NOT NULL;

ALTER TABLE "mail_templates"
  ADD COLUMN IF NOT EXISTS "footer" text DEFAULT '' NOT NULL;

ALTER TABLE "mail_templates"
  ADD COLUMN IF NOT EXISTS "tagline" text DEFAULT '' NOT NULL;

ALTER TABLE "mail_templates"
  ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;