import { v4 as uuid } from "uuid";
import { recordViolation } from "@/lib/domain/proctoring-policy";
import {
  getSessionById,
  updateScreeningSession,
  addViolation,
  updateBulkJobItem,
} from "@/lib/db/repositories/bulk-job-repository";
import { logEvent } from "@/lib/events";
import type { ViolationType } from "@/lib/domain/proctoring-policy";

export async function handleViolation(sessionId: string, type: ViolationType) {
  const session = await getSessionById(sessionId);
  if (!session) return { error: "Session not found" };

  const result = recordViolation(session.strikeCount, type);

  await addViolation({
    id: uuid(),
    sessionId,
    type,
    strikeNumber: result.strikeCount,
    message: result.message,
  });

  await updateScreeningSession(sessionId, { strikeCount: result.strikeCount });

  if (result.action === "disqualify") {
    await updateScreeningSession(sessionId, { status: "disqualified" });
    if (session.bulkJobItemId) {
      await updateBulkJobItem(session.bulkJobItemId, {
        status: "disqualified",
        error: result.message,
      });
    }
    await logEvent({
      organizationId: session.organizationId,
      actorId: null,
      entityType: "screening_session",
      entityId: sessionId,
      action: "screening.disqualified",
      payload: { type, strikes: result.strikeCount },
    });
  }

  return {
    action: result.action,
    message: result.message,
    strikeCount: result.strikeCount,
    disqualified: result.action === "disqualify",
  };
}

export async function grantSessionRetry(sessionId: string, recruiterId: string) {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.retryCount >= 1) throw new Error("Maximum retries already granted");

  const { randomBytes } = await import("crypto");
  const newToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { db } = await import("@/lib/db");
  const { aiScreeningSessions } = await import("@/lib/db/schema");

  await db.insert(aiScreeningSessions).values({
    id: uuid(),
    organizationId: session.organizationId,
    candidateId: session.candidateId,
    bulkJobItemId: session.bulkJobItemId,
    token: newToken,
    status: "pending",
    questions: session.questions,
    strikeCount: 0,
    retryCount: session.retryCount + 1,
    expiresAt,
  });

  if (session.bulkJobItemId) {
    await updateBulkJobItem(session.bulkJobItemId, {
      status: "running",
      currentStep: "awaiting_interview",
      error: "",
    });
  }

  await logEvent({
    organizationId: session.organizationId,
    actorId: recruiterId,
    entityType: "screening_session",
    entityId: sessionId,
    action: "screening.retry_granted",
    payload: { newToken: newToken.slice(0, 8) + "…" },
  });

  const { screeningLinkUrl } = await import("@/lib/application/screening/screening-link");
  return { token: newToken, link: screeningLinkUrl(newToken) };
}
