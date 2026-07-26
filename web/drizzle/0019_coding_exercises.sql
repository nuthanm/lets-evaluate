CREATE TYPE "public"."coding_session_status" AS ENUM('pending', 'in_progress', 'submitted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."coding_event_type" AS ENUM('opened', 'focused', 'blurred', 'typing', 'pasted', 'code_sync', 'submitted', 'expired', 'link_created');--> statement-breakpoint
CREATE TABLE "coding_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"language" text DEFAULT 'TypeScript' NOT NULL,
	"time_limit_min" integer DEFAULT 40 NOT NULL,
	"scenario" text DEFAULT '' NOT NULL,
	"starter_code" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"visibility" text DEFAULT 'org' NOT NULL,
	"role_id" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "coding_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"interviewer_id" text,
	"exercise_id" text,
	"token" text NOT NULL,
	"title" text NOT NULL,
	"language" text DEFAULT 'TypeScript' NOT NULL,
	"time_limit_min" integer DEFAULT 40 NOT NULL,
	"scenario" text DEFAULT '' NOT NULL,
	"starter_code" text DEFAULT '' NOT NULL,
	"candidate_code" text DEFAULT '' NOT NULL,
	"candidate_notes" text DEFAULT '' NOT NULL,
	"status" "coding_session_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coding_sessions_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE TABLE "coding_session_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" "coding_event_type" NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "coding_exercises" ADD CONSTRAINT "coding_exercises_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_exercises" ADD CONSTRAINT "coding_exercises_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_exercises" ADD CONSTRAINT "coding_exercises_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_sessions" ADD CONSTRAINT "coding_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_sessions" ADD CONSTRAINT "coding_sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_sessions" ADD CONSTRAINT "coding_sessions_stage_id_candidate_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."candidate_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_sessions" ADD CONSTRAINT "coding_sessions_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_sessions" ADD CONSTRAINT "coding_sessions_exercise_id_coding_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."coding_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_session_events" ADD CONSTRAINT "coding_session_events_session_id_coding_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."coding_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coding_exercises_org_idx" ON "coding_exercises" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "coding_exercises_creator_idx" ON "coding_exercises" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "coding_sessions_stage_idx" ON "coding_sessions" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "coding_sessions_candidate_idx" ON "coding_sessions" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "coding_sessions_token_idx" ON "coding_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "coding_session_events_session_idx" ON "coding_session_events" USING btree ("session_id");
