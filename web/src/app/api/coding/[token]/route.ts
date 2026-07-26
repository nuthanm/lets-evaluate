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

async function metaForSession(session: {
  candidateId: string;
  status: string;
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
    submittedAt: session.submittedAt?.toISOString() ?? null,
    expiresAt: session.expiresAt?.toISOString() ?? null,
  });
}

const postSchema = z.object({
  action: z.enum(["start", "sync", "submit"]),
  code: z.string().max(80_000).optional(),
  notes: z.string().max(8_000).optional(),
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

  if (body.action === "start") {
    const now = new Date();
    if (session.status === "pending") {
      await db
        .update(codingSessions)
        .set({
          status: "in_progress",
          openedAt: now,
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(codingSessions.id, session.id));
      await recordCodingEvent(session.id, "opened");
      await recordCodingEvent(session.id, "focused");
    }
    return NextResponse.json({
      ok: true,
      status: "in_progress",
      starterCode: session.starterCode,
      timeLimitMin: session.timeLimitMin,
    });
  }

  if (body.action === "sync") {
    if (session.status === "pending") {
      return NextResponse.json({ error: "Start the exercise first" }, { status: 400 });
    }
    const code = body.code ?? session.candidateCode;
    const notes = body.notes ?? session.candidateNotes;
    await db
      .update(codingSessions)
      .set({
        candidateCode: code,
        candidateNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(codingSessions.id, session.id));

    const event = body.event ?? "code_sync";
    if (event === "typing" || event === "code_sync") {
      await recordCodingEventThrottled(session.id, event);
    } else {
      await recordCodingEvent(session.id, event);
    }
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
  }

  if (body.action === "submit") {
    const code = body.code ?? session.candidateCode;
    const notes = body.notes ?? session.candidateNotes;
    const now = new Date();
    await db
      .update(codingSessions)
      .set({
        candidateCode: code,
        candidateNotes: notes,
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(codingSessions.id, session.id));
    await recordCodingEvent(session.id, "submitted");
    return NextResponse.json({ ok: true, status: "submitted" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
