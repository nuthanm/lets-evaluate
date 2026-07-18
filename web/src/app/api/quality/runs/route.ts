import { NextResponse } from "next/server";
import { getLatestRunForDate } from "@/lib/db/quality-queries";
import { FEATURE_LABELS, type FeatureArea } from "@/lib/quality/feature-areas";
import { computeSlaStatus, SLA_THRESHOLD_MS, slaLabel, summarizeSlaStatuses } from "@/lib/quality/sla";
import { getPaidServiceExclusionCount } from "@/lib/quality/test-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runDate = searchParams.get("date");

  if (!runDate) {
    return NextResponse.json({ error: "date query parameter is required (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const detail = await getLatestRunForDate(runDate);
    if (!detail) {
      return NextResponse.json({ error: "No run found for this date" }, { status: 404 });
    }

    const { run, cases, loadScenarios } = detail;
    const caseRows = cases.map((testCase) => {
      const slaStatus = computeSlaStatus(testCase.durationMs, testCase.status, testCase.suiteType);
      return {
        id: testCase.id,
        featureArea: testCase.featureArea,
        featureLabel: FEATURE_LABELS[testCase.featureArea as FeatureArea] ?? testCase.featureArea,
        suiteType: testCase.suiteType,
        testKey: testCase.testKey,
        name: testCase.name,
        status: testCase.status,
        durationMs: testCase.durationMs,
        errorMessage: testCase.errorMessage,
        slaStatus,
        slaLabel: slaLabel(slaStatus),
      };
    });
    const loadRows = loadScenarios.map((scenario) => {
      const slaStatus = computeSlaStatus(scenario.p95ResponseMs, scenario.status, "load");
      return {
        virtualUsers: scenario.virtualUsers,
        durationSec: scenario.durationSec,
        totalRequests: scenario.totalRequests,
        requestsPerSec: scenario.requestsPerSec,
        avgResponseMs: scenario.avgResponseMs,
        p95ResponseMs: scenario.p95ResponseMs,
        p99ResponseMs: scenario.p99ResponseMs,
        errorRate: scenario.errorRateBps / 100,
        status: scenario.status,
        slaStatus,
        slaLabel: slaLabel(slaStatus),
      };
    });
    const slaSummary = summarizeSlaStatuses([
      ...caseRows.map((row) => row.slaStatus),
      ...loadRows.map((row) => row.slaStatus),
    ]);
    const featureSummary = Object.entries(
      cases.reduce<Record<string, { passed: number; failed: number; skipped: number; total: number }>>(
        (acc, testCase) => {
          const bucket = acc[testCase.featureArea] ?? { passed: 0, failed: 0, skipped: 0, total: 0 };
          bucket.total += 1;
          if (testCase.status === "passed") bucket.passed += 1;
          else if (testCase.status === "failed") bucket.failed += 1;
          else bucket.skipped += 1;
          acc[testCase.featureArea] = bucket;
          return acc;
        },
        {},
      ),
    ).map(([featureArea, counts]) => ({
      featureArea,
      label: FEATURE_LABELS[featureArea as FeatureArea] ?? featureArea,
      ...counts,
    }));

    return NextResponse.json({
      run: {
        id: run.id,
        runDate: run.runDate,
        generatedAt: run.generatedAt.toISOString(),
        environment: run.environment,
        automationPassRate: run.automationPassRate / 10_000,
        loadPassRate: run.loadPassRate / 10_000,
        totalTests: run.totalTests,
        passedTests: run.passedTests,
        failedTests: run.failedTests,
        totalDurationMs: run.totalDurationMs,
        loadBaseUrl: run.loadBaseUrl,
        ciRef: run.ciRef,
        slaThresholdMs: run.slaThresholdMs,
        slaCompliantCount: slaSummary.compliant,
        slaBreachCount: slaSummary.breach,
        slaExcludedCount: slaSummary.excluded,
        paidServiceExcludedCount: getPaidServiceExclusionCount(),
      },
      cases: caseRows,
      loadScenarios: loadRows,
      slaThresholdMs: run.slaThresholdMs ?? SLA_THRESHOLD_MS,
      slaSummary,
      paidServiceExcludedCount: getPaidServiceExclusionCount(),
      featureSummary,
    });
  } catch (error) {
    console.error("[quality/runs]", error);
    return NextResponse.json({ error: "Failed to load quality run" }, { status: 500 });
  }
}
