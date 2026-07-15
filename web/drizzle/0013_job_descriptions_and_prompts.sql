CREATE TABLE IF NOT EXISTS "job_descriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "role_id" text,
  "project_id" text,
  "title" text NOT NULL,
  "location" text NOT NULL,
  "experience" text NOT NULL,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_organization_id_organizations_id_fk"
 FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_role_id_roles_id_fk"
 FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_project_id_projects_id_fk"
 FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_created_by_id_users_id_fk"
 FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "job_descriptions_org_idx" ON "job_descriptions" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_role_idx" ON "job_descriptions" USING btree ("role_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_project_idx" ON "job_descriptions" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_updated_idx" ON "job_descriptions" USING btree ("updated_at");

CREATE TABLE IF NOT EXISTS "job_description_prompts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "template" text NOT NULL,
  "created_by_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "job_description_prompts" ADD CONSTRAINT "job_description_prompts_organization_id_organizations_id_fk"
 FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "job_description_prompts" ADD CONSTRAINT "job_description_prompts_created_by_id_users_id_fk"
 FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "job_description_prompts_org_idx" ON "job_description_prompts" USING btree ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "job_description_prompts_org_name_unique" ON "job_description_prompts" USING btree ("organization_id", "name");

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "job_description_id" text;

DO $$ BEGIN
 ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_description_id_job_descriptions_id_fk"
 FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "candidates_job_description_idx" ON "candidates" USING btree ("job_description_id");
