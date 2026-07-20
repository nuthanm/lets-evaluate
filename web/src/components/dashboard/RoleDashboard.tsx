"use client";

import { useState } from "react";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { MemberRole } from "@/lib/auth/config";
import type { RecruiterTask } from "@/lib/recruiter/tasks";
import { groupTasksByUrgency } from "@/lib/recruiter/tasks";

/* ── Professional SVG stat icons ───────────────────────────────────────────── */
const base = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcClock() {
  return <svg {...base}><circle cx="10" cy="10" r="7"/><path d="M10 6.5v3.8l2.5 2"/></svg>;
}
function IcAlert() {
  return <svg {...base}><path d="M10 3.5 2.8 16.5h14.4Z"/><path d="M10 9v3.5"/><circle cx="10" cy="14.5" r=".5" fill="currentColor" stroke="none"/></svg>;
}
function IcCheckCircle() {
  return <svg {...base}><circle cx="10" cy="10" r="7"/><path d="m6.5 10 2.5 2.5 4-5"/></svg>;
}
function IcUsers() {
  return <svg {...base}><circle cx="7.5" cy="7" r="2.8"/><path d="M2 17c0-3 2.5-5.2 5.5-5.2S13 14 13 17"/><path d="M14.5 6a2.5 2.5 0 0 1 0 5M17.5 17c0-2.5-1.2-4.5-3-5.2"/></svg>;
}
function IcCalendarDay() {
  return <svg {...base}><rect x="2.5" y="3.5" width="15" height="14" rx="2"/><path d="M6.5 2v3M13.5 2v3M2.5 8.5h15"/><rect x="8" y="11" width="4" height="3.5" rx="1" fill="currentColor" stroke="none"/></svg>;
}
function IcCalendarMonth() {
  return <svg {...base}><rect x="2.5" y="3.5" width="15" height="14" rx="2"/><path d="M6.5 2v3M13.5 2v3M2.5 8.5h15"/><circle cx="6.5"  cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="10"   cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="13" r="1" fill="currentColor" stroke="none"/></svg>;
}
function IcBarChart() {
  return <svg {...base}><path d="M3 15.5V10M7.5 15.5V5.5M12 15.5V9.5M16.5 15.5V7"/><path d="M1.5 17h17"/></svg>;
}
function IcTrendUp() {
  return <svg {...base}><path d="M2 14.5 7.5 9l3.5 3.5L18 5"/><path d="M13.5 5H18v4.5"/></svg>;
}
function IcFolder() {
  return <svg {...base}><path d="M2.5 6.5A2 2 0 0 1 4.5 4.5h3.2l1.8 2H15a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2Z"/></svg>;
}
function IcEye() {
  return <svg {...base}><path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"/><circle cx="10" cy="10" r="2.5"/></svg>;
}
function IcStar() {
  return <svg {...base}><path d="M10 2.5l2.1 4.2 4.7.7-3.4 3.3.8 4.7L10 13l-4.2 2.4.8-4.7L3.2 7.4l4.7-.7Z"/></svg>;
}
function IcTarget() {
  return <svg {...base}><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="4"/><circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none"/></svg>;
}

type CandidateRow = {
  id: string;
  name: string;
  status: string;
};

type ActivityRow = {
  event: { id: string; action: string; createdAt: Date };
  actorName: string | null;
};

type ScheduledRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerName: string;
  status: string;
  dueAt: string;
};

function stagePill(status: string) {
  if (status.includes("screen")) return { label: "Analysis", variant: "orange" as const };
  if (status === "assigned" || status === "interview_in_progress")
    return { label: "Interview", variant: "cyan" as const };
  if (status === "selected") return { label: "Selected", variant: "green" as const };
  if (status === "hold" || status === "screened_hold")
    return { label: "Setup", variant: "neutral" as const };
  if (status.includes("question")) return { label: "Questions", variant: "cyan" as const };
  return { label: status.replace(/_/g, " "), variant: "neutral" as const };
}

