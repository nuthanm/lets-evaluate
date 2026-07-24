import Link from "next/link";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import type { RecruiterPerformanceRow } from "@/lib/db/queries";

type PipelineFunnel = {
  screening: number;
  readyToBook: number;
  inInterview: number;
  selected: number;
  rejected: number;
  onHold: number;
};

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IcUsers() {
  return (
    <svg {...base}>
      <circle cx="7.5" cy="7" r="2.8" />
      <path d="M2 17c0-3 2.5-5.2 5.5-5.2S13 14 13 17" />
      <path d="M14.5 6a2.5 2.5 0 0 1 0 5M17.5 17c0-2.5-1.2-4.5-3-5.2" />
    </svg>
  );
}
function IcActive() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7" />
      <path d="m6.5 10 2.5 2.5 4-5" />
    </svg>
  );
}
function IcChart() {
  return (
    <svg {...base}>
      <path d="M3 15.5V10M7.5 15.5V5.5M12 15.5V9.5M16.5 15.5V7" />
      <path d="M1.5 17h17" />
    </svg>
  );
}

function hireRate(row: RecruiterPerformanceRow) {
  const decided = row.selected + row.rejected + row.screenedRejected;
  if (!decided) return null;
  return Math.round((row.selected / decided) * 100);
}

export function TaLeadDashboard({
  today,
  funnel,
  recruiters,
  recruiterCount,
}: {
  today: string;
  funnel: PipelineFunnel;
  recruiters: RecruiterPerformanceRow[];
  recruiterCount: number;
}) {
  const orgTotal = recruiters.reduce((sum, r) => sum + r.total, 0);
  const orgActive = recruiters.reduce((sum, r) => sum + r.inProgress, 0);
  const orgSelected = recruiters.reduce((sum, r) => sum + r.selected, 0);
  const idle = recruiters.filter((r) => r.total === 0 || r.inProgress === 0);

  return (
    <CabinetPage
      title="TA Lead dashboard"
      subtitle={`Recruiter performance · ${today}`}
      actions={
        <ButtonLink href="/candidates" className="px-5 py-2 text-[13px]">
          View all candidates
        </ButtonLink>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Recruiters" value={recruiterCount} icon={<IcUsers />} />
        <StatBlock
          label="Org candidates"
          value={orgTotal}
          icon={<IcChart />}
          variant="cyan"
        />
        <StatBlock
          label="In progress"
          value={orgActive}
          icon={<IcActive />}
          variant="orange"
        />
        <StatBlock
          label="Selected"
          value={orgSelected}
          icon={<IcCheck />}
          variant="green"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <CasePanel title="Org funnel" className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Screening", funnel.screening],
                ["Ready to book", funnel.readyToBook],
                ["In interview", funnel.inInterview],
                ["Selected", funnel.selected],
                ["Rejected", funnel.rejected],
                ["On hold", funnel.onHold],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                  {label}
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-[var(--ink)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </CasePanel>

        <CasePanel title="Coverage notes" className="p-5">
          <ul className="space-y-3 text-[13px] text-[var(--ink-soft)]">
            <li>
              All recruiters can see each other&apos;s candidates for PTO cover.
              Edits stay with the owning recruiter unless an admin hands off
              ownership.
            </li>
            <li>
              Use this view for hike conversations: workload, hire rate, and
              stalled pipelines.
            </li>
            {idle.length > 0 && (
              <li>
                <strong className="text-[var(--ink)]">{idle.length}</strong>{" "}
                recruiter{idle.length === 1 ? "" : "s"} with no active pipeline
                right now.
              </li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/pipeline" variant="ghost" className="px-4 py-2 text-[12px]">
              Org pipeline
            </ButtonLink>
            <ButtonLink
              href="/job-descriptions"
              variant="ghost"
              className="px-4 py-2 text-[12px]"
            >
              Job descriptions
            </ButtonLink>
          </div>
        </CasePanel>
      </div>

      <CasePanel title="Recruiter scorecard" className="overflow-hidden p-0">
        {recruiters.length === 0 ? (
          <p className="p-5 text-sm text-[var(--ink-faint)]">
            No TA or TA Lead members in this organisation yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-[11px] uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                  <th className="px-4 py-3 font-bold">Recruiter</th>
                  <th className="px-3 py-3 font-bold">Role</th>
                  <th className="px-3 py-3 font-bold">Total</th>
                  <th className="px-3 py-3 font-bold">Active</th>
                  <th className="px-3 py-3 font-bold">Selected</th>
                  <th className="px-3 py-3 font-bold">Rejected</th>
                  <th className="px-3 py-3 font-bold">Hold</th>
                  <th className="px-3 py-3 font-bold">Hire rate</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((row) => {
                  const rate = hireRate(row);
                  return (
                    <tr
                      key={row.userId}
                      className="border-b border-[var(--cream-2)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <FaceAvatar name={row.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--ink)]">
                              {row.name}
                            </p>
                            <p className="truncate text-[11px] text-[var(--ink-faint)]">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Pill variant={row.role === "ta_lead" ? "orange" : "cyan"}>
                          {row.role === "ta_lead" ? "TA Lead" : "TA"}
                        </Pill>
                      </td>
                      <td className="px-3 py-3 font-semibold">{row.total}</td>
                      <td className="px-3 py-3">{row.inProgress}</td>
                      <td className="px-3 py-3 text-[var(--green)]">{row.selected}</td>
                      <td className="px-3 py-3 text-[#c0392b]">
                        {row.rejected + row.screenedRejected}
                      </td>
                      <td className="px-3 py-3 text-[var(--orange)]">{row.hold}</td>
                      <td className="px-3 py-3">
                        {rate === null ? (
                          <span className="text-[var(--ink-faint)]">—</span>
                        ) : (
                          <span className="font-semibold">{rate}%</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[var(--cream-2)] px-4 py-3 text-[12px] text-[var(--ink-faint)]">
          Tip: open{" "}
          <Link href="/candidates" className="font-semibold text-[var(--cyan-d)]">
            Candidates
          </Link>{" "}
          and filter by recruiter to review a person&apos;s pipeline in detail.
        </div>
      </CasePanel>
    </CabinetPage>
  );
}
