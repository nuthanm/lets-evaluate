CREATE TYPE "public"."ai_screening_session_status" AS ENUM('pending', 'in_progress', 'submitted', 'evaluating', 'completed', 'disqualified', 'expired');--> statement-breakpoint
CREATE TYPE "public"."bulk_job_item_status" AS ENUM('queued', 'running', 'completed', 'failed', 'retry_pending', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."bulk_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."email_delivery_status" AS ENUM('prepared', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('none', 'graph', 'manual');--> statement-breakpoint
CREATE TYPE "public"."mail_template_audience" AS ENUM('candidate', 'interviewer', 'internal');--> statement-breakpoint
CREATE TYPE "public"."pipeline_step" AS ENUM('queued', 'creating_profile', 'analyzing', 'generating_questions', 'preparing_email', 'awaiting_email', 'awaiting_interview', 'evaluating', 'applying_verdict', 'completed');--> statement-breakpoint
CREATE TYPE "public"."violation_type" AS ENUM('tab_switch', 'idle', 'camera');--> statement-breakpoint
CREATE TABLE "ai_screening_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"bulk_job_item_id" text,
	"token" text NOT NULL,
	"status" "ai_screening_session_status" DEFAULT 'pending' NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"evaluation" jsonb DEFAULT '{}'::jsonb,
	"strike_count" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_screening_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "bulk_job_items" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"candidate_id" text,
	"row_index" integer DEFAULT 0 NOT NULL,
	"candidate_name" text DEFAULT '',
	"candidate_email" text DEFAULT '',
	"current_step" "pipeline_step" DEFAULT 'queued' NOT NULL,
	"status" "bulk_job_item_status" DEFAULT 'queued' NOT NULL,
	"error" text DEFAULT '',
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"resume_filename" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"role_id" text,
	"created_by_id" text NOT NULL,
	"status" "bulk_job_status" DEFAULT 'pending' NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"candidate_id" text,
	"bulk_job_item_id" text,
	"slug" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "email_delivery_status" DEFAULT 'prepared' NOT NULL,
	"provider" "email_provider" DEFAULT 'manual' NOT NULL,
	"graph_message_id" text,
	"error" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_email_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "email_provider" DEFAULT 'none' NOT NULL,
	"tenant_id" text DEFAULT '',
	"client_id" text DEFAULT '',
	"client_secret" text DEFAULT '',
	"sender_email" text DEFAULT '',
	"configured" boolean DEFAULT false NOT NULL,
	"graph_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_email_config_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "screening_violations" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" "violation_type" NOT NULL,
	"strike_number" integer DEFAULT 1 NOT NULL,
	"message" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Align mail_templates.audience (created as text in 0005) with the enum used by the schema.
ALTER TABLE "mail_templates" ALTER COLUMN "audience" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "mail_templates" ALTER COLUMN "audience" TYPE "mail_template_audience" USING "audience"::"mail_template_audience";--> statement-breakpoint
ALTER TABLE "mail_templates" ALTER COLUMN "audience" SET DEFAULT 'candidate'::"mail_template_audience";--> statement-breakpoint
ALTER TABLE "ai_screening_sessions" ADD CONSTRAINT "ai_screening_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_screening_sessions" ADD CONSTRAINT "ai_screening_sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_screening_sessions" ADD CONSTRAINT "ai_screening_sessions_bulk_job_item_id_bulk_job_items_id_fk" FOREIGN KEY ("bulk_job_item_id") REFERENCES "public"."bulk_job_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_job_items" ADD CONSTRAINT "bulk_job_items_job_id_bulk_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."bulk_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_job_items" ADD CONSTRAINT "bulk_job_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_job_items" ADD CONSTRAINT "bulk_job_items_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_bulk_job_item_id_bulk_job_items_id_fk" FOREIGN KEY ("bulk_job_item_id") REFERENCES "public"."bulk_job_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_email_config" ADD CONSTRAINT "org_email_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_violations" ADD CONSTRAINT "screening_violations_session_id_ai_screening_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_screening_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_screening_sessions_candidate_idx" ON "ai_screening_sessions" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "ai_screening_sessions_token_idx" ON "ai_screening_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "bulk_job_items_job_idx" ON "bulk_job_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "bulk_job_items_candidate_idx" ON "bulk_job_items" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "bulk_job_items_status_idx" ON "bulk_job_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulk_jobs_org_idx" ON "bulk_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bulk_jobs_status_idx" ON "bulk_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_deliveries_org_idx" ON "email_deliveries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_candidate_idx" ON "email_deliveries" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "screening_violations_session_idx" ON "screening_violations" USING btree ("session_id");