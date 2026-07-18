import {
  getPaidServiceExclusionCount,
  getTestCatalogTotals,
  PAID_SERVICE_EXCLUSIONS,
  TEST_CATALOG,
  TEST_CATALOG_BY_SUITE,
  TEST_COVERAGE_PLANNED,
} from "@/lib/quality/test-catalog";
import { SLA_THRESHOLD_MS } from "@/lib/quality/sla";

export function TestCoverageCatalog({ variant = "full" }: { variant?: "full" | "compact" }) {
  const totals = getTestCatalogTotals();
  const isCompact = variant === "compact";
  const paidExcluded = getPaidServiceExclusionCount();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-xl font-bold text-[var(--navy)] md:text-2xl">
          Test coverage catalog
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          {totals.automated} automated test cases across unit, E2E, role flows, and load.{" "}
          {paidExcluded} paid external-service scenarios are listed separately — they are not run live in CI
          and are excluded from the {SLA_THRESHOLD_MS / 1000}s SLA.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Automated tests", String(totals.automated)],
          ["Unit tests", String(totals.unit)],
          ["E2E & flow tests", String(totals.e2e)],
          ["Load scenarios", String(totals.load)],
          ["Paid service (excluded)", String(paidExcluded)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--cream-2)] bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
              {label}
            </p>
            <p className="font-serif mt-1 text-2xl font-bold text-[var(--navy)]">{value}</p>
          </div>
        ))}
      </div>

      {!isCompact ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--cream-2)] bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                <th className="px-4 py-3">Suite</th>
                <th className="px-4 py-3">Test cases</th>
                <th className="px-4 py-3">Run command</th>
              </tr>
            </thead>
            <tbody>
              {TEST_CATALOG_BY_SUITE.map((row) => (
                <tr key={row.suite} className="border-b border-[var(--cream-2)] last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-[var(--navy)]">{row.suite}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{row.count}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-[var(--cream)] px-2 py-0.5 text-xs text-[var(--navy)]">
                      {row.runCommand}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--cream-2)] bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Suite</th>
              <th className="px-4 py-3">Cases</th>
              {!isCompact ? <th className="px-4 py-3">Coverage</th> : null}
            </tr>
          </thead>
          <tbody>
            {(isCompact ? TEST_CATALOG.slice(0, 8) : TEST_CATALOG).map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--cream-2)] last:border-b-0">
                <td className="px-4 py-3 font-medium text-[var(--navy)]">{entry.module}</td>
                <td className="px-4 py-3 capitalize text-[var(--ink-soft)]">{entry.suiteType}</td>
                <td className="px-4 py-3 font-semibold text-[var(--navy)]">{entry.count}</td>
                {!isCompact ? (
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.coverage}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        id={isCompact ? undefined : "paid-service-exclusions"}
        className="scroll-mt-24 overflow-x-auto rounded-xl border border-[var(--orange)]/30 bg-[color-mix(in_srgb,var(--orange)_6%,white)]"
      >
        <div className="border-b border-[var(--orange)]/20 px-5 py-4">
          <h4 className="font-serif text-lg font-bold text-[var(--navy)]">
            Paid external services — not live-tested, SLA excluded
          </h4>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            These scenarios depend on billable third-party APIs. Automated runs use mocks or skip them entirely;
            they are documented here and do not count toward SLA pass/breach metrics.
          </p>
        </div>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--orange)]/20 bg-white/60 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">External service</th>
              {!isCompact ? <th className="px-4 py-3">Scenario</th> : null}
              <th className="px-4 py-3">SLA</th>
              {!isCompact ? <th className="px-4 py-3">CI behavior</th> : null}
            </tr>
          </thead>
          <tbody>
            {(isCompact ? PAID_SERVICE_EXCLUSIONS.slice(0, 4) : PAID_SERVICE_EXCLUSIONS).map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--orange)]/10 last:border-b-0 bg-white/40">
                <td className="px-4 py-3 font-medium text-[var(--navy)]">{entry.module}</td>
                <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.externalService}</td>
                {!isCompact ? (
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.scenario}</td>
                ) : null}
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-[var(--cream)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                    Excluded
                  </span>
                </td>
                {!isCompact ? (
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.ciBehavior}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {isCompact ? (
          <p className="border-t border-[var(--orange)]/20 px-5 py-3 text-center text-xs text-[var(--ink-faint)]">
            Showing 4 of {paidExcluded} ·{" "}
            <a href="/quality#paid-service-exclusions" className="font-semibold text-[var(--cyan-d)] hover:underline">
              View all paid-service exclusions →
            </a>
          </p>
        ) : null}
      </div>

      {isCompact ? (
        <p className="text-center text-xs text-[var(--ink-faint)]">
          Showing 8 of {TEST_CATALOG.length} modules ·{" "}
          <a href="/quality#coverage-catalog" className="font-semibold text-[var(--cyan-d)] hover:underline">
            View full catalog ({totals.automated} tests) →
          </a>
        </p>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--cream-2)] bg-[var(--cream)] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            Planned next (non-paid E2E gaps)
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
            {TEST_COVERAGE_PLANNED.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
