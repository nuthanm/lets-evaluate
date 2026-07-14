import { db } from "@/lib/db";
import {
  bulkJobs,
  bulkJobItems,
  aiScreeningSessions,
  screeningViolations,
  emailDeliveries,
  orgEmailConfig,
} from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import type { PipelineStep } from "@/lib/domain/screening-pipeline";

export async function createBulkJob(input: {
  id: string;
  organizationId: string;
  projectId: string | null;
  roleId: string | null;
  createdById: string;
  totalCount: number;
}) {
  await db.insert(bulkJobs).values({
    id: input.id,
    organizationId: input.organizationId,
    projectId: input.projectId,
    roleId: input.roleId,
    createdById: input.createdById,
    status: "pending",
    totalCount: input.totalCount,
    completedCount: 0,
    failedCount: 0,
  });
}

export async function createBulkJobItem(input: {
  id: string;
  jobId: string;
  organizationId: string;
  rowIndex: number;
  candidateName: string;
  candidateEmail: string;
  resumeFilename?: string;
  candidateId?: string;
}) {
  await db.insert(bulkJobItems).values({
    id: input.id,
    jobId: input.jobId,
    organizationId: input.organizationId,
    rowIndex: input.rowIndex,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    resumeFilename: input.resumeFilename ?? "",
    candidateId: input.candidateId ?? null,
    currentStep: "queued",
    status: "queued",
  });
}

export async function getBulkJob(orgId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(bulkJobs)
    .where(and(eq(bulkJobs.id, jobId), eq(bulkJobs.organizationId, orgId)))
    .limit(1);
  return job ?? null;
}

export async function getBulkJobItems(jobId: string) {
  return db
    .select()
    .from(bulkJobItems)
    .where(eq(bulkJobItems.jobId, jobId))
    .orderBy(asc(bulkJobItems.rowIndex));
}

export async function getBulkJobItem(itemId: string) {
  const [item] = await db
    .select()
    .from(bulkJobItems)
    .where(eq(bulkJobItems.id, itemId))
    .limit(1);
  return item ?? null;
}

export async function updateBulkJobItem(
  itemId: string,
  patch: Partial<{
    candidateId: string;
    currentStep: PipelineStep;
    status: "queued" | "running" | "completed" | "failed" | "retry_pending" | "disqualified";
    error: string;
    attemptCount: number;
  }>,
) {
  await db
    .update(bulkJobItems)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(bulkJobItems.id, itemId));
}

export async function refreshBulkJobCounts(jobId: string) {
  const items = await getBulkJobItems(jobId);
  const completedCount = items.filter((i) => i.status === "completed").length;
  const failedCount = items.filter(
    (i) => i.status === "failed" || i.status === "disqualified",
  ).length;
  const running = items.some(
    (i) => i.status === "running" || i.status === "queued",
  );
  const status =
    running
      ? "running"
      : failedCount > 0 && completedCount === 0
        ? "failed"
        : "completed";

  await db
    .update(bulkJobs)
    .set({
      completedCount,
      failedCount,
      status,
      updatedAt: new Date(),
    })
    .where(eq(bulkJobs.id, jobId));
}

export async function listBulkJobs(orgId: string, limit = 20) {
  return db
    .select()
    .from(bulkJobs)
    .where(eq(bulkJobs.organizationId, orgId))
    .orderBy(desc(bulkJobs.createdAt))
    .limit(limit);
}

export async function createScreeningSession(input: {
  id: string;
  organizationId: string;
  candidateId: string;
  token: string;
  bulkJobItemId?: string;
  questions: unknown[];
  expiresAt: Date;
}) {
  await db.insert(aiScreeningSessions).values({
    id: input.id,
    organizationId: input.organizationId,
    candidateId: input.candidateId,
    bulkJobItemId: input.bulkJobItemId ?? null,
    token: input.token,
    status: "pending",
    questions: input.questions,
    expiresAt: input.expiresAt,
  });
}

export async function getSessionByToken(token: string) {
  const [session] = await db
    .select()
    .from(aiScreeningSessions)
    .where(eq(aiScreeningSessions.token, token))
    .limit(1);
  return session ?? null;
}

export async function getSessionById(id: string) {
  const [session] = await db
    .select()
    .from(aiScreeningSessions)
    .where(eq(aiScreeningSessions.id, id))
    .limit(1);
  return session ?? null;
}

export async function updateScreeningSession(
  id: string,
  patch: Partial<{
    status: "pending" | "in_progress" | "submitted" | "evaluating" | "completed" | "disqualified" | "expired";
    answers: unknown[];
    evaluation: Record<string, unknown>;
    strikeCount: number;
    retryCount: number;
    startedAt: Date;
    submittedAt: Date;
  }>,
) {
  await db
    .update(aiScreeningSessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(aiScreeningSessions.id, id));
}

export async function addViolation(input: {
  id: string;
  sessionId: string;
  type: "tab_switch" | "idle" | "camera";
  strikeNumber: number;
  message: string;
}) {
  await db.insert(screeningViolations).values({
    id: input.id,
    sessionId: input.sessionId,
    type: input.type,
    strikeNumber: input.strikeNumber,
    message: input.message,
  });
}

export async function createEmailDelivery(input: {
  id: string;
  organizationId: string;
  candidateId?: string;
  bulkJobItemId?: string;
  slug: string;
  recipient: string;
  subject: string;
  body: string;
  status: "prepared" | "sent" | "failed";
  provider: "none" | "graph" | "manual";
  graphMessageId?: string;
  error?: string;
}) {
  await db.insert(emailDeliveries).values({
    id: input.id,
    organizationId: input.organizationId,
    candidateId: input.candidateId ?? null,
    bulkJobItemId: input.bulkJobItemId ?? null,
    slug: input.slug,
    recipient: input.recipient,
    subject: input.subject,
    body: input.body,
    status: input.status,
    provider: input.provider,
    graphMessageId: input.graphMessageId ?? null,
    error: input.error ?? "",
    sentAt: input.status === "sent" ? new Date() : null,
  });
}

export async function getOrgEmailConfig(organizationId: string) {
  const [row] = await db
    .select()
    .from(orgEmailConfig)
    .where(eq(orgEmailConfig.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

export async function markEmailSent(deliveryId: string) {
  await db
    .update(emailDeliveries)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(emailDeliveries.id, deliveryId));
}
