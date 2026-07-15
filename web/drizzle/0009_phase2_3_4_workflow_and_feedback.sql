-- drizzle/0009_phase2_3_4_workflow_and_feedback.sql
-- Phase 2: clarification lifecycle fields
-- Phase 3: AI token/cost telemetry
-- Phase 4: recommendation feedback loop

ALTER TABLE screenings
  ADD COLUMN clarification_requested_at timestamp with time zone;

ALTER TABLE screenings
  ADD COLUMN clarification_resolved_at timestamp with time zone;

ALTER TABLE screenings
  ADD COLUMN clarification_request_note text DEFAULT '';

CREATE TABLE ai_analysis_usage (
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
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX ai_analysis_usage_org_idx ON ai_analysis_usage(organization_id);
CREATE INDEX ai_analysis_usage_candidate_idx ON ai_analysis_usage(candidate_id);
CREATE INDEX ai_analysis_usage_created_idx ON ai_analysis_usage(created_at);

CREATE TABLE screening_feedback (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id text NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  screening_id text REFERENCES screenings(id) ON DELETE SET NULL,
  model_recommendation text DEFAULT '',
  recruiter_decision text DEFAULT '',
  final_outcome text DEFAULT '',
  recruiter_notes text DEFAULT '',
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX screening_feedback_org_idx ON screening_feedback(organization_id);
CREATE INDEX screening_feedback_candidate_idx ON screening_feedback(candidate_id);
CREATE INDEX screening_feedback_recommendation_idx ON screening_feedback(model_recommendation);
