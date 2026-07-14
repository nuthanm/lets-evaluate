import { db } from "@/lib/db";
import { candidates, projects, roles, screenings, candidateStages } from "@/lib/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { storeResume } from "@/lib/storage/resumes";
import { extractResumeText } from "@/lib/resume/parse";
import { ensureCandidateStages, getCandidateStages } from "@/lib/db/queries";
import { logEvent } from "@/lib/events";
import {
  getBulkJobItem,
  updateBulkJobItem,
  refreshBulkJobCounts,
  createScreeningSession,
} from "@/lib/db/repositories/bulk-job-repository";
import {
  defaultResumeAnalyzer,
  defaultQuestionGenerator,
  defaultInterviewEvaluator,
  resumeHash,
} from "@/lib/infrastructure/ai/openai-adapter";
import { sendScreeningInvite } from "@/lib/infrastructure/email/graph-sender";
import {
  type PipelineStep,
  isTransientError,
  MAX_PIPELINE_RETRIES,
} from "@/lib/domain/screening-pipeline";
import { screeningLinkUrl } from "@/lib/application/screening/screening-link";
import type { GeneratedQuestion } from "@/lib/ai";
import { randomBytes } from "crypto";

export type ProcessItemInput = {
  itemId: string;
  organizationId: string;
  createdById: string;
  resumeBuffer?: Buffer;
  resumeFilename?: string;
};

async function loadContext(candidateId: string, organizationId: string) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(
      and(eq(candidates.id, candidateId), eq(candidates.organizationId, organizationId)),
    )
    .limit(1);
  if (!candidate) throw new Error("Candidate not found");

  const [project] = candidate.projectId
    ? await db.select().from(projects).where(eq(projects.id, candidate.projectId)).limit(1)
    : [null];
  const [role] = candidate.roleId
    ? await db.select().from(roles).where(eq(roles.id, candidate.roleId)).limit(1)
    : [null];

  const otherProjects = await db
    .select({ name: projects.name, techStack: projects.techStack })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        candidate.projectId ? ne(projects.id, candidate.projectId) : undefined,
      ),
    );

  return {
    candidate,
    project,
    role,
    techStack: (project?.techStack as string[]) ?? [],
    requirements: role?.requirements ?? "",
    otherProjects: otherProjects.map((p) => ({
      name: p.name,
      techStack: (p.techStack as string[]) ?? [],
    })),
  };
}

async function advanceStep(itemId: string, step: PipelineStep) {
  await updateBulkJobItem(itemId, { currentStep: step, status: "running" });
}

async function failItem(itemId: string, jobId: string, error: string, retry: boolean) {
  const item = await getBulkJobItem(itemId);
  const attempts = (item?.attemptCount ?? 0) + 1;
  if (retry && attempts <= MAX_PIPELINE_RETRIES) {
    await updateBulkJobItem(itemId, {
      status: "retry_pending",
      error,
      attemptCount: attempts,
    });
  } else {
    await updateBulkJobItem(itemId, {
      status: "failed",
      error,
      attemptCount: attempts,
    });
  }
  await refreshBulkJobCounts(jobId);
}

