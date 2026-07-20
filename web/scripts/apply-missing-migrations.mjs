/**
 * Applies all missing columns and tables from unapplied migrations.
 * Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 */
import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const dbUrl = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const sql = postgres(dbUrl, { ssl: "require" });

async function run(label, query) {
  try {
    await sql.unsafe(query);
    console.log(`✓ ${label}`);
  } catch (e) {
    if (e.code === "42701" || e.code === "42P07" || e.code === "42710") {
      console.log(`  (already applied: ${label})`);
    } else {
      console.error(`✗ ${label}: ${e.message}`);
    }
  }
}

// 0004_candidates_resume_text
await run("candidates.resume_text",
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_text text`);

// 0006_luxuriant_frightful_four — ai_screening_sessions + related tables
await run("enum ai_screening_session_status", `
  DO $$ BEGIN
    CREATE TYPE ai_screening_session_status AS ENUM('pending','in_progress','submitted','evaluating','completed','disqualified','expired');
  EXCEPTION WHEN duplicate_object THEN null; END $$
`);

await run("table ai_screening_sessions", `
  CREATE TABLE IF NOT EXISTS ai_screening_sessions (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id text REFERENCES candidates(id) ON DELETE CASCADE,
    bulk_job_item_id text,
    token text NOT NULL UNIQUE,
    status ai_screening_session_status NOT NULL DEFAULT 'pending',
    score integer,
    recommendation text,
    summary text,
    answers jsonb DEFAULT '[]',
    submitted_at timestamptz,
    evaluated_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`);

// 0008_add_resume_deduplication
await run("screenings.resume_hash",
  `ALTER TABLE screenings ADD COLUMN IF NOT EXISTS resume_hash text`);
await run("screenings.previous_screening_id",
  `ALTER TABLE screenings ADD COLUMN IF NOT EXISTS previous_screening_id text REFERENCES screenings(id) ON DELETE SET NULL`);
await run("index screenings_resume_hash_idx", `
  CREATE INDEX IF NOT EXISTS screenings_resume_hash_idx ON screenings(organization_id, resume_hash)
`);

// 0009_phase2_3_4_workflow_and_feedback
await run("screenings.clarification_requested_at",
  `ALTER TABLE screenings ADD COLUMN IF NOT EXISTS clarification_requested_at timestamptz`);
await run("screenings.clarification_resolved_at",
  `ALTER TABLE screenings ADD COLUMN IF NOT EXISTS clarification_resolved_at timestamptz`);
await run("screenings.clarification_request_note",
  `ALTER TABLE screenings ADD COLUMN IF NOT EXISTS clarification_request_note text DEFAULT ''`);

await run("table ai_analysis_usage", `
  CREATE TABLE IF NOT EXISTS ai_analysis_usage (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id text REFERENCES candidates(id) ON DELETE SET NULL,
    screening_id text REFERENCES screenings(id) ON DELETE SET NULL,
    extraction_model text NOT NULL DEFAULT 'gpt-4o-mini',
    analysis_model text NOT NULL DEFAULT 'gpt-4o',
    extraction_prompt_tokens integer NOT NULL DEFAULT 0,
    extraction_completion_tokens integer NOT NULL DEFAULT 0,
    extraction_total_tokens integer NOT NULL DEFAULT 0,
    analysis_prompt_tokens integer NOT NULL DEFAULT 0,
    analysis_completion_tokens integer NOT NULL DEFAULT 0,
    analysis_total_tokens integer NOT NULL DEFAULT 0,
    cache_read_tokens integer NOT NULL DEFAULT 0,
    cache_write_tokens integer NOT NULL DEFAULT 0,
    estimated_cost_usd text NOT NULL DEFAULT '0',
    reused_analysis boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`);

await run("table screening_feedback", `
  CREATE TABLE IF NOT EXISTS screening_feedback (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id text NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
    screening_id text REFERENCES screenings(id) ON DELETE SET NULL,
    model_recommendation text DEFAULT '',
    recruiter_decision text DEFAULT '',
    final_outcome text DEFAULT '',
    recruiter_notes text DEFAULT '',
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`);

// 0010_mail_template_layout
await run("mail_templates.layout", `
  ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS layout text DEFAULT 'default'
`);

// 0011_office_locations
await run("table office_locations", `
  CREATE TABLE IF NOT EXISTS office_locations (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text DEFAULT '',
    timezone text DEFAULT 'UTC',
    created_at timestamptz NOT NULL DEFAULT now()
  )
`);

// 0012_organization_mail_assets
await run("table org_email_config", `
  CREATE TABLE IF NOT EXISTS org_email_config (
    id text PRIMARY KEY,
    organization_id text NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    smtp_host text,
    smtp_port integer,
    smtp_username text,
    smtp_password_enc text,
    from_address text,
    from_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`);

// 0013_job_descriptions_and_prompts
await run("table job_descriptions", `
  CREATE TABLE IF NOT EXISTS job_descriptions (
    id text PRIMARY KEY,
    organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id text REFERENCES roles(id) ON DELETE SET NULL,
    project_id text REFERENCES projects(id) ON DELETE SET NULL,
    title text NOT NULL,
    location text NOT NULL,
    experience text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`);

console.log("\nDone. Refresh the browser.");
await sql.end();
