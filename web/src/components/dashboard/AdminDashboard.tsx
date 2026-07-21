import Link from "next/link";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import { cn } from "@/lib/utils";
import { formatAuditAction } from "@/lib/audit/format-action";
import type { RoleCandidateStats } from "@/lib/db/queries";

type OpeningRole = {
  id: string;
  name: string;
  status: "open" | "closed";
  projectName?: string | null;
};

type InterviewerRow = {
  id: string;
  name: string;
  role: string;
  pending: number;
};

type AuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  payload: Record<string, unknown>;
  entityName: string | null;
  createdAt: string;
};

type BulkJobRow = {
  id: string;
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
};

type PipelineFunnel = {
  screening: number;
  readyToBook: number;
  inInterview: number;
  selected: number;
  rejected: number;
  onHold: number;
};

type TeamCounts = {
  admin: number;
  ta: number;
  interviewer: number;
  manager: number;
  hr: number;
};

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IcBriefcase() {
  return (
    <svg {...base}>
      <rect x="2.5" y="7" width="15" height="10" rx="2" />
      <path d="M6.5 7V5.5A2 2 0 0 1 8.5 3.5h3A2 2 0 0 1 13.5 5.5V7" />
    </svg>
  );
}
function IcUsers() {
  return (
    <svg {...base}>
      <circle cx="7.5" cy="7" r="2.8" />
      <path d="M2 17c0-3 2.5-5.2 5.5-5.2S13 14 13 17" />
      <path d="M14.5 6a2.5 2.5 0 0 1 0 5M17.5 17c0-2.5-1.2-4.5-3-5.2" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v3.8l2.5 2" />
    </svg>
  );
}
function IcCheckCircle() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7" />
      <path d="m6.5 10 2.5 2.5 4-5" />
    </svg>
  );
}
function IcAlert() {
  return (
    <svg {...base}>
      <path d="M10 3.5 2.8 16.5h14.4Z" />
      <path d="M10 9v3.5" />
      <circle cx="10" cy="14.5" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IcSpark() {
  return (
    <svg {...base}>
      <path d="M10 2.5v4M10 13.5v4M4.5 10h4M13.5 10h4M6.2 6.2l2.8 2.8M13.5 13.5l-2.8-2.8M6.2 13.8l2.8-2.8M13.5 6.5l-2.8 2.8" />
    </svg>
  );
}
function IcFolder() {
  return (
    <svg {...base}>
      <path d="M2.5 6.5A2 2 0 0 1 4.5 4.5h3.2l1.8 2H15a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function QuickLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="case-card group flex flex-col justify-between p-4 no-underline transition-all hover:shadow-sm"
    >
      <div className="text-[13px] font-bold text-[var(--ink)]">{label}</div>
      <div className="mt-1 text-[11px] text-[var(--ink-faint)]">{hint}</div>
      <span className="mt-3 text-[12px] font-semibold text-[var(--cyan-d)] group-hover:underline">
        Open →
      </span>
    </Link>
  );
}

function FunnelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[var(--ink)]">{label}</span>
        <span className="text-[var(--ink-faint)]">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--cream-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function AdminDashboard({
  today,
  stats,
  funnel,
  openings,
  roleStats,
  teamCounts,
  interviewers,
  overdueCount,
  scheduled,
  auditRows,
  bulkJobs,
  aiStats,
  setupRequired,
  projectCount,
}: {
  today: string;
  stats: {
    total: number;
    inProgress: number;
    selected: number;
    rejected: number;
    hold: number;
  };
  funnel: PipelineFunnel;
  openings: OpeningRole[];
  roleStats: Record<string, RoleCandidateStats>;
  teamCounts: TeamCounts;
  interviewers: InterviewerRow[];
  overdueCount: number;
  scheduled: {
    id: string;
    candidateName: string;
    interviewerName: string;
    dueAt: string;
    candidateId: string;
  }[];
  auditRows: AuditRow[];
  bulkJobs: BulkJobRow[];
  aiStats: {
    totalAnalyses: number;
    estimatedCostUsd: number;
    cacheHitRatePct: number;
    recommendationAgreementPct: number;
  };
  setupRequired: boolean;
  projectCount: number;
}) {
  const openRoles = openings.filter((r) => r.status === "open");
  const stalledRoles = openRoles.filter((r) => (roleStats[r.id]?.total ?? 0) === 0);
  const activeRoles = openRoles.filter((r) => (roleStats[r.id]?.inProgress ?? 0) > 0);
  const panelCount =
    teamCounts.interviewer + teamCounts.manager + teamCounts.hr;
  const teamTotal =
    teamCounts.admin +
    teamCounts.ta +
    panelCount;
  const activeBulkJobs = bulkJobs.filter((j) =>
    ["pending", "running", "processing"].includes(j.status),
  );

  const topOpenings = [...openRoles]
    .sort(
      (a, b) =>
        (roleStats[b.id]?.inProgress ?? 0) - (roleStats[a.id]?.inProgress ?? 0),
    )
    .slice(0, 5);

  const loadedInterviewers = [...interviewers]
    .filter((i) => i.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 4);

  const funnelTotal =
    funnel.screening +
    funnel.readyToBook +
    funnel.inInterview +
    funnel.selected +
    funnel.rejected +
    funnel.onHold;

  return (
    <CabinetPage
      title="Admin dashboard"
      subtitle={today}
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/openings" variant="ghost" className="px-4 py-2 text-[13px]">
            Openings board
          </ButtonLink>
          <ButtonLink href="/setup/projects" className="px-5 py-2 text-[13px]">
            Configuration
          </ButtonLink>
        </div>
      }
    >
      {setupRequired && (
        <div className="case-fade-in mb-5 overflow-hidden rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)]">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-xl" aria-hidden>
                ⚠
              </span>
              <div>
                <p className="text-[14px] font-bold text-[var(--ink)]">
                  Organisation setup required
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
                  Configure at least one project and one opening before your team
                  can start hiring.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <ButtonLink href="/setup/projects" variant="ghost" className="px-4 py-2 text-[12px] font-bold">
                Set up projects →
              </ButtonLink>
              <ButtonLink href="/setup/roles" variant="ghost" className="px-4 py-2 text-[12px] font-bold">
                Add openings →
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {(overdueCount > 0 || stalledRoles.length > 0) && (
        <div
          className={cn(
            "case-fade-in mb-5 flex items-center justify-between gap-4 rounded-xl border p-5",
            overdueCount > 0
              ? "border-[var(--orange)]/30 bg-gradient-to-r from-[var(--orange-soft)] to-white"
              : "border-[var(--cyan)]/25 bg-gradient-to-r from-[var(--cyan-soft)] to-white",
          )}
        >
          <div>
            <h2 className="font-serif text-xl font-bold">Needs attention</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
              {[
                overdueCount > 0 &&
                  `${overdueCount} overdue interview${overdueCount !== 1 ? "s" : ""}`,
                stalledRoles.length > 0 &&
                  `${stalledRoles.length} open role${stalledRoles.length !== 1 ? "s" : ""} with no candidates`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="font-serif text-[3rem] leading-none opacity-20 text-[var(--orange)]">
            {String(overdueCount + stalledRoles.length).padStart(2, "0")}
          </div>
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Organisation overview
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatBlock
            label="Open roles"
            value={openRoles.length}
            icon={<IcBriefcase />}
            variant="cyan"
          />
          <StatBlock
            label="Active cases"
            value={stats.inProgress}
            icon={<IcClock />}
            variant="cyan"
          />
          <StatBlock
            label="Selected"
            value={stats.selected}
            icon={<IcCheckCircle />}
            variant="green"
          />
          <StatBlock
            label="Rejected"
            value={stats.rejected}
            icon={<IcAlert />}
            variant="orange"
          />
          <StatBlock label="Team members" value={teamTotal} icon={<IcUsers />} />
          <StatBlock
            label="Panel members"
            value={panelCount}
            icon={<IcUsers />}
            className="hidden xl:block"
          />
        </div>
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CasePanel title="Hiring pipeline">
          <div className="space-y-3 p-4">
            <FunnelBar
              label="Screening"
              count={funnel.screening}
              total={funnelTotal}
              color="#23b0e6"
            />
            <FunnelBar
              label="Ready to schedule"
              count={funnel.readyToBook}
              total={funnelTotal}
              color="#1c8db8"
            />
            <FunnelBar
              label="In interview"
              count={funnel.inInterview}
              total={funnelTotal}
              color="#0f766e"
            />
            <FunnelBar
              label="Selected"
              count={funnel.selected}
              total={funnelTotal}
              color="#61a229"
            />
            <FunnelBar
              label="Rejected"
              count={funnel.rejected}
              total={funnelTotal}
              color="#e87722"
            />
            <FunnelBar
              label="On hold"
              count={funnel.onHold}
              total={funnelTotal}
              color="#94a3b8"
            />
          </div>
          <div className="border-t border-[var(--cream-2)] px-4 py-3 text-right">
            <Link href="/admin/candidates" className="text-xs font-semibold text-[var(--cyan-d)]">
              All candidates →
            </Link>
          </div>
        </CasePanel>

        <CasePanel title="Openings health">
          <div className="grid grid-cols-3 gap-px border-b border-[var(--cream-2)] bg-[var(--cream-2)]">
            {[
              { label: "Open", value: openRoles.length },
              { label: "With active cases", value: activeRoles.length },
              { label: "No candidates yet", value: stalledRoles.length },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-3 text-center">
                <div className="font-serif text-2xl text-[var(--ink)]">{item.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
          {topOpenings.length === 0 ? (
            <p className="p-5 text-sm text-[var(--ink-faint)]">No openings configured yet.</p>
          ) : (
            topOpenings.map((role) => {
              const s = roleStats[role.id] ?? {
                total: 0,
                inProgress: 0,
                selected: 0,
                rejected: 0,
                hold: 0,
              };
              return (
                <div key={role.id} className="case-row text-[13px]">
                  <strong>{role.name}</strong>
                  <span className="truncate text-[var(--ink-soft)]">
                    {role.projectName ?? `${projectCount} project${projectCount !== 1 ? "s" : ""}`}
                  </span>
                  <Pill variant={s.inProgress > 0 ? "cyan" : "neutral"}>
                    {s.inProgress} active
                  </Pill>
                  <span className="text-[11px] text-[var(--ink-faint)]">
                    {s.selected} hired · {s.total} total
                  </span>
                </div>
              );
            })
          )}
          <div className="border-t border-[var(--cream-2)] px-4 py-3 text-right">
            <Link href="/openings" className="text-xs font-semibold text-[var(--cyan-d)]">
              Openings board →
            </Link>
          </div>
        </CasePanel>
      </div>

      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          AI screening · last 30 days
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBlock
            label="Analyses run"
            value={aiStats.totalAnalyses}
            icon={<IcSpark />}
            variant="purple"
          />
          <StatBlock
            label="Est. cost (USD)"
            value={`$${aiStats.estimatedCostUsd.toFixed(2)}`}
            icon={<IcFolder />}
          />
          <StatBlock
            label="Cache hit rate"
            value={`${aiStats.cacheHitRatePct}%`}
            icon={<IcCheckCircle />}
            variant="teal"
          />
          <StatBlock
            label="AI agreement"
            value={
              aiStats.recommendationAgreementPct > 0
                ? `${aiStats.recommendationAgreementPct}%`
                : "—"
            }
            icon={<IcCheckCircle />}
            variant="green"
          />
        </div>
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CasePanel title="Panel capacity">
          {loadedInterviewers.length === 0 ? (
            <p className="p-5 text-sm text-[var(--ink-faint)]">
              No pending interviews assigned to panel members.
            </p>
          ) : (
            loadedInterviewers.map((iv) => (
              <div key={iv.id} className="case-row">
                <FaceAvatar name={iv.name} size="sm" />
                <strong>{iv.name}</strong>
                <Pill variant="neutral" className="capitalize">
                  {iv.role.replace(/_/g, " ")}
                </Pill>
                <Pill variant={iv.pending >= 3 ? "orange" : "cyan"}>
                  {iv.pending} pending
                </Pill>
              </div>
            ))
          )}
          <div className="border-t border-[var(--cream-2)] px-4 py-3 text-right">
            <Link href="/admin/employees" className="text-xs font-semibold text-[var(--cyan-d)]">
              Employee directory →
            </Link>
          </div>
        </CasePanel>

        <CasePanel title="Recent audit events">
          {auditRows.length === 0 ? (
            <p className="p-5 text-sm text-[var(--ink-faint)]">No audit events yet.</p>
          ) : (
            auditRows.map((row) => (
              <div key={row.id} className="case-row text-[13px]">
                <strong>{row.actorName ?? "System"}</strong>
                <span className="truncate text-[var(--ink-soft)]">
                  {formatAuditAction(row.action, row.payload)}
                </span>
                <span className="truncate text-[11px] text-[var(--ink-faint)]">
                  {row.entityName ?? "—"}
                </span>
                <span className="text-[11px] text-[var(--ink-faint)]">
                  {new Date(row.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))
          )}
          <div className="border-t border-[var(--cream-2)] px-4 py-3 text-right">
            <Link href="/setup/audit" className="text-xs font-semibold text-[var(--cyan-d)]">
              Full audit log →
            </Link>
          </div>
        </CasePanel>
      </div>

      {scheduled.length > 0 && (
        <section className="mb-5">
          <CasePanel title="Upcoming interviews">
            {scheduled.slice(0, 6).map((s) => (
              <div key={s.id} className="case-row">
                <strong>{s.candidateName}</strong>
                <span className="truncate text-[var(--ink-soft)]">
                  with {s.interviewerName}
                </span>
                <Pill variant="cyan">
                  {new Date(s.dueAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Pill>
                <ButtonLink
                  href={`/booking/${s.candidateId}`}
                  variant="ghost"
                  className="px-3 py-1 text-[11px]"
                >
                  Manage
                </ButtonLink>
              </div>
            ))}
          </CasePanel>
        </section>
      )}

      {activeBulkJobs.length > 0 && (
        <section className="mb-5">
          <CasePanel title="Bulk import jobs">
            {activeBulkJobs.map((job) => {
              const done = job.completedCount + job.failedCount;
              const pct =
                job.totalCount > 0
                  ? Math.round((done / job.totalCount) * 100)
                  : 0;
              return (
                <Link
                  key={job.id}
                  href={`/bulk-jobs/${job.id}`}
                  className="case-row no-underline transition-colors hover:bg-[var(--cream)]"
                >
                  <strong className="capitalize">{job.status}</strong>
                  <span className="text-[var(--ink-soft)]">
                    {done} / {job.totalCount} rows
                  </span>
                  <Pill variant="cyan">{pct}%</Pill>
                  <span className="text-[11px] text-[var(--ink-faint)]">
                    {new Date(job.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </Link>
              );
            })}
          </CasePanel>
        </section>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Quick links
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickLink href="/setup/projects" label="Configuration" hint="Projects, pipeline, templates" />
          <QuickLink href="/admin/candidates" label="All candidates" hint="Org-wide candidate directory" />
          <QuickLink href="/admin/employees" label="Office employees" hint="Admins, recruiters, and panel" />
          <QuickLink href="/setup/audit" label="Audit log" hint="Who changed what and when" />
        </div>
      </section>
    </CabinetPage>
  );
}
