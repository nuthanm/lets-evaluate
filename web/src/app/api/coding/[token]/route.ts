import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidates, codingSessions, projects, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  getCodingSessionByToken,
  recordCodingEvent,
  recordCodingEventThrottled,
} from "@/lib/application/coding/coding-queries";

type Params = { params: Promise<{ token: string }> };

function remainingSeconds(timerEndsAt: Date | null | undefined, timeLimitMin: number) {
  if (timerEndsAt) {
    return Math.max(0, Math.floor((timerEndsAt.getTime() - Date.now()) / 1000));
  }
  return Math.max(0, timeLimitMin * 60);
}

function hasSavedProgress(session: {
  candidateCode: string;
  starterCode: string;
  candidateNotes: string;
  startedAt: Date | null;
}) {
  if (!session.startedAt) return false;
  if ((session.candidateNotes ?? "").trim().length > 0) return true;
  return (session.candidateCode ?? "").trim() !== (session.starterCode ?? "").trim();
}

async function metaForSession(session: {
  candidateId: string;
  expiresAt: Date | null;
}) {
  if (session.expiresAt && session.expiresAt < new Date()) {
    return { expired: true as const };
  }

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, session.candidateId))
    .limit(1);
  const [role] = candidate?.roleId
    ? await db.select().from(roles).where(eq(roles.id, candidate.roleId)).limit(1)
    : [null];
  const [project] = candidate?.projectId
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.id, candidate.projectId))
        .limit(1)
    : [null];

  return {
    expired: false as const,
    candidateName: candidate?.name ?? "Candidate",
    roleName: role?.name ?? "",
    projectName: project?.name ?? "",
  };
}

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const session = await getCodingSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const meta = await metaForSession(session);
  if (meta.expired || session.status === "expired") {
    return NextResponse.json({ error: "This link has expired", status: "expired" }, { status: 410 });
  }

  const remaining = remainingSeconds(session.timerEndsAt, session.timeLimitMin);

  return NextResponse.json({
    status: session.status,
    candidateName: meta.candidateName,
    roleName: meta.roleName,
    projectName: meta.projectName,
    title: session.title,
    language: session.language,
    timeLimitMin: session.timeLimitMin,
    scenario: session.scenario,
    starterCode: session.starterCode,
    candidateCode:
      session.status === "pending" ? session.starterCode : session.candidateCode,
    candidateNotes: session.candidateNotes,
    startedAt: session.startedAt?.toISOString() ?? null,
    timerEndsAt: session.timerEndsAt?.toISOString() ?? null,
    remainingSeconds:
      session.status === "in_progress" ? remaining : session.timeLimitMin * 60,
    hasProgress: hasSavedProgress(session),
    canResume: session.status === "in_progress",
    submittedAt: session.submittedAt?.toISOString() ?? null,
    expiresAt: session.expiresAt?.toISOString() ?? null,
    updatedAt: session.updatedAt.toISOString(),
  });
}

