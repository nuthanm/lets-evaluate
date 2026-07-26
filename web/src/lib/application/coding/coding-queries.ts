import { and, desc, eq, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import {
  codingExercises,
  codingSessionEvents,
  codingSessions,
  codingEventTypeEnum,
} from "@/lib/db/schema";

export type CodingEventType = (typeof codingEventTypeEnum.enumValues)[number];

export async function listCodingExercises(orgId: string, userId: string) {
  return db
    .select()
    .from(codingExercises)
    .where(
      and(
        eq(codingExercises.organizationId, orgId),
        or(
          eq(codingExercises.visibility, "org"),
          eq(codingExercises.createdById, userId),
        ),
      ),
    )
    .orderBy(desc(codingExercises.updatedAt));
}

export async function getCodingSessionByToken(token: string) {
  const [row] = await db
    .select()
    .from(codingSessions)
    .where(eq(codingSessions.token, token))
    .limit(1);
  return row ?? null;
}

export async function getLatestCodingSessionForStage(
  stageId: string,
  orgId: string,
) {
  const [row] = await db
    .select()
    .from(codingSessions)
    .where(
      and(
        eq(codingSessions.stageId, stageId),
        eq(codingSessions.organizationId, orgId),
      ),
    )
    .orderBy(desc(codingSessions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listCodingSessionEvents(sessionId: string, limit = 80) {
  return db
    .select()
    .from(codingSessionEvents)
    .where(eq(codingSessionEvents.sessionId, sessionId))
    .orderBy(desc(codingSessionEvents.createdAt))
    .limit(limit);
}

export async function recordCodingEvent(
  sessionId: string,
  type: CodingEventType,
  meta: Record<string, unknown> = {},
) {
  await db.insert(codingSessionEvents).values({
    id: uuid(),
    sessionId,
    type,
    meta,
  });
}

/** Avoid flooding events: skip duplicate typing/code_sync within windowMs. */
export async function recordCodingEventThrottled(
  sessionId: string,
  type: CodingEventType,
  windowMs = 4000,
  meta: Record<string, unknown> = {},
) {
  if (type === "typing" || type === "code_sync") {
    const [latest] = await db
      .select()
      .from(codingSessionEvents)
      .where(
        and(
          eq(codingSessionEvents.sessionId, sessionId),
          eq(codingSessionEvents.type, type),
        ),
      )
      .orderBy(desc(codingSessionEvents.createdAt))
      .limit(1);
    if (latest && Date.now() - latest.createdAt.getTime() < windowMs) {
      return false;
    }
  }
  await recordCodingEvent(sessionId, type, meta);
  return true;
}

export function newCodingToken() {
  return randomBytes(24).toString("hex");
}

export type CreateCodingSessionInput = {
  organizationId: string;
  candidateId: string;
  stageId: string;
  interviewerId: string;
  exerciseId?: string | null;
  title: string;
  language: string;
  timeLimitMin: number;
  scenario: string;
  starterCode: string;
  expiresInHours?: number;
};

export async function createCodingSession(input: CreateCodingSessionInput) {
  const id = uuid();
  const token = newCodingToken();
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 72) * 60 * 60 * 1000,
  );
  await db.insert(codingSessions).values({
    id,
    organizationId: input.organizationId,
    candidateId: input.candidateId,
    stageId: input.stageId,
    interviewerId: input.interviewerId,
    exerciseId: input.exerciseId ?? null,
    token,
    title: input.title,
    language: input.language,
    timeLimitMin: input.timeLimitMin,
    scenario: input.scenario,
    starterCode: input.starterCode,
    candidateCode: input.starterCode,
    status: "pending",
    expiresAt,
  });
  await recordCodingEvent(id, "link_created");
  const [row] = await db
    .select()
    .from(codingSessions)
    .where(eq(codingSessions.id, id))
    .limit(1);
  return row!;
}
