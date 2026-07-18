"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { formatDuration, formatPassRate, statusColor } from "@/lib/quality-stats";
import { SLA_THRESHOLD_MS, slaColor, slaLabel, type SlaStatus } from "@/lib/quality/sla";
import { TestCoverageCatalog } from "@/components/quality/TestCoverageCatalog";
import { getPaidServiceExclusionCount, getTestCatalogTotals } from "@/lib/quality/test-catalog";

type TrendPoint = {
  runDate: string;
  automationPassRate: number;
  loadPassRate: number;
  testPassRate: number;
  runs: number;
};

type RunDateOption = {
  runDate: string;
  runs: number;
  passRate: number;
};

type TestCaseRow = {
  id: string;
  featureArea: string;
  featureLabel: string;
  suiteType: string;
  name: string;
  status: string;
  durationMs: number;
  errorMessage: string;
  slaStatus: SlaStatus;
  slaLabel: string;
};

type RunDetail = {
  run: {
    runDate: string;
    generatedAt: string;
    environment: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDurationMs: number;
    automationPassRate: number;
    loadPassRate: number;
    slaThresholdMs: number;
    slaCompliantCount: number;
    slaBreachCount: number;
    slaExcludedCount?: number;
  };
  cases: TestCaseRow[];
  slaThresholdMs: number;
  featureSummary: Array<{
    featureArea: string;
    label: string;
    passed: number;
    failed: number;
    total: number;
  }>;
};

