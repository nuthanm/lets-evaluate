import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidateStages, candidates, projects, roles, screenings, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError } from "@/lib/api/helpers";
import { readReport, storeReport } from "@/lib/storage/reports";
import { buildInterviewReportPdf, PDF_REPORT_VERSION } from "@/lib/report/pdf";

type Params = { params: Promise<{ id: string }> };

/** Stream the stored PDF evaluation report for a completed round.
 *  If the file is missing from storage (e.g. wiped between dev restarts),
 *  the report is regenerated on-the-fly from the stage data in the DB. */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;
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
  if (!stage.reportKey && !stage.decision)
    return apiError("No report available", 404);

  // --- Use stored file only if it matches the current report version ---
  if (stage.reportKey && stage.reportFilename?.endsWith(`-v${PDF_REPORT_VERSION}.pdf`)) {
    try {
      const buf = await readReport(stage.reportKey);
      const filename = stage.reportFilename ?? "evaluation-report.pdf";
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      // File missing — fall through to regeneration below.
    }
  }

  const roundLabel = stage.label?.trim() || "Interview round";

  // --- Regenerate the PDF from the stage data ---
  try {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, stage.candidateId))
      .limit(1);
    if (!candidate) return apiError("Candidate not found", 404);

    const [[project], [role], [screening], [interviewer]] = await Promise.all([
      candidate.projectId
        ? db.select().from(projects).where(eq(projects.id, candidate.projectId)).limit(1)
        : Promise.resolve([null]),
      candidate.roleId
        ? db.select().from(roles).where(eq(roles.id, candidate.roleId)).limit(1)
        : Promise.resolve([null]),
      db.select().from(screenings).where(eq(screenings.candidateId, stage.candidateId)).limit(1),
      stage.decidedById
        ? db.select({ name: users.name }).from(users).where(eq(users.id, stage.decidedById)).limit(1)
        : Promise.resolve([null]),
    ]);

    const metrics = (screening?.metrics as Record<string, unknown> | null) ?? {};
    const score = metrics.tech_match_score;
    const questions = (stage.questions as {
      category?: string; question: string; code?: string;
      difficulty?: string; satisfaction?: string; notes?: string;
    }[]) ?? [];

    const pdf = await buildInterviewReportPdf({
      candidateName: candidate.name,
      role: role?.name ?? "Role",
      projectName: project?.name ?? undefined,
      round: roundLabel,
      assessorRole: stage.kind,
      interviewerName: interviewer?.name ?? "Interviewer",
      decision: stage.decision ?? "no",
      justification: stage.comments ?? "",
      generatedAt: stage.decidedAt ?? new Date(),
      techMatchScore: typeof score === "number" ? Math.round(score) : null,
      aiRecommendation:
        typeof metrics.recommendation === "string" ? metrics.recommendation : undefined,
      aiSummary: typeof metrics.summary === "string" ? metrics.summary : undefined,
      strengths: Array.isArray(metrics.strengths) ? (metrics.strengths as string[]) : [],
      concerns: Array.isArray(metrics.concerns) ? (metrics.concerns as string[]) : [],
      questions: questions.map((q) => ({
        category: q.category ?? "",
        question: q.question,
        code: q.code ?? "",
        difficulty: q.difficulty ?? "",
        satisfaction: q.satisfaction ?? "",
        notes: q.notes ?? "",
      })),
    });

    // Persist so subsequent downloads don't regenerate.
    const safeName = candidate.name.replace(/[^a-z0-9]+/gi, "-");
    const filename = `${safeName}-${roundLabel.replace(/[^a-z0-9]+/gi, "-")}-report-v${PDF_REPORT_VERSION}.pdf`;
    try {
      const newKey = await storeReport(pdf, filename);
      await db
        .update(candidateStages)
        .set({ reportKey: newKey, reportFilename: filename, updatedAt: new Date() })
        .where(eq(candidateStages.id, stageId));
    } catch {
      // Storage write failed — still serve the freshly generated PDF.
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Report regeneration failed", err);
    // Fallback: if an older stored report exists, serve it instead of returning 500.
    if (stage.reportKey) {
      try {
        const buf = await readReport(stage.reportKey);
        const filename = stage.reportFilename ?? "evaluation-report.pdf";
        return new Response(new Uint8Array(buf), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "private, no-store",
          },
        });
      } catch {
        // If fallback read also fails, return the existing 500 below.
      }
    }
    return apiError("Report unavailable", 500);
  }
}