export async function processPipelineStep(input: ProcessItemInput): Promise<void> {
  const item = await getBulkJobItem(input.itemId);
  if (!item) return;
  if (item.status === "completed" || item.status === "disqualified") return;

  const jobId = item.jobId;
  let step = item.currentStep as PipelineStep;

  try {
    if (step === "queued" || step === "creating_profile") {
      await advanceStep(input.itemId, "creating_profile");

      if (!item.candidateId) {
        throw new Error("No candidate linked to job item");
      }

      if (input.resumeBuffer && input.resumeFilename) {
        const key = await storeResume(input.resumeBuffer, input.resumeFilename);
        const resumeText = await extractResumeText(input.resumeBuffer, input.resumeFilename);
        await db
          .update(candidates)
          .set({
            resumeStorageKey: key,
            resumeFilename: input.resumeFilename,
            resumeText,
            updatedAt: new Date(),
          })
          .where(eq(candidates.id, item.candidateId));
      }

      step = "analyzing";
      await updateBulkJobItem(input.itemId, { currentStep: step });
    }

    if (step === "analyzing") {
      await advanceStep(input.itemId, "analyzing");
      const ctx = await loadContext(item.candidateId!, input.organizationId);
      const resumeText = ctx.candidate.resumeText ?? "";
      if (!resumeText.trim()) {
        throw new Error("No resume text — upload a resume for this candidate");
      }

      const hash = resumeHash(resumeText);
      const [existing] = await db
        .select()
        .from(screenings)
        .where(eq(screenings.candidateId, item.candidateId!))
        .limit(1);

      const cachedHash = (existing?.metrics as Record<string, unknown> | undefined)
        ?._resumeHash as string | undefined;

      let metrics: Record<string, unknown>;
      if (cachedHash === hash && existing?.metrics) {
        metrics = existing.metrics as Record<string, unknown>;
      } else {
        const analyzed = await defaultResumeAnalyzer.analyze(resumeText, {
          roleName: ctx.role?.name,
          projectName: ctx.project?.name,
          techStack: ctx.techStack,
          requirements: ctx.requirements,
          otherProjects: ctx.otherProjects,
        });
        metrics = { ...analyzed, _resumeHash: hash };
      }

      if (existing) {
        await db.update(screenings).set({ metrics }).where(eq(screenings.id, existing.id));
      } else {
        await db.insert(screenings).values({
          id: uuid(),
          candidateId: item.candidateId!,
          organizationId: input.organizationId,
          metrics,
        });
      }

      await db
        .update(candidates)
        .set({ status: "screening", updatedAt: new Date() })
        .where(eq(candidates.id, item.candidateId!));

      step = "generating_questions";
      await updateBulkJobItem(input.itemId, { currentStep: step });
    }

    if (step === "generating_questions") {
      await advanceStep(input.itemId, "generating_questions");
      const ctx = await loadContext(item.candidateId!, input.organizationId);
      const resumeText = ctx.candidate.resumeText ?? "";
      const roleName = ctx.role?.name ?? "Engineer";

      const gen = defaultQuestionGenerator;
      const std = await gen.generateStandard(roleName, ctx.techStack, 3);
      const resumeQ = resumeText
        ? await gen.generateResume(resumeText, ctx.requirements, 3)
        : [];

      const categories = [
        "Scenario based",
        "Communication",
        "Behavioural",
        "Acceptance",
        "Architecture",
      ];
      const catQs: GeneratedQuestion[] = [];
      for (const cat of categories) {
        const qs = await gen.generateCategory(
          cat,
          { roleName, techStack: ctx.techStack, requirements: ctx.requirements, resumeText },
          2,
        );
        catQs.push(...qs);
      }

      const allQuestions = [
        ...std,
        ...resumeQ,
        ...catQs,
      ] as GeneratedQuestion[];
      const sessionQuestions = gen.selectForSession(allQuestions, 10).map((q, i) => ({
        id: `q-${i + 1}`,
        ...q,
      }));

      await db
        .update(screenings)
        .set({
          standardQuestions: std,
          resumeQuestions: resumeQ,
          roleQuestions: catQs,
        })
        .where(eq(screenings.candidateId, item.candidateId!));

      const token = randomBytes(32).toString("hex");
      const sessionId = uuid();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await createScreeningSession({
        id: sessionId,
        organizationId: input.organizationId,
        candidateId: item.candidateId!,
        bulkJobItemId: input.itemId,
        token,
        questions: sessionQuestions,
        expiresAt,
      });

      step = "preparing_email";
      await updateBulkJobItem(input.itemId, { currentStep: step });
    }

    if (step === "preparing_email") {
      await advanceStep(input.itemId, "preparing_email");
      const ctx = await loadContext(item.candidateId!, input.organizationId);

      const { aiScreeningSessions } = await import("@/lib/db/schema");
      const [latestSession] = await db
        .select()
        .from(aiScreeningSessions)
        .where(eq(aiScreeningSessions.bulkJobItemId, input.itemId))
        .orderBy(desc(aiScreeningSessions.createdAt))
        .limit(1);

      if (!latestSession) throw new Error("Screening session not created");

      const link = screeningLinkUrl(latestSession.token);
      await sendScreeningInvite({
        organizationId: input.organizationId,
        candidateId: item.candidateId!,
        bulkJobItemId: input.itemId,
        candidateName: ctx.candidate.name,
        candidateEmail: ctx.candidate.email ?? "",
        roleName: ctx.role?.name ?? "Role",
        projectName: ctx.project?.name ?? "Project",
        screeningLink: link,
      });

      step = "awaiting_email";
      await updateBulkJobItem(input.itemId, {
        currentStep: step,
        status: "running",
      });
      return;
    }

    if (step === "awaiting_email" || step === "awaiting_interview") {
      // Paused until candidate completes interview or recruiter marks email sent
      await updateBulkJobItem(input.itemId, {
        currentStep: step,
        status: "running",
      });
      return;
    }

    if (step === "evaluating" || step === "applying_verdict") {
      // Handled by evaluateAiInterviewSession
      return;
    }

    if (step === "completed") {
      await updateBulkJobItem(input.itemId, { status: "completed", currentStep: "completed" });
      await refreshBulkJobCounts(jobId);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await failItem(input.itemId, jobId, msg, isTransientError(msg));
    throw e;
  }
}

export async function evaluateAiInterviewSession(sessionId: string): Promise<void> {
  const { aiScreeningSessions } = await import("@/lib/db/schema");
  const [session] = await db
    .select()
    .from(aiScreeningSessions)
    .where(eq(aiScreeningSessions.id, sessionId))
    .limit(1);
  if (!session) return;

  const item = session.bulkJobItemId
    ? await getBulkJobItem(session.bulkJobItemId)
    : null;

  if (item) {
    await updateBulkJobItem(item.id, { currentStep: "evaluating", status: "running" });
  }

  const ctx = await loadContext(session.candidateId, session.organizationId);
  const answers = (session.answers as { questionId: string; question: string; category: string; answer: string }[]) ?? [];

  const evaluation = await defaultInterviewEvaluator.evaluate(answers, {
    roleName: ctx.role?.name,
    projectName: ctx.project?.name,
    techStack: ctx.techStack,
    requirements: ctx.requirements,
    resumeText: ctx.candidate.resumeText ?? undefined,
  });

  await db
    .update(aiScreeningSessions)
    .set({
      status: "completed",
      evaluation: evaluation as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(aiScreeningSessions.id, sessionId));

  const verdict = evaluation.verdict as "proceed" | "hold" | "reject";

  await db
    .update(screenings)
    .set({
      decision: verdict,
      comments: evaluation.comments,
      screenedAt: new Date(),
    })
    .where(eq(screenings.candidateId, session.candidateId));

  const statusMap = {
    proceed: "ready_for_interview" as const,
    hold: "screened_hold" as const,
    reject: "screened_rejected" as const,
  };

  await db
    .update(candidates)
    .set({ status: statusMap[verdict], updatedAt: new Date() })
    .where(eq(candidates.id, session.candidateId));

  await ensureCandidateStages(session.organizationId, session.candidateId, ctx.candidate.projectId);
  const stages = await getCandidateStages(session.candidateId);
  const screeningStage = stages.find((s) => s.stage.kind === "screening");

  if (screeningStage && verdict === "proceed") {
    await db
      .update(candidateStages)
      .set({ status: "passed", decision: "yes", comments: evaluation.comments, decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(candidateStages.id, screeningStage.stage.id));

    const next = stages.find(
      (s) => s.stage.position > screeningStage.stage.position && s.stage.status === "pending",
    );
    if (next) {
      await db
        .update(candidateStages)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(candidateStages.id, next.stage.id));
    }
  } else if (screeningStage && verdict === "reject") {
    await db
      .update(candidateStages)
      .set({ status: "failed", decision: "no", comments: evaluation.comments, decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(candidateStages.id, screeningStage.stage.id));
  } else if (screeningStage && verdict === "hold") {
    await db
      .update(candidateStages)
      .set({
        status: "active",
        decision: "hold",
        comments: evaluation.comments,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candidateStages.id, screeningStage.stage.id));
  }

  if (item) {
    await updateBulkJobItem(item.id, { currentStep: "completed", status: "completed", error: "" });
    await refreshBulkJobCounts(item.jobId);
  }

  await logEvent({
    organizationId: session.organizationId,
    actorId: null,
    entityType: "candidate",
    entityId: session.candidateId,
    action: "ai_screening.completed",
    payload: { verdict: evaluation.verdict, score: evaluation.overallScore },
  });
}

export async function runResumeAnalysis(input: {
  candidateId: string;
  organizationId: string;
  actorId: string;
  resumeText?: string;
}) {
  const ctx = await loadContext(input.candidateId, input.organizationId);
  let resumeText = input.resumeText ?? ctx.candidate.resumeText ?? "";
  if (!resumeText.trim()) throw new Error("No resume found");

  const metrics = await defaultResumeAnalyzer.analyze(resumeText, {
    roleName: ctx.role?.name,
    projectName: ctx.project?.name,
    techStack: ctx.techStack,
    requirements: ctx.requirements,
    otherProjects: ctx.otherProjects,
  });

  const [existing] = await db
    .select()
    .from(screenings)
    .where(eq(screenings.candidateId, input.candidateId))
    .limit(1);

  if (existing) {
    await db
      .update(screenings)
      .set({ metrics: { ...metrics, _resumeHash: resumeHash(resumeText) }, screenedById: input.actorId })
      .where(eq(screenings.id, existing.id));
  } else {
    await db.insert(screenings).values({
      id: uuid(),
      candidateId: input.candidateId,
      organizationId: input.organizationId,
      metrics: { ...metrics, _resumeHash: resumeHash(resumeText) },
      screenedById: input.actorId,
    });
  }

  await db
    .update(candidates)
    .set({ status: "screening", resumeText, updatedAt: new Date() })
    .where(eq(candidates.id, input.candidateId));

  return metrics;
}