const postSchema = z.object({
  action: z.enum(["start", "resume", "restart", "sync", "submit"]),
  code: z.string().max(80_000).optional(),
  notes: z.string().max(8_000).optional(),
  remainingSeconds: z.number().int().min(0).max(60 * 60 * 3).optional(),
  event: z
    .enum(["typing", "pasted", "focused", "blurred", "code_sync"])
    .optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const session = await getCodingSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }
  if (session.expiresAt && session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Expired", status: "expired" }, { status: 410 });
  }
  if (session.status === "submitted") {
    return NextResponse.json({ error: "Already submitted", status: "submitted" }, { status: 409 });
  }
  if (session.status === "expired") {
    return NextResponse.json({ error: "Expired", status: "expired" }, { status: 410 });
  }

  const body = postSchema.parse(await req.json());
  const now = new Date();

  if (body.action === "start") {
    if (session.status === "in_progress") {
      // Idempotent: already started — same as resume
      const remaining = remainingSeconds(session.timerEndsAt, session.timeLimitMin);
      return NextResponse.json({
        ok: true,
        status: "in_progress",
        starterCode: session.starterCode,
        candidateCode: session.candidateCode,
        candidateNotes: session.candidateNotes,
        remainingSeconds: remaining,
        timerEndsAt: session.timerEndsAt?.toISOString() ?? null,
      });
    }
    const timerEndsAt = new Date(now.getTime() + session.timeLimitMin * 60_000);
    await db
      .update(codingSessions)
      .set({
        status: "in_progress",
        openedAt: session.openedAt ?? now,
        startedAt: now,
        timerEndsAt,
        candidateCode: session.starterCode,
        candidateNotes: "",
        updatedAt: now,
      })
      .where(eq(codingSessions.id, session.id));
    await recordCodingEvent(session.id, "opened");
    await recordCodingEvent(session.id, "focused");
    return NextResponse.json({
      ok: true,
      status: "in_progress",
      starterCode: session.starterCode,
      candidateCode: session.starterCode,
      candidateNotes: "",
      remainingSeconds: session.timeLimitMin * 60,
      timerEndsAt: timerEndsAt.toISOString(),
    });
  }

  if (body.action === "resume") {
    if (session.status !== "in_progress") {
      return NextResponse.json({ error: "Nothing to resume" }, { status: 400 });
    }
    let timerEndsAt = session.timerEndsAt;
    let remaining = remainingSeconds(timerEndsAt, session.timeLimitMin);
    if (!timerEndsAt) {
      remaining = session.timeLimitMin * 60;
      timerEndsAt = new Date(now.getTime() + remaining * 1000);
      await db
        .update(codingSessions)
        .set({ timerEndsAt, updatedAt: now })
        .where(eq(codingSessions.id, session.id));
    }
    await recordCodingEvent(session.id, "opened", { resume: true });
    await recordCodingEvent(session.id, "focused");
    return NextResponse.json({
      ok: true,
      status: "in_progress",
      starterCode: session.starterCode,
      candidateCode: session.candidateCode,
      candidateNotes: session.candidateNotes,
      remainingSeconds: remaining,
      timerEndsAt: timerEndsAt.toISOString(),
    });
  }

  if (body.action === "restart") {
    const timerEndsAt = new Date(now.getTime() + session.timeLimitMin * 60_000);
    await db
      .update(codingSessions)
      .set({
        status: "in_progress",
        openedAt: session.openedAt ?? now,
        startedAt: now,
        timerEndsAt,
        candidateCode: session.starterCode,
        candidateNotes: "",
        updatedAt: now,
      })
      .where(eq(codingSessions.id, session.id));
    await recordCodingEvent(session.id, "opened", { restart: true });
    await recordCodingEvent(session.id, "focused");
    return NextResponse.json({
      ok: true,
      status: "in_progress",
      starterCode: session.starterCode,
      candidateCode: session.starterCode,
      candidateNotes: "",
      remainingSeconds: session.timeLimitMin * 60,
      timerEndsAt: timerEndsAt.toISOString(),
    });
  }

  if (body.action === "sync") {
    if (session.status === "pending") {
      return NextResponse.json({ error: "Start the exercise first" }, { status: 400 });
    }
    const code = body.code ?? session.candidateCode;
    const notes = body.notes ?? session.candidateNotes;
    const patch: {
      candidateCode: string;
      candidateNotes: string;
      updatedAt: Date;
      timerEndsAt?: Date;
    } = {
      candidateCode: code,
      candidateNotes: notes,
      updatedAt: now,
    };
    if (typeof body.remainingSeconds === "number") {
      patch.timerEndsAt = new Date(Date.now() + body.remainingSeconds * 1000);
    } else if (!session.timerEndsAt && session.startedAt) {
      const elapsedSec = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
      const left = Math.max(0, session.timeLimitMin * 60 - elapsedSec);
      patch.timerEndsAt = new Date(Date.now() + left * 1000);
    }

    await db
      .update(codingSessions)
      .set(patch)
      .where(eq(codingSessions.id, session.id));

    const event = body.event ?? "code_sync";
    if (event === "typing" || event === "code_sync") {
      await recordCodingEventThrottled(session.id, event, 3000);
    } else if (event === "focused" || event === "blurred") {
      await recordCodingEventThrottled(session.id, event, 8000);
    } else {
      await recordCodingEvent(session.id, event);
    }

    const ends = patch.timerEndsAt ?? session.timerEndsAt;
    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      remainingSeconds: remainingSeconds(ends ?? null, session.timeLimitMin),
    });
  }

  if (body.action === "submit") {
    const code = body.code ?? session.candidateCode;
    const notes = body.notes ?? session.candidateNotes;
    await db
      .update(codingSessions)
      .set({
        candidateCode: code,
        candidateNotes: notes,
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
        ...(typeof body.remainingSeconds === "number"
          ? { timerEndsAt: new Date(now.getTime() + body.remainingSeconds * 1000) }
          : {}),
      })
      .where(eq(codingSessions.id, session.id));
    await recordCodingEvent(session.id, "submitted");
    return NextResponse.json({ ok: true, status: "submitted" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
