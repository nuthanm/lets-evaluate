/** Static inventory of automated test cases — single source of truth for public reports. */
export type TestCatalogEntry = {
  id: string;
  module: string;
  featureArea: string;
  suiteType: "unit" | "smoke" | "sanity" | "regression" | "flow" | "load";
  count: number;
  coverage: string;
  runCommand: string;
};

export const TEST_CATALOG: TestCatalogEntry[] = [
  {
    id: "auth-unit",
    module: "Auth & registration",
    featureArea: "auth",
    suiteType: "unit",
    count: 9,
    coverage: "Username, password strength, login normalization",
    runCommand: "npm test",
  },
  {
    id: "candidates-unit",
    module: "Candidate validation",
    featureArea: "candidates",
    suiteType: "unit",
    count: 8,
    coverage: "Name, email, resume length validation",
    runCommand: "npm test",
  },
  {
    id: "bulk-unit",
    module: "Bulk import",
    featureArea: "bulk",
    suiteType: "unit",
    count: 3,
    coverage: "CSV parsing, quoted fields, empty rows",
    runCommand: "npm test",
  },
  {
    id: "screening-unit",
    module: "Screening domain",
    featureArea: "screening",
    suiteType: "unit",
    count: 5,
    coverage: "Pipeline steps, retries, error classification",
    runCommand: "npm test",
  },
  {
    id: "proctoring-unit",
    module: "Proctoring policy",
    featureArea: "screening",
    suiteType: "unit",
    count: 4,
    coverage: "Strikes, disqualify, retry grants",
    runCommand: "npm test",
  },
  {
    id: "landing-smoke",
    module: "Landing & public pages",
    featureArea: "landing",
    suiteType: "smoke",
    count: 3,
    coverage: "Homepage, login, register load",
    runCommand: "npm run test:smoke",
  },
  {
    id: "landing-sanity",
    module: "Landing navigation",
    featureArea: "landing",
    suiteType: "sanity",
    count: 3,
    coverage: "Nav CTAs, workflow steps, login form",
    runCommand: "npm run test:sanity",
  },
  {
    id: "landing-regression",
    module: "Landing & quality UI",
    featureArea: "landing",
    suiteType: "regression",
    count: 4,
    coverage: "Stat grid, quality section, footer links",
    runCommand: "npm run test:regression",
  },
  {
    id: "rbac-regression",
    module: "RBAC (routes & APIs)",
    featureArea: "rbac",
    suiteType: "regression",
    count: 16,
    coverage: "8 protected pages + 8 APIs without session",
    runCommand: "npm run test:regression",
  },
  {
    id: "public-api-regression",
    module: "Public API guards",
    featureArea: "email",
    suiteType: "regression",
    count: 2,
    coverage: "Mail assets prefix, registration validation",
    runCommand: "npm run test:regression",
  },
  {
    id: "admin-flow",
    module: "Admin role flows",
    featureArea: "setup",
    suiteType: "flow",
    count: 18,
    coverage: "Setup, openings, candidates, pipeline, booking, library, jobs",
    runCommand: "npm run test:flow",
  },
  {
    id: "ta-flow",
    module: "TA role flows",
    featureArea: "candidates",
    suiteType: "flow",
    count: 11,
    coverage: "10 TA pages + setup access blocked",
    runCommand: "npm run test:flow",
  },
  {
    id: "panel-flow",
    module: "Panel roles (interviewer / manager / HR)",
    featureArea: "booking",
    suiteType: "flow",
    count: 21,
    coverage: "Assignments, library, archive per panel role",
    runCommand: "npm run test:flow",
  },
  {
    id: "api-flow",
    module: "Authenticated API performance",
    featureArea: "rbac",
    suiteType: "flow",
    count: 8,
    coverage: "Projects, roles, candidates, questions, AI stats APIs",
    runCommand: "npm run test:flow",
  },
  {
    id: "load",
    module: "Load & performance",
    featureArea: "load",
    suiteType: "load",
    count: 5,
    coverage: "5, 10, 15, 20, 50 concurrent virtual users",
    runCommand: "npm run test:load",
  },
];

export const TEST_CATALOG_BY_SUITE = [
  { suite: "Unit (Vitest)", suiteType: "unit", count: 29, runCommand: "npm test" },
  { suite: "Smoke (Playwright)", suiteType: "smoke", count: 3, runCommand: "npm run test:smoke" },
  { suite: "Sanity (Playwright)", suiteType: "sanity", count: 3, runCommand: "npm run test:sanity" },
  { suite: "Regression (Playwright)", suiteType: "regression", count: 22, runCommand: "npm run test:regression" },
  { suite: "Role flows (Playwright)", suiteType: "flow", count: 58, runCommand: "npm run test:flow" },
  { suite: "Load tests", suiteType: "load", count: 5, runCommand: "npm run test:load" },
] as const;

