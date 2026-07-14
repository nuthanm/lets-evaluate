import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  candidates,
  candidateStages,
  projects,
  roles,
  screenings,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError } from "@/lib/api/helpers";
import { getCandidateStages } from "@/lib/db/queries";
import { logEvent } from "@/lib/events";
import { buildInterviewReportPdf, PDF_REPORT_VERSION } from "@/lib/report/pdf";
import { storeReport } from "@/lib/storage/reports";

type Params = { params: Promise<{ id: string }> };

const questionSchema = z.object({
  category: z.string().optional(),
  question: z.string(),
  code: z.string().optional(),
  difficulty: z.string().optional(),
  satisfaction: z.string().optional(),
  notes: z.string().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["yes", "no"]),
  comments: z.string().optional(),
  questions: z.array(questionSchema).optional(),
});

/** The assigned panel member records their Yes/No verdict for a stage. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;
  const body = decisionSchema.parse(await req.json());

  const [stage] = await db
    .select()
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.id, stageId),
        eq(candidateStages.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);
  if (!stage) return apiError("Not found", 404);

  // Only the assigned person can record their own verdict.
  if (stage.assignedToId !== session.user.id) {
    return apiError("You are not assigned to this stage", 403);
  }
  if (stage.status !== "active") {
    return apiError("This stage is not awaiting a decision", 400);
  }

  // Build the PDF evaluation report automatically before recording the verdict
  // so the recruiter always receives it alongside the interviewer's comments.
  const workedQuestions = body.questions ?? [];
  let reportKey: string | null = null;
  let reportFilename: string | null = null;
  try {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, stage.candidateId))
      .limit(1);
    const [project] = candidate?.projectId
      ? await db
          .select()
          .from(projects)
          .where(eq(projects.id, candidate.projectId))
          .limit(1)
      : [null];
    const [role] = candidate?.roleId
      ? await db.select().from(roles).where(eq(roles.id, candidate.roleId)).limit(1)
      : [null];
    const [screening] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.candidateId, stage.candidateId))
      .limit(1);
    const [interviewer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const metrics =
      (screening?.metrics as Record<string, unknown> | undefined) ?? {};
    const score = metrics.tech_match_score;

    const pdf = await buildInterviewReportPdf({
      candidateName: candidate?.name ?? "Candidate",
      role: role?.name ?? "Role",
      projectName: project?.name ?? undefined,
      round: stage.label,
      interviewerName: interviewer?.name ?? session.user.name ?? "Interviewer",
      decision: body.decision,
      justification: body.comments ?? "",
      generatedAt: new Date(),
      techMatchScore: typeof score === "number" ? Math.round(score) : null,
      aiRecommendation:
        typeof metrics.recommendation === "string"
          ? metrics.recommendation
          : undefined,
      aiSummary:
        typeof metrics.summary === "string" ? metrics.summary : undefined,
      strengths: Array.isArray(metrics.strengths)
        ? (metrics.strengths as string[])
        : [],
      concerns: Array.isArray(metrics.concerns)
        ? (metrics.concerns as string[])
        : [],
      questions: workedQuestions.map((q) => ({
        category: q.category ?? "",
        question: q.question,
        code: q.code ?? "",
        difficulty: q.difficulty ?? "",
        satisfaction: q.satisfaction ?? "",
        notes: q.notes ?? "",
      })),
    });

    const safeName = (candidate?.name ?? "candidate").replace(/[^a-z0-9]+/gi, "-");
    reportFilename = `${safeName}-${stage.label.replace(/[^a-z0-9]+/gi, "-")}-report-v${PDF_REPORT_VERSION}.pdf`;
    reportKey = await storeReport(pdf, reportFilename);
  } catch (err) {
    console.error("Report generation failed", err);
  }

  await db
    .update(candidateStages)
    .set({
      status: body.decision === "yes" ? "passed" : "failed",
      decision: body.decision,
      comments: body.comments ?? "",
      questions: workedQuestions,
      reportKey,
      reportFilename,
      decidedById: session.user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(candidateStages.id, stageId));

  const candidateId = stage.candidateId;
  let candidateStatus:
    | "assigned"
    | "ready_for_interview"
    | "interview_complete"
    | "selected"
    | "rejected";

  if (body.decision === "no") {
    // Reject the candidate and skip any remaining stages.
    candidateStatus = "rejected";
    const stages = await getCandidateStages(candidateId, stage.organizationId);
    for (const s of stages) {
      if (s.stage.position > stage.position && s.stage.status === "pending") {
        await db
          .update(candidateStages)
          .set({ status: "skipped", updatedAt: new Date() })
          .where(eq(candidateStages.id, s.stage.id));
      }
    }
  } else {
    const stages = await getCandidateStages(candidateId, stage.organizationId);
    const next = stages.find(
      (s) => s.stage.position > stage.position && s.stage.status === "pending",
    );
    if (!next) {
      candidateStatus = "selected";
    } else if (next.stage.kind === "final") {
      await db
        .update(candidateStages)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(candidateStages.id, next.stage.id));
      candidateStatus = "interview_complete";
    } else {
      await db
        .update(candidateStages)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(candidateStages.id, next.stage.id));
      // Next interview round needs a fresh assignee → back to TA's booking queue.
      candidateStatus = "ready_for_interview";
    }
  }

  await db
    .update(candidates)
    .set({ status: candidateStatus, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId));

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "candidate",
    entityId: candidateId,
    action: "stage.decided",
    payload: { stage: stage.label, decision: body.decision },
  });

  return NextResponse.json({ ok: true, candidateStatus });
}
