"use client";

import { useMemo, useState } from "react";
import type { LoadScenario, QualityStats } from "@/lib/quality-stats";
import { formatDuration, formatPassRate, statusColor } from "@/lib/quality-stats";
import { TestCoverageCatalog } from "@/components/quality/TestCoverageCatalog";
import { getPaidServiceExclusionCount, getTestCatalogTotals } from "@/lib/quality/test-catalog";

type ViewMode = "table" | "chart";

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status as "passed" | "failed" | "skipped");
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, white)`, color }}
    >
      {status}
    </span>
  );
}

function SummaryCards({ stats }: { stats: QualityStats }) {
  const catalogTotals = getTestCatalogTotals();
  const cards = [
    {
      label: "Automated tests",
      value: String(catalogTotals.automated),
      sub: "Unit, E2E, flow & load suites",
    },
    {
      label: "Paid svc excluded",
      value: String(getPaidServiceExclusionCount()),
      sub: "OpenAI / Graph — not live in CI",
    },
    {
      label: "Automation pass rate",
      value: formatPassRate(stats.summary.automationPassRate),
      sub: `${stats.summary.passedTests}/${stats.summary.totalTests} tests`,
    },
    {
      label: "Load test pass rate",
      value: formatPassRate(stats.summary.loadPassRate),
      sub: `${stats.load.scenarios.filter((s) => s.status === "passed").length}/${stats.load.scenarios.length} scenarios`,
    },
    {
      label: "Peak throughput",
      value: `${Math.max(...stats.load.scenarios.map((s) => s.requestsPerSec), 0).toFixed(0)} req/s`,
      sub: "at 50 virtual users",
    },
    {
      label: "Last verified",
      value: new Date(stats.generatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      sub: formatDuration(stats.summary.totalDurationMs) + " total run time",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[var(--cream-2)] bg-white px-5 py-4 shadow-sm"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            {card.label}
          </p>
          <p className="font-serif mt-1 text-[1.75rem] font-bold leading-none text-[var(--navy)]">
            {card.value}
          </p>
          <p className="mt-1.5 text-xs text-[var(--ink-soft)]">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

function AutomationTable({ stats }: { stats: QualityStats }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--cream-2)] bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            <th className="px-4 py-3">Suite</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Passed</th>
            <th className="px-4 py-3">Failed</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {stats.automation.suites.map((suite) => (
            <tr key={suite.id} className="border-b border-[var(--cream-2)] last:border-b-0">
              <td className="px-4 py-3 font-semibold text-[var(--navy)]">{suite.name}</td>
              <td className="px-4 py-3 capitalize text-[var(--ink-soft)]">{suite.type}</td>
              <td className="px-4 py-3 text-[var(--green)]">{suite.passed}</td>
              <td className="px-4 py-3 text-[var(--orange)]">{suite.failed}</td>
              <td className="px-4 py-3 text-[var(--ink-soft)]">
                {formatDuration(suite.durationMs)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={suite.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadTable({ scenarios }: { scenarios: LoadScenario[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--cream-2)] bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            <th className="px-4 py-3">Virtual users</th>
            <th className="px-4 py-3">Throughput</th>
            <th className="px-4 py-3">Avg response</th>
            <th className="px-4 py-3">P95</th>
            <th className="px-4 py-3">P99</th>
            <th className="px-4 py-3">Error rate</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => (
            <tr
              key={scenario.virtualUsers}
              className="border-b border-[var(--cream-2)] last:border-b-0"
            >
              <td className="px-4 py-3 font-semibold text-[var(--navy)]">
                {scenario.virtualUsers} users
              </td>
              <td className="px-4 py-3">{scenario.requestsPerSec} req/s</td>
              <td className="px-4 py-3">{scenario.avgResponseMs}ms</td>
              <td className="px-4 py-3">{scenario.p95ResponseMs}ms</td>
              <td className="px-4 py-3">{scenario.p99ResponseMs}ms</td>
              <td className="px-4 py-3">{scenario.errorRate}%</td>
              <td className="px-4 py-3">
                <StatusBadge status={scenario.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadChart({ scenarios }: { scenarios: LoadScenario[] }) {
  const maxP95 = useMemo(
    () => Math.max(...scenarios.map((s) => s.p95ResponseMs), 1),
    [scenarios],
  );
  const maxRps = useMemo(
    () => Math.max(...scenarios.map((s) => s.requestsPerSec), 1),
    [scenarios],
  );
  const chartW = 560;
  const chartH = 220;
  const pad = { top: 20, right: 20, bottom: 36, left: 48 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const points = scenarios.map((s, i) => {
    const x = pad.left + (i / Math.max(scenarios.length - 1, 1)) * innerW;
    const yP95 = pad.top + innerH - (s.p95ResponseMs / maxP95) * innerH;
    const yRps = pad.top + innerH - (s.requestsPerSec / maxRps) * innerH;
    return { ...s, x, yP95, yRps };
  });

  const line = (key: "yP95" | "yRps") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p[key]}`).join(" ");

  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[var(--cyan)]" />
          P95 response (ms)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[var(--green)]" />
          Throughput (req/s)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="h-auto w-full max-w-2xl"
        role="img"
        aria-label="Load test performance chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={pad.left}
              x2={chartW - pad.right}
              y1={y}
              y2={y}
              stroke="var(--cream-2)"
              strokeWidth="1"
            />
          );
        })}
        <path d={line("yP95")} fill="none" stroke="var(--cyan)" strokeWidth="2.5" />
        <path d={line("yRps")} fill="none" stroke="var(--green)" strokeWidth="2.5" />
        {points.map((p) => (
          <g key={p.virtualUsers}>
            <circle cx={p.x} cy={p.yP95} r="4" fill="var(--cyan)" />
            <circle cx={p.x} cy={p.yRps} r="4" fill="var(--green)" />
            <text
              x={p.x}
              y={chartH - 8}
              textAnchor="middle"
              className="fill-[var(--ink-faint)] text-[10px]"
            >
              {p.virtualUsers}u
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function AutomationChart({ stats }: { stats: QualityStats }) {
  const suites = stats.automation.suites.filter((s) => s.total > 0);
  const maxTotal = Math.max(...suites.map((s) => s.total), 1);

  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-white p-5">
      <p className="mb-4 text-xs font-semibold text-[var(--ink-soft)]">
        Test results by suite
      </p>
      <div className="space-y-4">
        {suites.map((suite) => {
          const passPct = (suite.passed / maxTotal) * 100;
          const failPct = (suite.failed / maxTotal) * 100;
          return (
            <div key={suite.id}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--navy)]">{suite.name}</span>
                <span className="text-[var(--ink-faint)]">
                  {suite.passed}/{suite.total} passed
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-[var(--cream-2)]">
                <div
                  className="bg-[var(--green)] transition-all"
                  style={{ width: `${passPct}%` }}
                />
                <div
                  className="bg-[var(--orange)] transition-all"
                  style={{ width: `${failPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QualityProofSection({ stats }: { stats: QualityStats }) {
  const [view, setView] = useState<ViewMode>("table");
  const [tab, setTab] = useState<"automation" | "load">("automation");

  if (stats.automation.suites.length === 0 && stats.load.scenarios.length === 0) {
    return null;
  }

  return (
    <section id="quality-proof" className="border-t border-[var(--cream-2)] bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-0.5 w-8 bg-[var(--cyan)]" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                Quality proof
              </span>
            </div>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-tight text-[var(--navy)]">
              Tested, measured, and verified
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
              Smoke, sanity, regression, and Playwright automations — plus load tests at 5, 10,
              15, 20, and 50 concurrent users. Transparent metrics for your organization.
            </p>
          </div>

          <div className="flex rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-1">
            {(["table", "chart"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-4 py-2 text-xs font-bold capitalize transition-colors ${
                  view === mode
                    ? "bg-white text-[var(--navy)] shadow-sm"
                    : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
                }`}
              >
                {mode} view
              </button>
            ))}
          </div>
        </div>

        <SummaryCards stats={stats} />

        <div className="mt-10 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-6 md:p-8">
          <TestCoverageCatalog variant="compact" />
        </div>

        <div className="mt-8 flex gap-2 border-b border-[var(--cream-2)]">
          {(["automation", "load"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "border-[var(--cyan)] text-[var(--navy)]"
                  : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
              }`}
            >
              {t} tests
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "automation" &&
            (view === "table" ? (
              <AutomationTable stats={stats} />
            ) : (
              <AutomationChart stats={stats} />
            ))}
          {tab === "load" &&
            (view === "table" ? (
              <LoadTable scenarios={stats.load.scenarios} />
            ) : (
              <LoadChart scenarios={stats.load.scenarios} />
            ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--ink-faint)]">
          Last updated {new Date(stats.generatedAt).toLocaleString()} ·{" "}
          {stats.load.scenarios.length} load scenarios · {stats.automation.suites.length} automation suites ·{" "}
          <a href="/quality" className="font-semibold text-[var(--cyan-d)] hover:underline">
            View full daily report →
          </a>
        </p>
      </div>
    </section>
  );
}
