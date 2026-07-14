import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const memberRoleEnum = pgEnum("member_role", [
  "admin",
  "ta",
  "interviewer",
  "manager",
  "hr",
]);

/** Kinds of interview-process stages. Screening is the AI/TA screening,
 * final is the final confirmation dossier; the rest are interview rounds. */
export const stageKindEnum = pgEnum("stage_kind", [
  "screening",
  "technical",
  "manager",
  "hr",
  "final",
  "custom",
]);

/** Per-candidate progress through a configured stage. */
export const stageStatusEnum = pgEnum("stage_status", [
  "pending",
  "active",
  "passed",
  "failed",
  "skipped",
]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "draft",
  "screening",
  "screened_hold",
  "screened_rejected",
  "ready_for_interview",
  "assigned",
  "interview_in_progress",
  "interview_complete",
  "selected",
  "rejected",
  "hold",
]);

export const screeningDecisionEnum = pgEnum("screening_decision", [
  "proceed",
  "hold",
  "reject",
]);

export const interviewDecisionEnum = pgEnum("interview_decision", [
  "selected",
  "rejected",
  "hold",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const roleStatusEnum = pgEnum("role_status", ["open", "closed"]);

export const mailTemplateAudienceEnum = pgEnum("mail_template_audience", [
  "candidate",
  "interviewer",
  "internal",
]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  passwordHash: text("password_hash"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("ta"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("org_member_unique").on(t.organizationId, t.userId),
    index("org_member_user_idx").on(t.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    techStack: jsonb("tech_stack").$type<string[]>().default([]).notNull(),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("projects_org_idx").on(t.organizationId)],
);

export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    level: text("level").default(""),
    requirements: text("requirements").default(""),
    projectIds: jsonb("project_ids").$type<string[]>().default([]),
    status: roleStatusEnum("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("roles_org_idx").on(t.organizationId)],
);

/**
 * Configurable interview-process template. A row with projectId = null defines
 * the organization's general/default flow; rows with a projectId override the
 * flow for that project.
 */
export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    label: text("label").notNull(),
    kind: stageKindEnum("kind").notNull().default("custom"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("pipeline_stages_org_idx").on(t.organizationId),
    index("pipeline_stages_project_idx").on(t.projectId),
  ],
);

/**
 * A candidate's materialized progress through their project's interview flow.
 * One row per stage, ordered by position.
 */
export const candidateStages = pgTable(
  "candidate_stages",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: stageKindEnum("kind").notNull().default("custom"),
    position: integer("position").notNull().default(0),
    status: stageStatusEnum("status").notNull().default("pending"),
    assignedToId: text("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedById: text("assigned_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    /** Panel SLA — defaults to dueAt + 48h when a slot is booked. */
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    handoffNote: text("handoff_note").default(""),
    decision: text("decision"),
    comments: text("comments").default(""),
    /** The interviewer's worked question set for this round (with satisfaction + notes). */
    questions: jsonb("questions").$type<unknown[]>().default([]),
    /** Storage key + filename of the auto-generated PDF evaluation report. */
    reportKey: text("report_key"),
    reportFilename: text("report_filename"),
    decidedById: text("decided_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("candidate_stages_candidate_idx").on(t.candidateId),
    index("candidate_stages_org_idx").on(t.organizationId),
    index("candidate_stages_assignee_idx").on(t.assignedToId),
  ],
);

export const mailTemplates = pgTable(
  "mail_templates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    audience: mailTemplateAudienceEnum("audience").notNull().default("candidate"),
    description: text("description").default(""),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("mail_templates_org_slug_idx").on(t.organizationId, t.slug),
    index("mail_templates_org_idx").on(t.organizationId),
  ],
);

export const interviewerAvailability = pgTable(
  "interviewer_availability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 0 = Monday … 6 = Sunday */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Minutes from midnight, e.g. 540 = 09:00 */
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("availability_org_user_idx").on(t.organizationId, t.userId)],
);

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    questionText: text("question_text").notNull(),
    category: text("category").default("Technical"),
    /** Severity band for severity-wise segregation (Easy | Medium | Hard). */
    difficulty: text("difficulty").default("Medium"),
    roleIds: jsonb("role_ids").$type<string[]>().default([]),
    /** "org" = visible to everyone in the org; "private" = only the creator. */
    visibility: text("visibility").default("org").notNull(),
    /** Optional code snippet for code-error/refactoring style questions. */
    code: text("code").default(""),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("questions_org_idx").on(t.organizationId),
    index("questions_creator_idx").on(t.createdById),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").default(""),
    phone: text("phone").default(""),
    source: text("source").default(""),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    notes: text("notes").default(""),
    resumeStorageKey: text("resume_storage_key"),
    resumeFilename: text("resume_filename").default(""),
    resumeText: text("resume_text"),
    status: candidateStatusEnum("status").notNull().default("draft"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("candidates_org_idx").on(t.organizationId),
    index("candidates_status_idx").on(t.status),
  ],
);

export const screenings = pgTable(
  "screenings",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" })
      .unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // NEW: Resume deduplication — hash of normalized resume text
    resumeHash: text("resume_hash"),
    // NEW: Link to prior analysis if this resume was analyzed before
    previousScreeningId: text("previous_screening_id").references(
      () => screenings.id,
      { onDelete: "set null" },
    ),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().default({}),
    standardQuestions: jsonb("standard_questions").$type<unknown[]>().default([]),
    resumeQuestions: jsonb("resume_questions").$type<unknown[]>().default([]),
    roleQuestions: jsonb("role_questions").$type<unknown[]>().default([]),
    qSatisfaction: jsonb("q_satisfaction").$type<Record<string, unknown>>().default({}),
    decision: screeningDecisionEnum("decision"),
    comments: text("comments").default(""),
    screenedById: text("screened_by_id").references(() => users.id),
    screenedAt: timestamp("screened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("screenings_org_idx").on(t.organizationId),
    // NEW: Index for deduplication lookups (resume hash within org)
    index("screenings_resume_hash_idx").on(
      t.organizationId,
      t.resumeHash,
    ),
  ],
);

export const interviewAssignments = pgTable(
  "interview_assignments",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assignedToId: text("assigned_to_id")
      .notNull()
      .references(() => users.id),
    assignedById: text("assigned_by_id")
      .notNull()
      .references(() => users.id),
    status: assignmentStatusEnum("status").notNull().default("pending"),
    handoffNote: text("handoff_note").default(""),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("assignments_org_idx").on(t.organizationId),
    index("assignments_assignee_idx").on(t.assignedToId),
  ],
);

