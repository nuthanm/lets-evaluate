export type SuiteStatus = "passed" | "failed" | "skipped";

export type AutomationSuiteType = "smoke" | "sanity" | "regression" | "unit" | "playwright" | "flow";

export type AutomationSuite = {
  id: string;
  name: string;
  type: AutomationSuiteType;
  status: SuiteStatus;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  lastRun: string;
};

export type LoadScenario = {
  virtualUsers: number;
  durationSec: number;
  totalRequests: number;
  requestsPerSec: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  errorRate: number;
  status: SuiteStatus;
};

export type QualityStats = {
  generatedAt: string;
  environment: string;
  summary: {
    automationPassRate: number;
    loadPassRate: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDurationMs: number;
  };
  automation: {
    suites: AutomationSuite[];
  };
  load: {
    baseUrl: string;
    scenarios: LoadScenario[];
  };
};

export function formatPassRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

export function statusColor(status: SuiteStatus): string {
  switch (status) {
    case "passed":
      return "var(--green)";
    case "failed":
      return "var(--orange)";
    default:
      return "var(--ink-faint)";
  }
}
