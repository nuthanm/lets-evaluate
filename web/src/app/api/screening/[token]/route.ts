import { NextResponse } from "next/server";
import { getSessionByToken, updateScreeningSession } from "@/lib/db/repositories/bulk-job-repository";
import { db } from "@/lib/db";
import { candidates, projects, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  if (!session) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  if (session.expiresAt && session.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
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
    ? await db.select().from(projects).where(eq(projects.id, candidate.projectId)).limit(1)
    : [null];

  return NextResponse.json({
    status: session.status,
    candidateName: candidate?.name ?? "Candidate",
    roleName: role?.name ?? "",
    projectName: project?.name ?? "",
    strikeCount: session.strikeCount,
    disqualified: session.status === "disqualified",
  });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const body = (await req.json()) as { action: string; answer?: string; questionId?: string; type?: string };

  const session = await getSessionByToken(token);
  if (!session) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (session.status === "disqualified") {
    return NextResponse.json({ error: "Session disqualified", disqualified: true }, { status: 403 });
  }
  if (session.expiresAt && session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  if (body.action === "start") {
    if (session.status === "pending") {
      await updateScreeningSession(session.id, {
        status: "in_progress",
        startedAt: new Date(),
      });
    }
    const questions = (session.questions as { id: string; question: string; category: string; code?: string }[]) ?? [];
    return NextResponse.json({ questions, strikeCount: session.strikeCount });
  }

  if (body.action === "answer" && body.questionId && body.answer !== undefined) {
    const answers = [...((session.answers as { questionId: string; question: string; category: string; answer: string }[]) ?? [])];
    const questions = (session.questions as { id: string; question: string; category: string }[]) ?? [];
    const q = questions.find((x) => x.id === body.questionId);
    const idx = answers.findIndex((a) => a.questionId === body.questionId);
    const entry = {
      questionId: body.questionId,
      question: q?.question ?? "",
      category: q?.category ?? "",
      answer: body.answer,
    };
    if (idx >= 0) answers[idx] = entry;
    else answers.push(entry);
    await updateScreeningSession(session.id, { answers });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "violation" && body.type) {
    const { handleViolation } = await import("@/lib/application/screening/handle-violation");
    const result = await handleViolation(session.id, body.type as "tab_switch" | "idle" | "camera");
    return NextResponse.json(result);
  }

  if (body.action === "submit") {
    await updateScreeningSession(session.id, {
      status: "submitted",
      submittedAt: new Date(),
    });

    const { getJobQueue } = await import("@/lib/infrastructure/jobs/job-queue-factory");
    const { updateBulkJobItem } = await import("@/lib/db/repositories/bulk-job-repository");
    if (session.bulkJobItemId) {
      await updateBulkJobItem(session.bulkJobItemId, {
        currentStep: "evaluating",
        status: "running",
      });
    }
    await getJobQueue().enqueueEvaluateSession(session.id);
    return NextResponse.json({ ok: true, submitted: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
