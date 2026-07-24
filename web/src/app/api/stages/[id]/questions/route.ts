import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates, candidateStages, projects, roles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, rateLimit } from "@/lib/api/helpers";
import {
  generateCategoryQuestions,
  questionCategoriesForStageKind,
  type QuestionCategory,
} from "@/lib/ai";
import { getOrgQuestions } from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  category: z.string(),
  count: z.number().int().min(1).max(10).optional(),
});

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

/** The assigned panel member generates questions for a given category. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  if (!session.user.organizationId) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request body";
    return apiError(msg, 400);
  }

  if (!rateLimit(`ai:${session.user.id}`, 30)) {
    return apiError("Rate limit exceeded", 429);
  }

  let stage: typeof candidateStages.$inferSelect | undefined;
  try {
    [stage] = await db
      .select()
      .from(candidateStages)
      .where(
        and(
          eq(candidateStages.id, stageId),
          eq(candidateStages.organizationId, session.user.organizationId),
        ),
      )
      .limit(1);
  } catch {
    return apiError("Stage lookup failed", 500);
  }
  if (!stage) return apiError("Stage not found", 404);

  const isOwner = stage.assignedToId === session.user.id;
  const isLead = session.user.role === "admin" || session.user.role === "ta";
  if (!isOwner && !isLead) {
    return apiError("You are not assigned to this stage", 403);
  }

  // The question set depends on the stage's round type (technical / manager / hr)
  // so a manager round gets leadership questions instead of coding ones.
  const categoryIds = questionCategoriesForStageKind(stage.kind).map((c) => c.id) as string[];
  if (!categoryIds.includes(body.category)) {
    return apiError("Unknown category", 400);
  }

  let candidate: { resumeText: string | null; projectId: string | null; roleId: string | null } | undefined;
  try {
    [candidate] = await db
      .select({
        resumeText: candidates.resumeText,
        projectId: candidates.projectId,
        roleId: candidates.roleId,
      })
      .from(candidates)
      .where(eq(candidates.id, stage.candidateId))
      .limit(1);
  } catch {
    return apiError("Candidate lookup failed", 500);
  }
  if (!candidate) return apiError("Candidate not found", 404);

  let project: { techStack: unknown } | null | undefined = null;
  if (candidate.projectId) {
    try {
      [project] = await db
        .select({ techStack: projects.techStack })
        .from(projects)
        .where(eq(projects.id, candidate.projectId))
        .limit(1);
    } catch {
      project = null;
    }
  }

  let role: { name: string; requirements: string | null } | null | undefined = null;
  if (candidate.roleId) {
    try {
      [role] = await db
        .select({ name: roles.name, requirements: roles.requirements })
        .from(roles)
        .where(eq(roles.id, candidate.roleId))
        .limit(1);
    } catch {
      role = null;
    }
  }

  const requestedCount = body.count ?? 5;

  // Reuse library questions first so interviewer/manager/hr can benefit from
  // previously saved custom questions for the same category.
  let libraryQuestions: {
    question: string;
    category: string;
    code?: string;
    difficulty?: string;
    expected_answer_hints?: string;
  }[] = [];

  try {
    const rows = await getOrgQuestions(
      session.user.organizationId,
      candidate.roleId ?? undefined,
      session.user.id,
    );
    const categoryKey = normalizeCategory(body.category);
    libraryQuestions = rows
      .filter((q) => normalizeCategory(q.category ?? "") === categoryKey)
      .slice(0, requestedCount)
      .map((q) => ({
        question: q.questionText,
        category: q.category ?? body.category,
        code: q.code ?? "",
        difficulty: q.difficulty ?? "Medium",
        expected_answer_hints: "",
      }));
  } catch {
    libraryQuestions = [];
  }

  const remaining = requestedCount - libraryQuestions.length;
  if (remaining <= 0) {
    return NextResponse.json({ questions: libraryQuestions });
  }

  let aiQuestions: Awaited<ReturnType<typeof generateCategoryQuestions>>;
  try {
    aiQuestions = await generateCategoryQuestions(
      body.category as QuestionCategory,
      {
        roleName: role?.name,
        techStack: (project?.techStack as string[]) ?? [],
        resumeText: candidate.resumeText ?? "",
        roleRequirements: role?.requirements ?? "",
      },
      remaining,
    );
  } catch (err) {
    if (libraryQuestions.length > 0) {
      return NextResponse.json({ questions: libraryQuestions });
    }
    const msg = err instanceof Error ? err.message : "Question generation failed.";
    return apiError(msg, 500);
  }

  return NextResponse.json({ questions: [...libraryQuestions, ...aiQuestions] });
}
