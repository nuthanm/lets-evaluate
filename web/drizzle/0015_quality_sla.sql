-- SLA tracking columns for quality dashboard
ALTER TABLE "quality_test_runs" ADD COLUMN IF NOT EXISTS "sla_threshold_ms" integer DEFAULT 3000 NOT NULL;
ALTER TABLE "quality_test_runs" ADD COLUMN IF NOT EXISTS "sla_compliant_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "quality_test_runs" ADD COLUMN IF NOT EXISTS "sla_breach_count" integer DEFAULT 0 NOT NULL;

DO $$ BEGIN
  CREATE TYPE "public"."quality_sla_status" AS ENUM('within_sla', 'sla_breach', 'not_applicable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "quality_test_cases" ADD COLUMN IF NOT EXISTS "sla_status" "quality_sla_status" DEFAULT 'not_applicable' NOT NULL;

ALTER TABLE "quality_load_scenarios" ADD COLUMN IF NOT EXISTS "sla_status" "quality_sla_status" DEFAULT 'not_applicable' NOT NULL;