function SlaBadge({ status }: { status: SlaStatus }) {
  const color = slaColor(status);
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, white)`, color }}
    >
      {slaLabel(status)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status as "passed" | "failed" | "skipped");
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, white)`, color }}
    >
      {status}
    </span>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const chartW = 900;
  const chartH = 260;
  const pad = { top: 24, right: 24, bottom: 42, left: 48 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const points = trend.map((point, index) => {
    const x = pad.left + (trend.length <= 1 ? innerW / 2 : (index / (trend.length - 1)) * innerW);
    const yTest = pad.top + innerH - point.testPassRate * innerH;
    const yAuto = pad.top + innerH - point.automationPassRate * innerH;
    const yLoad = pad.top + innerH - point.loadPassRate * innerH;
    return { ...point, x, yTest, yAuto, yLoad };
  });

  const line = (key: "yTest" | "yAuto" | "yLoad") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p[key]}`).join(" ");

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cream-2)] bg-white p-8 text-center text-sm text-[var(--ink-faint)]">
        No historical runs yet. Execute <code className="text-[var(--navy)]">npm run test:quality</code> to
        publish the first day of results.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-white p-5">
      <div className="mb-4 flex flex-wrap gap-4 text-xs font-semibold text-[var(--ink-soft)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[var(--cyan)]" />
          Test pass rate
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[var(--green)]" />
          Automation suites
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[var(--orange)]" />
          Load scenarios
        </span>
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-auto w-full" role="img" aria-label="Quality trend">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={chartW - pad.right} y1={y} y2={y} stroke="var(--cream-2)" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">
                {Math.round(t * 100)}%
              </text>
            </g>
          );
        })}
        <path d={line("yTest")} fill="none" stroke="var(--cyan)" strokeWidth="2.5" />
        <path d={line("yAuto")} fill="none" stroke="var(--green)" strokeWidth="2" strokeDasharray="6 4" />
        <path d={line("yLoad")} fill="none" stroke="var(--orange)" strokeWidth="2" strokeDasharray="6 4" />
        {points.map((p) => (
          <g key={p.runDate}>
            <circle cx={p.x} cy={p.yTest} r="4" fill="var(--cyan)" />
            <text x={p.x} y={chartH - 10} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">
              {p.runDate.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function QualityDashboardClient({
  brandOrgName,
  initialDate,
  initialDates,
  initialTrend,
  initialDetail,
}: {
  brandOrgName: string;
  initialDate: string;
  initialDates: RunDateOption[];
  initialTrend: TrendPoint[];
  initialDetail: RunDetail | null;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dates, setDates] = useState(initialDates);
  const [trend, setTrend] = useState(initialTrend);
  const [detail, setDetail] = useState<RunDetail | null>(initialDetail);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDate() {
      setLoading(true);
      try {
        const res = await fetch(`/api/quality/runs?date=${selectedDate}`);
        if (!res.ok) {
          if (!cancelled) setDetail(null);
          return;
        }
        const data = (await res.json()) as RunDetail;
        if (!cancelled) setDetail(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (selectedDate !== initialDate || !initialDetail) {
      loadDate();
    }
    return () => {
      cancelled = true;
    };
  }, [selectedDate, initialDate, initialDetail]);

  useEffect(() => {
    fetch("/api/quality/trend?days=30")
      .then((r) => r.json())
      .then((data: { trend: TrendPoint[] }) => setTrend(data.trend ?? []))
      .catch(() => undefined);
    fetch("/api/quality/dates")
      .then((r) => r.json())
      .then((data: { dates: RunDateOption[] }) => {
        if (data.dates?.length) setDates(data.dates);
      })
      .catch(() => undefined);
  }, []);

  const filteredCases = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!detail || !q) return detail?.cases ?? [];
    return detail.cases.filter(
      (testCase) =>
        testCase.name.toLowerCase().includes(q) ||
        testCase.featureLabel.toLowerCase().includes(q) ||
        testCase.suiteType.toLowerCase().includes(q),
    );
  }, [detail, filter]);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <LandingNav />

      <section className="border-b border-[var(--cream-2)] bg-white px-6 py-12 md:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-0.5 w-8 bg-[var(--cyan)]" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Public quality report
            </span>
          </div>
          <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-bold leading-tight text-[var(--navy)]">
            Test confidence, published daily
          </h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-[var(--ink-soft)]">
            {brandOrgName} runs smoke, sanity, regression, role-based flow, unit, and load tests across every
            major workflow. Standard SLA: {SLA_THRESHOLD_MS / 1000}s response time for E2E, flow, and load tests
            (unit tests and paid external-service scenarios are excluded). Select any day to inspect test cases.
          </p>
        </div>
      </section>

      <section className="px-6 py-10 md:px-14">
        <div className="mx-auto max-w-6xl space-y-8">
          <div id="coverage-catalog" className="scroll-mt-24 rounded-xl border border-[var(--cream-2)] bg-white p-6 md:p-8">
            <TestCoverageCatalog variant="full" />
          </div>

          <div>
            <h2 className="mb-4 font-serif text-2xl font-bold text-[var(--navy)]">Progress over time</h2>
            <TrendChart trend={trend} />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label htmlFor="run-date" className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Select date
              </label>
              <select
                id="run-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2 min-w-[220px] rounded-lg border border-[var(--cream-2)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--navy)]"
              >
                {(dates.length ? dates : [{ runDate: selectedDate, runs: 0, passRate: 0 }]).map((option) => (
                  <option key={option.runDate} value={option.runDate}>
                    {option.runDate}
                    {option.runs ? ` · ${formatPassRate(option.passRate)} · ${option.runs} run${option.runs === 1 ? "" : "s"}` : " · no runs yet"}
                  </option>
                ))}
              </select>
            </div>

            {detail?.run && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {[
                  ["Automated tests", String(getTestCatalogTotals().automated)],
                  ["Paid svc excluded", String(getPaidServiceExclusionCount())],
                  ["Tests passed", `${detail.run.passedTests}/${detail.run.totalTests}`],
                  ["SLA measured", String((detail.run.slaCompliantCount ?? 0) + (detail.run.slaBreachCount ?? 0))],
                  ["Within SLA", String(detail.run.slaCompliantCount)],
                  ["SLA breach", String(detail.run.slaBreachCount)],
                  ["Duration", formatDuration(detail.run.totalDurationMs)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[var(--cream-2)] bg-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">{label}</p>
                    <p className="font-serif text-xl font-bold text-[var(--navy)]">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {detail?.featureSummary?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {detail.featureSummary.map((feature) => (
                <div key={feature.featureArea} className="rounded-xl border border-[var(--cream-2)] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--navy)]">{feature.label}</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {feature.passed}/{feature.total} passed
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-2xl font-bold text-[var(--navy)]">All test cases</h2>
              <input
                type="search"
                placeholder="Filter by name, feature, or suite…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-[var(--cream-2)] bg-white px-4 py-2 text-sm"
              />
            </div>

            {loading ? (
              <p className="text-sm text-[var(--ink-faint)]">Loading run details…</p>
            ) : filteredCases.length === 0 ? (
              <p className="rounded-xl border border-[var(--cream-2)] bg-white p-8 text-center text-sm text-[var(--ink-faint)]">
                No test cases for this date yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--cream-2)] bg-white">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Suite</th>
                      <th className="px-4 py-3">Test case</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">SLA (≤{detail?.slaThresholdMs ?? SLA_THRESHOLD_MS}ms)</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((testCase) => (
                      <tr key={testCase.id} className="border-b border-[var(--cream-2)] last:border-b-0">
                        <td className="px-4 py-3 font-medium text-[var(--navy)]">{testCase.featureLabel}</td>
                        <td className="px-4 py-3 capitalize text-[var(--ink-soft)]">{testCase.suiteType}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--navy)]">{testCase.name}</div>
                          {testCase.errorMessage ? (
                            <div className="mt-1 text-xs text-[var(--orange)]">{testCase.errorMessage}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink-soft)]">{formatDuration(testCase.durationMs)}</td>
                        <td className="px-4 py-3">
                          <SlaBadge status={testCase.slaStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={testCase.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[var(--ink-faint)]">
            <Link href="/" className="text-[var(--cyan-d)] hover:underline">
              ← Back to home
            </Link>
            {detail?.run ? (
              <>
                {" · "}
                Last run {new Date(detail.run.generatedAt).toLocaleString()} · {detail.run.environment}
                {detail.run.environment.includes("AI mocked") ? (
                  <span className="text-[var(--green)]"> · OpenAI not billed</span>
                ) : null}
              </>
            ) : null}
          </p>
        </div>
      </section>
    </main>
  );
}
