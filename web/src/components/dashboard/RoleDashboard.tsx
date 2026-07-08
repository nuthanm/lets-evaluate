import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import Link from "next/link";
import type { MemberRole } from "@/lib/auth/config";
import type { RecruiterTask } from "@/lib/recruiter/tasks";
import { groupTasksByUrgency } from "@/lib/recruiter/tasks";

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
  if (urgency === "overdue") return { label: "Overdue", variant: "orange" as const };
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
                  <Pill variant={pill.variant}>{pill.label}</Pill>
                  <span className="text-[11px] font-semibold text-[var(--cyan-d)]">
                    Open →
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
        <ButtonLink href="/evaluate/new" className="px-5 py-2 text-[13px]">
          + New case file
        </ButtonLink>
      }
    >
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
          {actions.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="case-card group flex flex-col justify-between p-4 no-underline transition-colors hover:border-[var(--cyan)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-serif text-[2.25rem] leading-none">
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
          ))}
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="In progress" value={stats.inProgress} icon="📋" />
        <StatBlock label="Selected" value={stats.selected} icon="✓" />
        <StatBlock label="All cases" value={stats.total} icon="📁" />
        <StatBlock
          label="Open now"
          value={inProgress.length}
          icon="◎"
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

export function InterviewerDashboard({
  assignments,
  counts,
  history = [],
  today,
}: {
  assignments: {
    id: string;
    status: string;
    label: string;
    dueAt: string | null;
    handoffNote: string | null;
    candidate: { id: string; name: string };
  }[];
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
  const pending = assignments.filter((a) => a.status === "active");
  const period = counts ?? {
    today: 0,
    month: 0,
    quarter: 0,
    year: 0,
    total: 0,
  };

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
      <div className="case-alert mb-5 case-fade-in">
        <div>
          <h2 className="font-serif text-xl font-bold">Your interview queue</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            Candidates assigned to you for interviews
          </p>
        </div>
        <div className="font-serif text-[3.5rem] leading-none text-[var(--cyan-d)] opacity-30">
          {String(pending.length).padStart(2, "0")}
        </div>
      </div>

      <section className="mb-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Interviews completed
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatBlock label="Today" value={period.today} icon="☀" />
          <StatBlock label="This month" value={period.month} icon="◔" />
          <StatBlock label="This quarter" value={period.quarter} icon="◑" />
          <StatBlock label="This year" value={period.year} icon="◕" />
          <StatBlock
            label="All time"
            value={period.total}
            icon="✓"
            className="hidden md:block"
          />
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBlock label="Pending" value={pending.length} icon="◎" />
        <StatBlock label="Completed" value={period.total} icon="✓" />
        <StatBlock label="Total assigned" value={assignments.length} icon="📋" />
      </div>

      {history.length > 0 && (
        <section className="mb-5">
          <CasePanel title="History & exports">
            {history.slice(0, 10).map((h) => (
              <div key={h.stageId} className="case-row">
                <strong>{h.candidateName}</strong>
                <span className="truncate text-[var(--ink-soft)]">
                  {h.label}
                  {h.roleName ? ` · ${h.roleName}` : ""}
                  {h.decidedAt
                    ? ` · ${new Date(h.decidedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </span>
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
                    ? "Passed"
                    : h.decision === "no"
                      ? "Not selected"
                      : "Reviewed"}
                </Pill>
                {h.hasReport ? (
                  <a
                    href={`/api/stages/${h.stageId}/report`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-[11px] font-semibold text-[var(--cyan-d)] hover:underline"
                  >
                    PDF ↓
                  </a>
                ) : (
                  <ButtonLink
                    href={`/evaluate/${h.candidateId}`}
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                  >
                    Open
                  </ButtonLink>
                )}
              </div>
            ))}
          </CasePanel>
        </section>
      )}

      <CasePanel title="Upcoming interviews">
        {assignments.length === 0 ? (
          <p className="p-5 text-sm text-[var(--ink-faint)]">
            No assignments yet. Your TA will assign candidates when ready.
          </p>
        ) : (
          assignments.slice(0, 8).map((a) => (
            <div key={a.id} className="case-row">
              <strong>{a.candidate.name}</strong>
              <span className="truncate text-[var(--ink-soft)]">
                {a.label}
                {a.dueAt
                  ? ` · ${new Date(a.dueAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </span>
              <Pill
                variant={
                  a.status === "active"
                    ? "cyan"
                    : a.status === "passed"
                      ? "green"
                      : "neutral"
                }
              >
                {a.status === "active" ? "To review" : a.status}
              </Pill>
              <ButtonLink
                href={`/evaluate/${a.candidate.id}`}
                variant="ghost"
                className="px-3 py-1 text-[11px]"
              >
                Open
              </ButtonLink>
            </div>
          ))
        )}
      </CasePanel>
    </CabinetPage>
  );
}