export const TEST_COVERAGE_PLANNED = [
  "Public screening portal UI (/screening/[token]) — proctoring & session flow",
  "Interview assignment booking + stage PDF report export",
  "Evaluate page end-to-end (upload → review UI, without live OpenAI)",
];

/** Scenarios that depend on paid external APIs — listed in reports, excluded from SLA. */
export type PaidServiceExclusion = {
  id: string;
  module: string;
  externalService: string;
  scenario: string;
  reason: string;
  ciBehavior: string;
};

export const PAID_SERVICE_EXCLUSIONS: PaidServiceExclusion[] = [
  {
    id: "resume-analysis",
    module: "Candidate evaluate · AI analysis",
    externalService: "OpenAI (GPT-4o / GPT-4o-mini)",
    scenario: "Resume extract + tech match scoring + recommendation",
    reason: "Each analysis bills per token; not run in automated CI.",
    ciBehavior: "AI_TEST_MODE returns deterministic mock metrics ($0).",
  },
  {
    id: "questions-standard",
    module: "Question library · standard generation",
    externalService: "OpenAI",
    scenario: "Generate standard interview questions for a role & stack",
    reason: "Paid completion API; no live generation in CI.",
    ciBehavior: "Mock question fixtures when OPENAI_API_KEY is cleared.",
  },
  {
    id: "questions-resume",
    module: "Question library · resume-based generation",
    externalService: "OpenAI",
    scenario: "Generate targeted questions from resume text",
    reason: "Paid completion API; not exercised end-to-end in CI.",
    ciBehavior: "Mock question fixtures in AI_TEST_MODE.",
  },
  {
    id: "questions-category",
    module: "Question library · category generation",
    externalService: "OpenAI",
    scenario: "Architecture, code, scenario, communication & behavioural questions",
    reason: "Multiple paid calls per category; excluded from automated runs.",
    ciBehavior: "Mock fixtures per category in AI_TEST_MODE.",
  },
  {
    id: "jd-generate",
    module: "Job descriptions · AI draft",
    externalService: "OpenAI",
    scenario: "POST /api/job-descriptions/generate",
    reason: "Long-form JD generation is token-heavy; skipped in CI.",
    ciBehavior: "Mock JD template returned when AI_TEST_MODE=1.",
  },
  {
    id: "screening-eval",
    module: "AI screening portal · answer evaluation",
    externalService: "OpenAI (+ Inngest worker)",
    scenario: "Grade screening answers and produce verdict",
    reason: "Requires live model + async worker; would incur cost per session.",
    ciBehavior: "Not run in test:quality; domain rules tested via unit tests only.",
  },
  {
    id: "bulk-pipeline-ai",
    module: "Bulk import · AI pipeline",
    externalService: "OpenAI (+ Inngest)",
    scenario: "Bulk analyze → generate questions → screening invite",
    reason: "Multi-step paid pipeline; no full E2E in CI.",
    ciBehavior: "CSV parsing & pipeline logic covered by unit tests only.",
  },
  {
    id: "interview-eval",
    module: "Interview stages · AI verdict",
    externalService: "OpenAI",
    scenario: "Evaluate panel interview answers for stage verdict",
    reason: "Paid evaluation per interview; not run in automated suite.",
    ciBehavior: "Evaluator returns placeholder when API key missing or mocked.",
  },
  {
    id: "graph-email",
    module: "Screening invites · automated email",
    externalService: "Microsoft Graph (Azure AD)",
    scenario: "Send screening invite via org Graph integration",
    reason: "Optional paid Azure integration; disabled unless org enables Graph.",
    ciBehavior: "Falls back to manual mailto / prepared draft (no external send).",
  },
];

export function getPaidServiceExclusionCount() {
  return PAID_SERVICE_EXCLUSIONS.length;
}

export function getTestCatalogTotals() {
  const unit = TEST_CATALOG.filter((e) => e.suiteType === "unit").reduce((s, e) => s + e.count, 0);
  const e2e = TEST_CATALOG.filter((e) => e.suiteType !== "unit" && e.suiteType !== "load").reduce(
    (s, e) => s + e.count,
    0,
  );
  const load = TEST_CATALOG.filter((e) => e.suiteType === "load").reduce((s, e) => s + e.count, 0);
  const automated = unit + e2e + load;
  const paidServiceExcluded = getPaidServiceExclusionCount();
  return { unit, e2e, load, automated, paidServiceExcluded, total: automated };
}