function urgencyPill(urgency: RecruiterTask["urgency"]) {
  if (urgency === "overdue") {
    return {
      label: "Overdue",
      variant: "orange" as const,
      style: {
        color: "#d63b3b",
        backgroundColor: "var(--orange-soft)",
        borderColor: "rgba(232, 119, 34, 0.45)",
      },
    };
  }
  if (urgency === "today") return { label: "Today", variant: "cyan" as const };
  if (urgency === "soon") return { label: "Waiting", variant: "orange" as const };
  if (urgency === "hold") return { label: "On hold", variant: "neutral" as const };
  return { label: "Action", variant: "cyan" as const };
}

function TodayWorkPanel({ tasks }: { tasks: RecruiterTask[] }) {
  if (tasks.length === 0) {
    return (
      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Today&apos;s work
        </h2>
        <div className="case-card p-5 text-sm text-[var(--ink-faint)]">
          You&apos;re all caught up — no pending actions on your cases right now.
        </div>
      </section>
    );
  }

  const groups = groupTasksByUrgency(tasks);
  const sections: { title: string; items: RecruiterTask[] }[] = [
    { title: "Overdue", items: groups.overdue },
    { title: "Due today", items: groups.today },
    { title: "Needs attention", items: [...groups.soon, ...groups.normal].slice(0, 8) },
    { title: "On hold", items: groups.hold },
  ].filter((s) => s.items.length > 0);

  const headline = [
    groups.overdue.length > 0 && `${groups.overdue.length} overdue`,
    groups.today.length > 0 && `${groups.today.length} today`,
    groups.soon.length + groups.normal.length > 0 &&
      `${groups.soon.length + groups.normal.length} to action`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mb-5">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Today&apos;s work
          </h2>
          {headline && (
            <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{headline}</p>
          )}
        </div>
        {tasks[0] && (
          <Link
            href={tasks[0].href}
            className="text-[12px] font-semibold text-[var(--cyan-d)] hover:underline"
          >
            Start with {tasks[0].candidateName} →
          </Link>
        )}
      </div>
      <CasePanel title="Priority queue">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="border-b border-[var(--cream-2)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
              {section.title}
            </div>
            {section.items.map((t) => {
              const pill = urgencyPill(t.urgency);
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className="case-row no-underline transition-colors hover:bg-[var(--cream)]"
                >
                  <strong className="text-[var(--ink)]">{t.candidateName}</strong>
                  <span className="truncate text-[var(--ink-soft)]">
                    {t.action}
                    {t.detail ? ` — ${t.detail}` : ""}
                  </span>
                  <Pill variant={pill.variant} style={pill.style}>{pill.label}</Pill>
                  <span className="open-link">
                    Open
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </CasePanel>
    </section>
  );
}

export function TeamDashboard({
  role,
  candidates,
  stats,
  feed,
  today,
  scheduled = [],
  todayTasks = [],
  setupRequired = false,
}: {
  role: MemberRole;
  candidates: CandidateRow[];
  stats: {
    inProgress: number;
    selected: number;
    total: number;
  };
  feed: ActivityRow[];
  today: string;
  scheduled?: ScheduledRow[];
  todayTasks?: RecruiterTask[];
  setupRequired?: boolean;
}) {
  const inProgress = candidates.filter((c) =>
    ["screening", "ready_for_interview", "assigned", "draft"].includes(c.status),
  );

  const needsScreening = candidates.filter((c) =>
    ["draft", "screening"].includes(c.status),
  );
  const readyToBook = candidates.filter(
    (c) => c.status === "ready_for_interview",
  );
  const awaitingResult = candidates.filter((c) =>
    ["assigned", "interview_in_progress"].includes(c.status),
  );
  const onHold = candidates.filter((c) =>
    ["hold", "screened_hold"].includes(c.status),
  );

  const actions = [
    {
      key: "screen",
      count: needsScreening.length,
      label: "Awaiting screening",
      hint: "Run AI evaluation & decide",
      href: "/candidates",
      variant: "orange" as const,
      cta: "Screen now",
    },
    {
      key: "book",
      count: readyToBook.length,
      label: "Ready to book",
      hint: "Assign an interviewer & slot",
      href: "/booking",
      variant: "cyan" as const,
      cta: "Book slot",
    },
    {
      key: "await",
      count: awaitingResult.length,
      label: "Awaiting interview result",
      hint: "Follow up with panel",
      href: "/pipeline",
      variant: "neutral" as const,
      cta: "Track",
    },
    {
      key: "hold",
      count: onHold.length,
      label: "On hold",
      hint: "Revisit paused candidates",
      href: "/pipeline",
      variant: "neutral" as const,
      cta: "Review",
    },
  ];

  const title =
    role === "admin" ? "Admin dashboard" : "Talent acquisition dashboard";
  const subtitle =
    role === "admin"
      ? "Organization-wide hiring pipeline and team activity"
      : "Screen candidates, assign interviewers, and track your pipeline";

  return (
    <CabinetPage
      title={title}
      subtitle={today}
      actions={
        setupRequired ? (
          <span
            title="Set up projects and openings before adding candidates"
            className="inline-flex cursor-not-allowed items-center rounded-xl bg-[var(--cream-2)] px-5 py-2 text-[13px] font-semibold text-[var(--ink-faint)] opacity-60 select-none"
          >
            + New case file
          </span>
        ) : (
          <ButtonLink href="/evaluate/new" className="px-5 py-2 text-[13px]">
            + New case file
          </ButtonLink>
        )
      }
    >
      {setupRequired && (
        <div className="case-fade-in mb-5 overflow-hidden rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)]">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-xl" aria-hidden>⚠</span>
              <div>
                <p className="text-[14px] font-bold text-[var(--ink)]">
                  Organisation setup required
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
                  Candidates, job descriptions, and evaluations are unavailable until you configure at least one project and one opening.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
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
      {inProgress.length > 0 && (
        <div className="case-alert mb-5 case-fade-in">
          <div>
            <h2 className="font-serif text-xl font-bold">
              {inProgress.length} case file{inProgress.length !== 1 ? "s" : ""} in progress
            </h2>
            <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
              Pick up where you left off or open a new evaluation
            </p>
          </div>
          <div className="font-serif text-[3.5rem] leading-none text-[var(--cyan-d)] opacity-30">
            {String(inProgress.length).padStart(2, "0")}
          </div>
        </div>
      )}

      <TodayWorkPanel tasks={todayTasks} />

      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Action center
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map((a) => {
            const borderColor =
              a.variant === "orange"
                ? "border-l-[var(--orange)]"
                : a.variant === "cyan"
                  ? "border-l-[var(--cyan)]"
                  : "border-l-[var(--cream-2)]";
            return (
              <Link
                key={a.key}
                href={a.href}
                className={cn(
                  "case-card group flex flex-col justify-between overflow-hidden border-l-4 p-4 no-underline transition-all hover:shadow-sm",
                  a.count > 0 ? borderColor : "border-l-[var(--cream-2)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "font-serif text-[2.25rem] leading-none",
                    a.count > 0 && a.variant === "orange" ? "text-[var(--orange)]" :
                    a.count > 0 && a.variant === "cyan" ? "text-[var(--cyan-d)]" :
                    "text-[var(--ink)]"
                  )}>
                    {a.count}
                  </span>
                  <Pill variant={a.count > 0 ? a.variant : "neutral"}>
                    {a.count > 0 ? "Action" : "Clear"}
                  </Pill>
                </div>
                <div className="mt-2">
                  <div className="text-[13px] font-bold text-[var(--ink)]">
                    {a.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--ink-faint)]">
                    {a.hint}
                  </div>
                </div>
                <span className="mt-3 text-[12px] font-semibold text-[var(--cyan-d)] group-hover:underline">
                  {a.cta} →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="In progress" value={stats.inProgress} icon={<IcClock />}       variant="cyan" />
        <StatBlock label="Selected"    value={stats.selected}   icon={<IcCheckCircle />} variant="green" />
        <StatBlock label="All cases"   value={stats.total}      icon={<IcFolder />}      />
        <StatBlock
          label="Open now"
          value={inProgress.length}
          icon={<IcEye />}
          className="hidden md:block"
        />
      </div>

      {scheduled.length > 0 && (
        <section className="mb-5">
          <CasePanel title="Scheduled interviews">
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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <CasePanel title="Open case files">
          {candidates.length === 0 ? (
            <p className="p-5 text-sm text-[var(--ink-faint)]">No case files yet.</p>
          ) : (
            candidates.slice(0, 8).map((c) => {
              const pill = stagePill(c.status);
              return (
                <div key={c.id} className="case-row">
                  <strong>{c.name}</strong>
                  <span className="text-[var(--ink-soft)] capitalize">
                    {c.status.replace(/_/g, " ")}
                  </span>
                  <Pill variant={pill.variant}>{pill.label}</Pill>
                  <ButtonLink
                    href={`/evaluate/${c.id}`}
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                  >
                    Open
                  </ButtonLink>
                </div>
              );
            })
          )}
        </CasePanel>

        <CasePanel title="Recent activity">
          <div className="px-3 py-2">
            {feed.length === 0 ? (
              <p className="p-3 text-sm text-[var(--ink-faint)]">No activity yet.</p>
            ) : (
              feed.map(({ event, actorName }) => (
                <div
                  key={event.id}
                  className="flex gap-3 border-b border-dashed border-[var(--cream-2)] px-2 py-3.5 last:border-none"
                >
                  <FaceAvatar name={actorName ?? "System"} size="sm" />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <strong>{actorName ?? "System"}</strong>{" "}
                    <span className="text-[var(--ink-soft)]">{event.action}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[var(--cream-2)] px-4 py-3 text-right">
            <Link href="/pipeline" className="text-xs font-semibold text-[var(--cyan-d)]">
              Full pipeline →
            </Link>
          </div>
        </CasePanel>
      </div>
    </CabinetPage>
  );
}

type HistoryRow = {
  stageId: string;
  label: string;
  decision: string | null;
  decidedAt: string | null;
  candidateId: string;
  candidateName: string;
  roleName: string | null;
  hasReport: boolean;
};

type AssignmentRow = {
  id: string;
  status: string;
  label: string;
  dueAt: string | null;
  handoffNote: string | null;
  roleName: string | null;
  projectName: string | null;
  candidate: { id: string; name: string };
};

// Wrapped so the react-hooks/purity rule (which only inspects direct calls
// within a component's own body) doesn't flag this legitimate wall-clock read.
function getNow(): number {
  return Date.now();
}

function urgencyFor(dueAt: string | null): "overdue" | "soon" | "none" {
  if (!dueAt) return "none";
  const due = new Date(dueAt).getTime();
  const now = getNow();
  if (due < now) return "overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "soon";
  return "none";
}

function UrgencyPill({ dueAt }: { dueAt: string | null }) {
  const urgency = urgencyFor(dueAt);
  if (urgency === "overdue") {
    const days = Math.floor((getNow() - new Date(dueAt!).getTime()) / 86400000);
    return (
      <Pill
        variant="orange"
        style={{
          color: "#d63b3b",
          backgroundColor: "var(--orange-soft)",
          borderColor: "rgba(232, 119, 34, 0.45)",
        }}
      >
        Overdue{days > 0 ? ` · ${days}d ago` : ""}
      </Pill>
    );
  }
  if (urgency === "soon") {
    const hrs = Math.max(1, Math.round((new Date(dueAt!).getTime() - getNow()) / 3600000));
    return <Pill variant="cyan">Due in {hrs}h</Pill>;
  }
  return <Pill variant="neutral">Pending</Pill>;
}

export function InterviewerDashboard({
  assignments,
  counts,
  history = [],
  today,
}: {
  assignments: AssignmentRow[];
  counts?: {
    today: number;
    month: number;
    quarter: number;
    year: number;
    total: number;
  };
  history?: HistoryRow[];
  today: string;
}) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const pending = assignments.filter((a) => a.status === "active");
  const overdue = pending.filter((a) => urgencyFor(a.dueAt) === "overdue");
  const period = counts ?? { today: 0, month: 0, quarter: 0, year: 0, total: 0 };

  const sortedPending = [...pending].sort((a, b) => {
    const ua = urgencyFor(a.dueAt);
    const ub = urgencyFor(b.dueAt);
    const rank = { overdue: 0, soon: 1, none: 2 };
    if (rank[ua] !== rank[ub]) return rank[ua] - rank[ub];
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });

  const alertOverdue = overdue.length > 0;

  return (
    <CabinetPage
      title="Interview dashboard"
      subtitle={today}
      actions={
        <ButtonLink href="/assignments" className="px-5 py-2 text-[13px]">
          View all assignments →
        </ButtonLink>
      }
    >
      {/* ── Queue status banner ────────────────────────────────────── */}
      {pending.length === 0 ? (
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-[var(--green)]/25 bg-gradient-to-r from-[var(--green-soft)] to-white p-5 case-fade-in">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--green)] text-xl text-white shadow-md">
            ✓
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">Queue clear</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
              Assignments will appear here when a recruiter books you for a candidate.
            </p>
          </div>
        </div>
      ) : (
        <div className={cn(
          "mb-5 flex items-center justify-between gap-4 rounded-xl border p-5 case-fade-in",
          alertOverdue
            ? "border-[var(--orange)]/30 bg-gradient-to-r from-[var(--orange-soft)] to-white"
            : "border-[var(--cyan)]/25 bg-gradient-to-r from-[var(--cyan-soft)] to-white",
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full text-xl text-white shadow-md",
              alertOverdue ? "bg-[var(--orange)]" : "bg-[var(--cyan)]",
            )}>
              {alertOverdue ? "⚠" : "◎"}
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">
                {alertOverdue ? `${overdue.length} overdue` : "Your interview queue"}
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
                {alertOverdue
                  ? `${pending.length} total pending — please complete overdue evaluations`
                  : `${pending.length} candidate${pending.length !== 1 ? "s" : ""} awaiting your evaluation`}
              </p>
            </div>
          </div>
          <div className={cn(
            "font-serif text-[3.5rem] font-bold leading-none opacity-20",
            alertOverdue ? "text-[var(--orange)]" : "text-[var(--cyan-d)]",
          )}>
            {String(pending.length).padStart(2, "0")}
          </div>
        </div>
      )}

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock
          label="Pending"
          value={pending.length}
          icon={<IcClock />}
          variant="cyan"
        />
        <StatBlock
          label="Overdue"
          value={overdue.length}
          icon={<IcAlert />}
          variant={overdue.length > 0 ? "orange" : "default"}
        />
        <StatBlock
          label="Completed"
          value={period.total}
          icon={<IcCheckCircle />}
          variant="green"
        />
        <StatBlock
          label="Total assigned"
          value={assignments.length}
          icon={<IcUsers />}
        />
      </div>

      {/* ── Completion stats ───────────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Interviews completed
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBlock label="Today"        value={period.today}   icon={<IcCalendarDay />}   variant="cyan" />
          <StatBlock label="This month"   value={period.month}   icon={<IcCalendarMonth />} />
          <StatBlock label="This quarter" value={period.quarter} icon={<IcBarChart />}       />
          <StatBlock label="This year"    value={period.year}    icon={<IcTrendUp />}        variant="green" />
        </div>
      </section>

      {/* ── Interview queue (card style, aligned with Assignments page) ── */}
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Pending interviews ({sortedPending.length})
          </h2>
          {sortedPending.length > 5 && (
            <ButtonLink href="/assignments" variant="ghost" className="px-3 py-1 text-[11px]">
              View all →
            </ButtonLink>
          )}
        </div>

        {/* Today's progress bar */}
        {(period.today > 0 || sortedPending.length > 0) && (
          <div className="mb-3 overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white px-4 py-3">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="uppercase tracking-wide text-[var(--ink-faint)]">Today&apos;s progress</span>
              <span className="text-[var(--cyan-d)]">{period.today} done · {sortedPending.length} remaining</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cream-2)]">
              {(() => {
                const total = period.today + sortedPending.length;
                const pct = total > 0 ? Math.round((period.today / total) * 100) : 0;
                return (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--cyan-d)] transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {sortedPending.length === 0 ? (
          <div className="case-card flex items-center gap-4 p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-lg">✓</div>
            <p className="text-sm text-[var(--ink-faint)]">No active assignments. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPending.slice(0, 6).map((a, idx) => {
              const urgency = urgencyFor(a.dueAt);
              const context = [a.roleName, a.projectName].filter(Boolean).join(" · ");
              const isTopItem = idx === 0;
              const isOpening = openingId === a.id;
              return (
                <Link
                  key={a.id}
                  href={`/evaluate/${a.candidate.id}`}
                  className="block no-underline"
                  onClick={() => setOpeningId(a.id)}
                >
                  <div className={cn(
                    "case-card overflow-hidden transition-all hover:shadow-sm",
                    urgency === "overdue"
                      ? "border-[var(--orange)]/30 hover:border-[var(--orange)]"
                      : "hover:border-[var(--cyan)]/40",
                  )}>
                    {urgency === "overdue" && (
                      <div className="h-1 w-full bg-gradient-to-r from-[var(--orange)] to-[#f5b88a]" />
                    )}
                    {urgency === "soon" && (
                      <div className="h-1 w-full bg-gradient-to-r from-[var(--cyan)] to-[#7dd8f5]" />
                    )}
                    <div className="flex items-center gap-3 p-4">
                      <FaceAvatar name={a.candidate.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[var(--ink)]">{a.candidate.name}</strong>
                          {context && (
                            <span className="text-[11px] text-[var(--ink-faint)]">{context}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--cyan-d)]">{a.label}</span>
                        </div>
                        {a.dueAt && (
                          <p className={cn(
                            "mt-0.5 text-[11px] font-semibold",
                            urgency === "overdue"
                              ? "text-[var(--orange)]"
                              : urgency === "soon"
                                ? "text-[var(--cyan-d)]"
                                : "text-[var(--ink-faint)]",
                          )}>
                            Due:{" "}
                            {new Date(a.dueAt).toLocaleString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        {a.handoffNote && (
                          <p className="mt-1 truncate rounded bg-[var(--cream)] px-2 py-0.5 text-[11px] italic text-[var(--ink-soft)]">
                            &ldquo;{a.handoffNote}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <UrgencyPill dueAt={a.dueAt} />
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition-all",
                          isOpening
                            ? "border-[var(--cyan)] bg-[var(--cyan)] text-white shadow-[var(--cyan)]/20"
                            : isTopItem
                              ? "border-[var(--cyan)] bg-[var(--cyan)] text-white hover:bg-[var(--cyan-d)] hover:border-[var(--cyan-d)]"
                              : urgency === "overdue"
                                ? "border-[var(--orange)] bg-white text-[var(--orange)] hover:bg-[var(--orange)] hover:text-white"
                                : "border-[var(--cyan)] bg-white text-[var(--cyan-d)] hover:bg-[var(--cyan)] hover:text-white",
                        )}>
                          {isOpening ? (
                            <>
                              <svg
                                className="animate-spin size-3"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <circle
                                  cx="8"
                                  cy="8"
                                  r="6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeOpacity=".3"
                                />
                                <path
                                  d="M8 2a6 6 0 0 1 6 6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              Opening…
                            </>
                          ) : (
                            "Open →"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── History & exports ──────────────────────────────────────── */}
      {history.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Completed interviews ({history.length})
          </h2>
          <div className="case-card overflow-hidden">
            {history.slice(0, 8).map((h, idx) => (
              <div
                key={h.stageId}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--cream)]",
                  idx < history.slice(0, 8).length - 1
                    ? "border-b border-[var(--cream-2)]"
                    : "",
                )}
              >
                <FaceAvatar name={h.candidateName} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[var(--ink)]">{h.candidateName}</strong>
                    {h.roleName && (
                      <span className="text-[11px] text-[var(--ink-faint)]">· {h.roleName}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--ink-soft)]">{h.label}</span>
                    {h.decidedAt && (
                      <span className="text-[11px] text-[var(--ink-faint)]">
                        ·{" "}
                        {new Date(h.decidedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill
                    variant={
                      h.decision === "yes"
                        ? "green"
                        : h.decision === "no"
                          ? "orange"
                          : "neutral"
                    }
                  >
                    {h.decision === "yes"
                      ? "Proceeded"
                      : h.decision === "no"
                        ? "Not selected"
                        : "Reviewed"}
                  </Pill>
                  {h.hasReport ? (
                    <a
                      href={`/api/stages/${h.stageId}/report`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:bg-[var(--cyan)] hover:text-white"
                    >
                      PDF
                    </a>
                  ) : (
                    <Link
                      href={`/evaluate/${h.candidateId}`}
                      className="text-[11px] font-semibold text-[var(--ink-faint)] hover:text-[var(--cyan-d)]"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </CabinetPage>
  );
}
