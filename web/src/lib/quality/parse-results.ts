import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LoadScenario, QualityStats, SuiteStatus, AutomationSuiteType } from "@/lib/quality-stats";
import { inferFeatureArea } from "@/lib/quality/feature-areas";
import { computeSlaStatus } from "@/lib/quality/sla";

export type ParsedTestCase = {
  featureArea: string;
  suiteType: string;
  testKey: string;
  name: string;
  status: SuiteStatus;
  durationMs: number;
  errorMessage: string;
  slaStatus: import("@/lib/quality/sla").SlaStatus;
};

type PlaywrightReport = {
  suites?: Array<{
    title: string;
    file?: string;
    suites?: PlaywrightReport["suites"];
    specs?: Array<{
      title: string;
      file?: string;
      tests?: Array<{
        results?: Array<{ duration?: number; status?: string; error?: { message?: string } }>;
      }>;
    }>;
  }>;
};

type VitestReport = {
  testResults?: Array<{
    name: string;
    status: string;
    duration: number;
    assertionResults?: Array<{
      fullName: string;
      status: string;
      duration?: number;
      failureMessages?: string[];
    }>;
  }>;
};

function normalizeStatus(status: string | undefined): SuiteStatus {
  if (status === "passed") return "passed";
  if (status === "skipped" || status === "pending") return "skipped";
  return "failed";
}

