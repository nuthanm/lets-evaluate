ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "resume_text" text;
ALTER TABLE "candidate_stages" ADD COLUMN IF NOT EXISTS "sla_due_at" timestamp with time zone;
