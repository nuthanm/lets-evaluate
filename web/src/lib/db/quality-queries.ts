import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  qualityLoadScenarios,
  qualityTestCases,
  qualityTestRuns,
} from "@/lib/db/schema";
import type { LoadScenario, QualityStats } from "@/lib/quality-stats";
import type { ParsedTestCase } from "@/lib/quality/parse-results";
import { computeSlaStatus, SLA_THRESHOLD_MS, summarizeSlaStatuses } from "@/lib/quality/sla";

function toRateBps(rate: number) {
  return Math.round(Math.max(0, Math.min(1, rate)) * 10_000);
}

function runDateFromIso(iso: string) {
  return iso.slice(0, 10);
}

export async function persistQualityRun(input: {
  stats: QualityStats;
  cases: ParsedTestCase[];
  loadScenarios: LoadScenario[];
  runId: string;
  ciRef?: string;
}) {
  const db = getDb();
  const runDate = runDateFromIso(input.stats.generatedAt);

  const slaSummary = summarizeSlaStatuses(input.cases.map((c) => c.slaStatus));

  await db.insert(qualityTestRuns).values({
    id: input.runId,
    runDate,
    generatedAt: new Date(input.stats.generatedAt),
    environment: input.stats.environment,
    automationPassRate: toRateBps(input.stats.summary.automationPassRate),
    loadPassRate: toRateBps(input.stats.summary.loadPassRate),
    totalTests: input.stats.summary.totalTests,
    passedTests: input.stats.summary.passedTests,
    failedTests: input.stats.summary.failedTests,
    totalDurationMs: input.stats.summary.totalDurationMs,
    loadBaseUrl: input.stats.load.baseUrl,
    ciRef: input.ciRef ?? "",
    slaThresholdMs: SLA_THRESHOLD_MS,
    slaCompliantCount: slaSummary.compliant,
    slaBreachCount: slaSummary.breach,
  });

  if (input.cases.length > 0) {
    await db.insert(qualityTestCases).values(
      input.cases.map((testCase, index) => ({
        id: `${input.runId}-case-${index}`,
        runId: input.runId,
        featureArea: testCase.featureArea,
        suiteType: testCase.suiteType,
        testKey: testCase.testKey,
        name: testCase.name,
        status: testCase.status,
        durationMs: testCase.durationMs,
        errorMessage: testCase.errorMessage,
        slaStatus: testCase.slaStatus,
      })),
    );
  }

  if (input.loadScenarios.length > 0) {
    await db.insert(qualityLoadScenarios).values(
      input.loadScenarios.map((scenario, index) => ({
        id: `${input.runId}-load-${index}`,
        runId: input.runId,
        virtualUsers: scenario.virtualUsers,
        durationSec: scenario.durationSec,
        totalRequests: scenario.totalRequests,
        requestsPerSec: Math.round(scenario.requestsPerSec),
        avgResponseMs: scenario.avgResponseMs,
        p95ResponseMs: scenario.p95ResponseMs,
        p99ResponseMs: scenario.p99ResponseMs,
        errorRateBps: Math.round(scenario.errorRate * 100),
        status: scenario.status,
        slaStatus: computeSlaStatus(scenario.p95ResponseMs, scenario.status, "load"),
      })),
    );
  }
}

export async function listQualityRunDates(limit = 90) {
  const db = getDb();
  const runs = await db
    .select()
    .from(qualityTestRuns)
    .orderBy(desc(qualityTestRuns.generatedAt))
    .limit(500);

  const byDate = new Map<string, (typeof runs)[number] & { runs: number }>();

  for (const run of runs) {
    const existing = byDate.get(run.runDate);
    if (!existing) {
      byDate.set(run.runDate, { ...run, runs: 1 });
    } else {
      existing.runs += 1;
    }
  }

  return Array.from(byDate.values())
    .sort((a, b) => b.runDate.localeCompare(a.runDate))
    .slice(0, limit)
    .map((row) => ({
      runDate: row.runDate,
      runs: row.runs,
      latestGeneratedAt: row.generatedAt.toISOString(),
      passRate: row.totalTests ? row.passedTests / row.totalTests : 0,
    }));
}

