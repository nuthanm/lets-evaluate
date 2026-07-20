-- Quality test run telemetry for public trust dashboard
DO $$ BEGIN
  CREATE TYPE "public"."quality_suite_status" AS ENUM('passed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "quality_test_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "run_date" text NOT NULL,
  "generated_at" timestamp with time zone NOT NULL,
  "environment" text DEFAULT 'production' NOT NULL,
  "automation_pass_rate" integer DEFAULT 0 NOT NULL,
  "load_pass_rate" integer DEFAULT 0 NOT NULL,
  "total_tests" integer DEFAULT 0 NOT NULL,
  "passed_tests" integer DEFAULT 0 NOT NULL,
  "failed_tests" integer DEFAULT 0 NOT NULL,
  "total_duration_ms" integer DEFAULT 0 NOT NULL,
  "load_base_url" text DEFAULT '' NOT NULL,
  "ci_ref" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "quality_test_runs_run_date_idx" ON "quality_test_runs" ("run_date");
CREATE INDEX IF NOT EXISTS "quality_test_runs_generated_at_idx" ON "quality_test_runs" ("generated_at");

CREATE TABLE IF NOT EXISTS "quality_test_cases" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL REFERENCES "quality_test_runs"("id") ON DELETE cascade,
  "feature_area" text NOT NULL,
  "suite_type" text NOT NULL,
  "test_key" text NOT NULL,
  "name" text NOT NULL,
  "status" "quality_suite_status" NOT NULL,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "error_message" text DEFAULT '' NOT NULL
);

CREATE INDEX IF NOT EXISTS "quality_test_cases_run_idx" ON "quality_test_cases" ("run_id");
CREATE INDEX IF NOT EXISTS "quality_test_cases_feature_idx" ON "quality_test_cases" ("feature_area");
CREATE INDEX IF NOT EXISTS "quality_test_cases_suite_idx" ON "quality_test_cases" ("suite_type");

CREATE TABLE IF NOT EXISTS "quality_load_scenarios" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL REFERENCES "quality_test_runs"("id") ON DELETE cascade,
  "virtual_users" integer NOT NULL,
  "duration_sec" integer NOT NULL,
  "total_requests" integer DEFAULT 0 NOT NULL,
  "requests_per_sec" integer DEFAULT 0 NOT NULL,
  "avg_response_ms" integer DEFAULT 0 NOT NULL,
  "p95_response_ms" integer DEFAULT 0 NOT NULL,
  "p99_response_ms" integer DEFAULT 0 NOT NULL,
  "error_rate_bps" integer DEFAULT 0 NOT NULL,
  "status" "quality_suite_status" NOT NULL
);

CREATE INDEX IF NOT EXISTS "quality_load_scenarios_run_idx" ON "quality_load_scenarios" ("run_id");
