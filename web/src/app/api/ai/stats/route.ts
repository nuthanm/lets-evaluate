import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { aiAnalysisUsage, screeningFeedback } from "@/lib/db/schema";

type Bucket = {
  totalAnalyses: number;
  reusedAnalyses: number;
  freshAnalyses: number;
  estimatedCostUsd: number;
  extractionPromptTokens: number;
  extractionCompletionTokens: number;
  analysisPromptTokens: number;
  analysisCompletionTokens: number;
  cacheReadTokens: number;
};

function initBucket(): Bucket {
  return {
    totalAnalyses: 0,
    reusedAnalyses: 0,
    freshAnalyses: 0,
    estimatedCostUsd: 0,
    extractionPromptTokens: 0,
    extractionCompletionTokens: 0,
    analysisPromptTokens: 0,
    analysisCompletionTokens: 0,
    cacheReadTokens: 0,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usageRows = await db
    .select()
    .from(aiAnalysisUsage)
    .where(
      and(
        eq(aiAnalysisUsage.organizationId, session.user.organizationId),
        gte(aiAnalysisUsage.createdAt, since),
      ),
    );

  const b = initBucket();
  for (const row of usageRows) {
    b.totalAnalyses += 1;
    if (row.reusedAnalysis) b.reusedAnalyses += 1;
    else b.freshAnalyses += 1;
    b.estimatedCostUsd += Number(row.estimatedCostUsd || "0") || 0;
    b.extractionPromptTokens += row.extractionPromptTokens;
    b.extractionCompletionTokens += row.extractionCompletionTokens;
    b.analysisPromptTokens += row.analysisPromptTokens;
    b.analysisCompletionTokens += row.analysisCompletionTokens;
    b.cacheReadTokens += row.cacheReadTokens;
  }

  const feedbackRows = await db
    .select()
    .from(screeningFeedback)
    .where(eq(screeningFeedback.organizationId, session.user.organizationId));

  let feedbackCount = 0;
  let recommendationAgreed = 0;
  let closedOutcomes = 0;
  for (const row of feedbackRows) {
    const model = (row.modelRecommendation || "").toLowerCase();
    const recruiter = (row.recruiterDecision || "").toLowerCase();
    if (model && recruiter) {
      feedbackCount += 1;
      if (model === recruiter) recommendationAgreed += 1;
    }
    if (row.finalOutcome) closedOutcomes += 1;
  }

  const recommendationAgreementPct = feedbackCount
    ? Math.round((recommendationAgreed / feedbackCount) * 10000) / 100
    : 0;

  return NextResponse.json({
    window: "last_30_days",
    usage: {
      ...b,
      estimatedCostUsd: Number(b.estimatedCostUsd.toFixed(6)),
      avgCostUsdPerAnalysis: b.totalAnalyses
        ? Number((b.estimatedCostUsd / b.totalAnalyses).toFixed(6))
        : 0,
      cacheHitRatePct: b.totalAnalyses
        ? Math.round((b.reusedAnalyses / b.totalAnalyses) * 10000) / 100
        : 0,
    },
    feedback: {
      rows: feedbackRows.length,
      comparableRows: feedbackCount,
      recommendationAgreementPct,
      closedOutcomes,
    },
  });
}