export async function getLatestRunForDate(runDate: string) {
  const db = getDb();
  const [run] = await db
    .select()
    .from(qualityTestRuns)
    .where(eq(qualityTestRuns.runDate, runDate))
    .orderBy(desc(qualityTestRuns.generatedAt))
    .limit(1);

  if (!run) return null;

  const cases = await db
    .select()
    .from(qualityTestCases)
    .where(eq(qualityTestCases.runId, run.id))
    .orderBy(qualityTestCases.featureArea, qualityTestCases.name);

  const loadScenarios = await db
    .select()
    .from(qualityLoadScenarios)
    .where(eq(qualityLoadScenarios.runId, run.id))
    .orderBy(qualityLoadScenarios.virtualUsers);

  return { run, cases, loadScenarios };
}

export async function getQualityTrend(days = 30) {
  const db = getDb();
  const runs = await db
    .select()
    .from(qualityTestRuns)
    .orderBy(desc(qualityTestRuns.generatedAt))
    .limit(500);

  const byDate = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!byDate.has(run.runDate)) byDate.set(run.runDate, run);
  }

  return Array.from(byDate.values())
    .sort((a, b) => a.runDate.localeCompare(b.runDate))
    .slice(-days)
    .map((run) => ({
      runDate: run.runDate,
      automationPassRate: run.automationPassRate / 10_000,
      loadPassRate: run.loadPassRate / 10_000,
      testPassRate: run.totalTests ? run.passedTests / run.totalTests : 0,
      runs: 1,
    }));
}

export async function getLatestQualityStats(): Promise<QualityStats | null> {
  const db = getDb();
  const [run] = await db
    .select()
    .from(qualityTestRuns)
    .orderBy(desc(qualityTestRuns.generatedAt))
    .limit(1);

  if (!run) return null;

  const detail = await getLatestRunForDate(run.runDate);
  if (!detail) return null;

  const suiteTypes = ["unit", "smoke", "sanity", "regression"] as const;
  const suites = suiteTypes.map((type) => {
    const suiteCases = detail.cases.filter((c) => c.suiteType === type);
    const passed = suiteCases.filter((c) => c.status === "passed").length;
    const failed = suiteCases.filter((c) => c.status === "failed").length;
    const skipped = suiteCases.filter((c) => c.status === "skipped").length;
    const total = suiteCases.length;
    return {
      id: type === "unit" ? "unit" : `playwright-${type}`,
      name: type === "unit" ? "Unit (Vitest)" : `${type.charAt(0).toUpperCase()}${type.slice(1)} (Playwright)`,
      type: type as QualityStats["automation"]["suites"][number]["type"],
      status: (failed > 0 ? "failed" : total > 0 ? "passed" : "skipped") as QualityStats["automation"]["suites"][number]["status"],
      passed,
      failed,
      skipped,
      total,
      durationMs: suiteCases.reduce((s, c) => s + c.durationMs, 0),
      lastRun: run.generatedAt.toISOString(),
    };
  });

  return {
    generatedAt: run.generatedAt.toISOString(),
    environment: run.environment,
    summary: {
      automationPassRate: run.automationPassRate / 10_000,
      loadPassRate: run.loadPassRate / 10_000,
      totalTests: run.totalTests,
      passedTests: run.passedTests,
      failedTests: run.failedTests,
      totalDurationMs: run.totalDurationMs,
    },
    automation: { suites },
    load: {
      baseUrl: run.loadBaseUrl,
      scenarios: detail.loadScenarios.map((s) => ({
        virtualUsers: s.virtualUsers,
        durationSec: s.durationSec,
        totalRequests: s.totalRequests,
        requestsPerSec: s.requestsPerSec,
        avgResponseMs: s.avgResponseMs,
        p95ResponseMs: s.p95ResponseMs,
        p99ResponseMs: s.p99ResponseMs,
        errorRate: s.errorRateBps / 100,
        status: s.status,
      })),
    },
  };
}