export const interviewReviews = pgTable(
  "interview_reviews",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" })
      .unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id").references(
      () => interviewAssignments.id,
      { onDelete: "set null" },
    ),
    comments: text("comments").default(""),
    questionNotes: jsonb("question_notes").$type<unknown[]>().default([]),
    decision: interviewDecisionEnum("decision"),
    reviewedById: text("reviewed_by_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("reviews_org_idx").on(t.organizationId)],
);

export const evaluationEvents = pgTable(
  "evaluation_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("events_org_idx").on(t.organizationId),
    index("events_created_idx").on(t.createdAt),
  ],
);

export const drafts = pgTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id").references(() => candidates.id, {
      onDelete: "cascade",
    }),
    step: integer("step").notNull().default(1),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("drafts_user_idx").on(t.userId)],
);

export const bulkJobStatusEnum = pgEnum("bulk_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const bulkJobItemStatusEnum = pgEnum("bulk_job_item_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "retry_pending",
  "disqualified",
]);

export const pipelineStepEnum = pgEnum("pipeline_step", [
  "queued",
  "creating_profile",
  "analyzing",
  "generating_questions",
  "preparing_email",
  "awaiting_email",
  "awaiting_interview",
  "evaluating",
  "applying_verdict",
  "completed",
]);

export const aiScreeningSessionStatusEnum = pgEnum("ai_screening_session_status", [
  "pending",
  "in_progress",
  "submitted",
  "evaluating",
  "completed",
  "disqualified",
  "expired",
]);