function withSla(base: Omit<ParsedTestCase, "slaStatus">): ParsedTestCase {
  return {
    ...base,
    slaStatus: computeSlaStatus(base.durationMs, base.status, base.suiteType),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function parseVitestCases(resultsDir: string): ParsedTestCase[] {
  const reportPath = join(resultsDir, "vitest-report.json");
  if (!existsSync(reportPath)) return [];

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as VitestReport;
  const cases: ParsedTestCase[] = [];

  for (const fileResult of report.testResults ?? []) {
    const assertions = fileResult.assertionResults ?? [];
    if (assertions.length === 0) {
      cases.push(
        withSla({
          featureArea: inferFeatureArea({ filePath: fileResult.name, suiteType: "unit" }),
          suiteType: "unit",
          testKey: slugify(`unit-${fileResult.name}`),
          name: fileResult.name,
          status: normalizeStatus(fileResult.status),
          durationMs: Math.round(fileResult.duration ?? 0),
          errorMessage: "",
        }),
      );
      continue;
    }

    for (const assertion of assertions) {
      const name = assertion.fullName || fileResult.name;
      cases.push(
        withSla({
          featureArea: inferFeatureArea({ filePath: fileResult.name, testName: name, suiteType: "unit" }),
          suiteType: "unit",
          testKey: slugify(`unit-${fileResult.name}-${name}`),
          name,
          status: normalizeStatus(assertion.status),
          durationMs: Math.round(assertion.duration ?? 0),
          errorMessage: assertion.failureMessages?.[0]?.slice(0, 2000) ?? "",
        }),
      );
    }
  }

  return cases;
}

export function parsePlaywrightCases(resultsDir: string): ParsedTestCase[] {
  const reportPath = join(resultsDir, "playwright-report.json");
  if (!existsSync(reportPath)) return [];

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as PlaywrightReport;
  const cases: ParsedTestCase[] = [];

  function walkSuite(suite: NonNullable<PlaywrightReport["suites"]>[number], parentTitle = "") {
    const suiteTitle = [parentTitle, suite.title].filter(Boolean).join(" ");
    const filePath = suite.file ?? "";

    for (const spec of suite.specs ?? []) {
      const specTitle = [suiteTitle, spec.title].filter(Boolean).join(" › ");
      const specFile = spec.file ?? filePath;
      let suiteType = "e2e";
      if (/smoke/i.test(specTitle)) suiteType = "smoke";
      else if (/sanity/i.test(specTitle)) suiteType = "sanity";
      else if (/regression/i.test(specTitle)) suiteType = "regression";
      else if (/flow/i.test(specTitle) || /flows\//i.test(specFile)) suiteType = "flow";

      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          cases.push(
            withSla({
              featureArea: inferFeatureArea({
                filePath: specFile,
                suiteTitle: specTitle,
                suiteType,
              }),
              suiteType,
              testKey: slugify(`e2e-${specFile}-${specTitle}`),
              name: specTitle,
              status: normalizeStatus(result.status),
              durationMs: Math.round(result.duration ?? 0),
              errorMessage: result.error?.message?.slice(0, 2000) ?? "",
            }),
          );
        }
      }
    }

    for (const child of suite.suites ?? []) {
      walkSuite(child, suiteTitle);
    }
  }

  for (const suite of report.suites ?? []) {
    walkSuite(suite);
  }

  return cases;
}

export function parseLoadCases(scenarios: LoadScenario[]): ParsedTestCase[] {
  return scenarios.map((scenario) =>
    withSla({
      featureArea: "load",
      suiteType: "load",
      testKey: slugify(`load-${scenario.virtualUsers}-users`),
      name: `Load test · ${scenario.virtualUsers} virtual users (p95 ${scenario.p95ResponseMs}ms)`,
      status: scenario.status,
      durationMs: scenario.p95ResponseMs,
      errorMessage:
        scenario.status === "failed"
          ? `Error rate ${scenario.errorRate}% · p95 ${scenario.p95ResponseMs}ms`
          : "",
    }),
  );
}

export function buildQualityStatsFromCases(
  cases: ParsedTestCase[],
  load: { baseUrl: string; scenarios: LoadScenario[] },
  environment: string,
): QualityStats {
  const automationCases = cases.filter((c) => c.suiteType !== "load");
  const passedTests = automationCases.filter((c) => c.status === "passed").length;
  const failedTests = automationCases.filter((c) => c.status === "failed").length;
  const totalTests = automationCases.length;
  const totalDurationMs =
    cases.reduce((s, c) => s + c.durationMs, 0) +
    load.scenarios.reduce((s, sc) => s + sc.durationSec * 1000, 0);

  const suiteTypes = ["unit", "smoke", "sanity", "regression", "flow"] as const;
  const suites = suiteTypes.map((type) => {
    const suiteCases = automationCases.filter((c) => c.suiteType === type);
    const passed = suiteCases.filter((c) => c.status === "passed").length;
    const failed = suiteCases.filter((c) => c.status === "failed").length;
    const skipped = suiteCases.filter((c) => c.status === "skipped").length;
    const total = suiteCases.length;
    return {
      id:
        type === "unit"
          ? "unit"
          : type === "flow"
            ? "playwright-flow"
            : `playwright-${type}`,
      name:
        type === "unit"
          ? "Unit (Vitest)"
          : type === "flow"
            ? "Role flows (Playwright)"
            : `${type.charAt(0).toUpperCase()}${type.slice(1)} (Playwright)`,
      type: type as AutomationSuiteType,
      status: (failed > 0 ? "failed" : total > 0 ? "passed" : "skipped") as SuiteStatus,
      passed,
      failed,
      skipped,
      total,
      durationMs: suiteCases.reduce((s, c) => s + c.durationMs, 0),
      lastRun: new Date().toISOString(),
    };
  });

  const automationPassed = suites.filter((s) => s.status === "passed").length;
  const automationTotal = suites.filter((s) => s.status !== "skipped").length;
  const loadPassed = load.scenarios.filter((s) => s.status === "passed").length;
  const loadTotal = load.scenarios.length;

  return {
    generatedAt: new Date().toISOString(),
    environment,
    summary: {
      automationPassRate: automationTotal ? automationPassed / automationTotal : 0,
      loadPassRate: loadTotal ? loadPassed / loadTotal : 0,
      totalTests,
      passedTests,
      failedTests,
      totalDurationMs,
    },
    automation: { suites },
    load,
  };
}
