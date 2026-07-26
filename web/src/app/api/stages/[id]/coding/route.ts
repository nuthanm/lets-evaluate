import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidateStages, codingExercises } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError } from "@/lib/api/helpers";
import { codingLinkUrl } from "@/lib/application/coding/coding-link";
import {
  createCodingSession,
  getLatestCodingSessionForStage,
  listCodingSessionEvents,
} from "@/lib/application/coding/coding-queries";

type Params = { params: Promise<{ id: string }> };

async function loadStage(stageId: string, orgId: string) {
  const [stage] = await db
    .select()
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.id, stageId),
        eq(candidateStages.organizationId, orgId),
      ),
    )
    .limit(1);
  return stage ?? null;
}

function canAccessStage(
  stage: { assignedToId: string | null },
  user: { id: string; role: string },
) {
  if (stage.assignedToId === user.id) return true;
  return ["admin", "ta", "ta_lead"].includes(user.role);
}

function serializeSession(
  session: NonNullable<Awaited<ReturnType<typeof getLatestCodingSessionForStage>>>,
) {
  return {
    id: session.id,
    token: session.token,
    link: codingLinkUrl(session.token),
    title: session.title,
    language: session.language,
    timeLimitMin: session.timeLimitMin,
    scenario: session.scenario,
    starterCode: session.starterCode,
    candidateCode: session.candidateCode,
    candidateNotes: session.candidateNotes,
    status: session.status,
    expiresAt: session.expiresAt?.toISOString() ?? null,
    openedAt: session.openedAt?.toISOString() ?? null,
    startedAt: session.startedAt?.toISOString() ?? null,
    submittedAt: session.submittedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, { params }: Params) {
  const authSession = await auth();
  if (!authSession?.user) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;
  const stage = await loadStage(stageId, authSession.user.organizationId);
  if (!stage) return apiError("Not found", 404);
  if (!canAccessStage(stage, authSession.user)) return apiError("Forbidden", 403);

  const session = await getLatestCodingSessionForStage(
    stageId,
    authSession.user.organizationId,
  );
  if (!session) {
    return NextResponse.json(
      { session: null, events: [] },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }

  const events = await listCodingSessionEvents(session.id);
  return NextResponse.json(
    {
      session: serializeSession(session),
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        at: e.createdAt.toISOString(),
        meta: e.meta ?? {},
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

const createSchema = z.object({
  exerciseId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  language: z.string().min(1).max(60).optional(),
  timeLimitMin: z.number().int().min(10).max(120).optional(),
  scenario: z.string().min(1).max(12_000).optional(),
  starterCode: z.string().max(40_000).optional(),
  saveToLibrary: z.boolean().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!authSession?.user) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;
  const stage = await loadStage(stageId, authSession.user.organizationId);
  if (!stage) return apiError("Not found", 404);
  if (stage.assignedToId !== authSession.user.id) {
    return apiError("Only the assigned interviewer can share a coding exercise", 403);
  }
  if (stage.status !== "active") {
    return apiError("Stage is not active", 400);
  }

  const body = createSchema.parse(await req.json());

  let title = body.title?.trim() ?? "";
  let language = body.language?.trim() || "TypeScript";
  let timeLimitMin = body.timeLimitMin ?? 40;
  let scenario = body.scenario?.trim() ?? "";
  let starterCode = body.starterCode ?? "";
  let exerciseId = body.exerciseId ?? null;

  if (body.exerciseId) {
    const [ex] = await db
      .select()
      .from(codingExercises)
      .where(
        and(
          eq(codingExercises.id, body.exerciseId),
          eq(codingExercises.organizationId, authSession.user.organizationId),
        ),
      )
      .limit(1);
    if (!ex) return apiError("Exercise not found", 404);
    title = ex.title;
    language = ex.language;
    timeLimitMin = ex.timeLimitMin;
    scenario = ex.scenario;
    starterCode = ex.starterCode;
    exerciseId = ex.id;
  }

  if (!title || !scenario) {
    return apiError("title and scenario are required", 400);
  }

  if (body.saveToLibrary) {
    const { v4: uuid } = await import("uuid");
    const id = uuid();
    await db.insert(codingExercises).values({
      id,
      organizationId: authSession.user.organizationId,
      title,
      language,
      timeLimitMin,
      scenario,
      starterCode,
      tags: ["from-interview"],
      visibility: "org",
      createdById: authSession.user.id,
    });
    exerciseId = id;
  }

  const session = await createCodingSession({
    organizationId: authSession.user.organizationId,
    candidateId: stage.candidateId,
    stageId: stage.id,
    interviewerId: authSession.user.id,
    exerciseId,
    title,
    language,
    timeLimitMin,
    scenario,
    starterCode,
  });

  return NextResponse.json(
    { session: serializeSession(session), link: codingLinkUrl(session.token) },
    { status: 201 },
  );
}