export const violationTypeEnum = pgEnum("violation_type", [
  "tab_switch",
  "idle",
  "camera",
]);

export const emailDeliveryStatusEnum = pgEnum("email_delivery_status", [
  "prepared",
  "sent",
  "failed",
]);

export const emailProviderEnum = pgEnum("email_provider", [
  "none",
  "graph",
  "manual",
]);

export const bulkJobs = pgTable(
  "bulk_jobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    roleId: text("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    status: bulkJobStatusEnum("status").notNull().default("pending"),
    totalCount: integer("total_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("bulk_jobs_org_idx").on(t.organizationId),
    index("bulk_jobs_status_idx").on(t.status),
  ],
);

export const bulkJobItems = pgTable(
  "bulk_job_items",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => bulkJobs.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id").references(() => candidates.id, {
      onDelete: "set null",
    }),
    rowIndex: integer("row_index").notNull().default(0),
    candidateName: text("candidate_name").default(""),
    candidateEmail: text("candidate_email").default(""),
    currentStep: pipelineStepEnum("current_step").notNull().default("queued"),
    status: bulkJobItemStatusEnum("status").notNull().default("queued"),
    error: text("error").default(""),
    attemptCount: integer("attempt_count").notNull().default(0),
    resumeFilename: text("resume_filename").default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("bulk_job_items_job_idx").on(t.jobId),
    index("bulk_job_items_candidate_idx").on(t.candidateId),
    index("bulk_job_items_status_idx").on(t.status),
  ],
);

export const aiScreeningSessions = pgTable(
  "ai_screening_sessions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    bulkJobItemId: text("bulk_job_item_id").references(() => bulkJobItems.id, {
      onDelete: "set null",
    }),
    token: text("token").notNull().unique(),
    status: aiScreeningSessionStatusEnum("status").notNull().default("pending"),
    questions: jsonb("questions").$type<unknown[]>().default([]),
    answers: jsonb("answers").$type<unknown[]>().default([]),
    evaluation: jsonb("evaluation").$type<Record<string, unknown>>().default({}),
    strikeCount: integer("strike_count").notNull().default(0),
    retryCount: integer("retry_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ai_screening_sessions_candidate_idx").on(t.candidateId),
    index("ai_screening_sessions_token_idx").on(t.token),
  ],
);

export const screeningViolations = pgTable(
  "screening_violations",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => aiScreeningSessions.id, { onDelete: "cascade" }),
    type: violationTypeEnum("type").notNull(),
    strikeNumber: integer("strike_number").notNull().default(1),
    message: text("message").default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("screening_violations_session_idx").on(t.sessionId)],
);

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id").references(() => candidates.id, {
      onDelete: "set null",
    }),
    bulkJobItemId: text("bulk_job_item_id").references(() => bulkJobItems.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: emailDeliveryStatusEnum("status").notNull().default("prepared"),
    provider: emailProviderEnum("provider").notNull().default("manual"),
    graphMessageId: text("graph_message_id"),
    error: text("error").default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("email_deliveries_org_idx").on(t.organizationId),
    index("email_deliveries_candidate_idx").on(t.candidateId),
  ],
);

export const orgEmailConfig = pgTable(
  "org_email_config",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" })
      .unique(),
    provider: emailProviderEnum("provider").notNull().default("none"),
    tenantId: text("tenant_id").default(""),
    clientId: text("client_id").default(""),
    clientSecret: text("client_secret").default(""),
    senderEmail: text("sender_email").default(""),
    configured: boolean("configured").notNull().default(false),
    graphEnabled: boolean("graph_enabled").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("org_email_config_organization_id_unique").on(t.organizationId)],
);

/* Auth.js tables */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
  candidates: many(candidates),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
}));
