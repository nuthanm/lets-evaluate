CREATE TABLE IF NOT EXISTS "pipeline_workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "project_id" text REFERENCES "projects"("id") ON DELETE cascade,
  "graph" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pipeline_workflows_org_idx" ON "pipeline_workflows" ("organization_id");
CREATE INDEX IF NOT EXISTS "pipeline_workflows_project_idx" ON "pipeline_workflows" ("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_workflows_scope_uq" ON "pipeline_workflows" ("organization_id", "project_id");
