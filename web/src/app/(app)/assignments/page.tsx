import { requireSession } from "@/lib/auth/rbac";
import { getStageAssignmentsForUser } from "@/lib/db/queries";
import { FaceAvatar } from "@/components/FaceAvatar";
import Link from "next/link";
import { Pill } from "@/components/Pill";
import { CabinetPage, CaseCard } from "@/components/CabinetPage";

function urgencyFor(dueAt: string | null): "overdue" | "soon" | "none" {
  if (!dueAt) return "none";
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "soon";
  return "none";
}

function ReviewPill({ dueAt }: { dueAt: string | null }) {
  const urgency = urgencyFor(dueAt);
  if (urgency === "overdue") {
    const days = Math.floor((Date.now() - new Date(dueAt!).getTime()) / 86400000);
    return <Pill variant="orange">⚠ Overdue{days > 0 ? ` · ${days}d ago` : ""}</Pill>;
  }
  if (urgency === "soon") {
    const hrs = Math.max(1, Math.round((new Date(dueAt!).getTime() - Date.now()) / 3600000));
    return <Pill variant="cyan">Due in {hrs}h</Pill>;
  }
  return <Pill variant="neutral">Pending</Pill>;
}

export default async function AssignmentsPage() {
  const session = await requireSession();
  const rows = await getStageAssignmentsForUser(
    session.user.organizationId,
    session.user.id,
  );

  const rankUrgency = (dueAt: string | null) => {
    const u = urgencyFor(dueAt);
    return u === "overdue" ? 0 : u === "soon" ? 1 : 2;
  };

  const pending = rows
    .filter((r) => r.stage.status === "active")
    .sort((a, b) => {
      const rd =
        rankUrgency(a.stage.dueAt ? a.stage.dueAt.toISOString() : null) -
        rankUrgency(b.stage.dueAt ? b.stage.dueAt.toISOString() : null);
      if (rd !== 0) return rd;
      if (a.stage.dueAt && b.stage.dueAt)
        return a.stage.dueAt.getTime() - b.stage.dueAt.getTime();
      if (a.stage.dueAt) return -1;
      if (b.stage.dueAt) return 1;
      return 0;
    });

  const done = rows.filter((r) => r.stage.status !== "active");
  const overdue = pending.filter(
    (r) => urgencyFor(r.stage.dueAt ? r.stage.dueAt.toISOString() : null) === "overdue",
  );

  return (
    <CabinetPage
      title="My assignments"
      subtitle={`${pending.length} pending - ${done.length} completed`}
    >
      {overdue.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)] px-5 py-4">
          <div>
            <p className="font-bold text-[var(--orange)]">
              {overdue.length} overdue interview{overdue.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              Please complete these evaluations as soon as possible.
            </p>
          </div>
        </div>
      )}
      {pending.length > 0 && done.length === 0 && (
        <div className="mb-4 rounded-xl border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--cyan-d)]">How it works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-[var(--ink-soft)]">
            <li>Click a candidate below to open their case file</li>
            <li>Review the AI analysis in Step 1</li>
            <li>Generate questions in Step 2 and record answers</li>
            <li>Submit your decision in Step 3 - PDF report is auto-generated</li>
          </ol>
        </div>
      )}
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
        Pending review ({pending.length})
      </h2>
      <ul className="space-y-3">
        {pending.length === 0 ? (
          <li>
            <div className="case-card flex items-center gap-4 p-6">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-xl">✓</div>
              <div>
                <p className="font-semibold text-[var(--ink)]">Your queue is clear</p>
                <p className="mt-0.5 text-sm text-[var(--ink-faint)]">
                  Interview assignments will appear here when a recruiter books you.
                </p>
              </div>
            </div>
          </li>
        ) : (
          pending.map(({ stage, candidate, roleName, projectName }) => {
            const dueAtIso = stage.dueAt ? stage.dueAt.toISOString() : null;
            const urgency = urgencyFor(dueAtIso);
            return (
              <li key={stage.id}>
                <Link href={`/evaluate/${candidate.id}`} className="block no-underline">
                  <CaseCard hover className={`overflow-hidden transition-all ${urgency === "overdue" ? "border-[var(--orange)]/30 hover:border-[var(--orange)]" : "hover:border-[var(--cyan)]/40 hover:shadow-sm"}`}>
                    {urgency === "overdue" && <div className="h-1 w-full bg-[var(--orange)]" />}
                    {urgency === "soon" && <div className="h-1 w-full bg-[var(--cyan)]" />}
                    <div className="flex items-center gap-4 p-4">
                      <FaceAvatar name={candidate.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[var(--ink)]">{candidate.name}</strong>
                          {roleName && <span className="text-xs text-[var(--ink-faint)]">- {roleName}</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--cyan-d)]">{stage.label}</span>
                          {projectName && <span className="text-[11px] text-[var(--ink-faint)]">- {projectName}</span>}
                        </div>
                        {dueAtIso && (
                          <p className={`mt-0.5 text-[11px] font-semibold ${urgency === "overdue" ? "text-[var(--orange)]" : urgency === "soon" ? "text-[var(--cyan-d)]" : "text-[var(--ink-faint)]"}`}>
                            Due: {new Date(dueAtIso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {stage.handoffNote && (
                          <p className="mt-1 truncate rounded bg-[var(--cream)] px-2 py-0.5 text-[11px] italic text-[var(--ink-soft)]">{stage.handoffNote}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ReviewPill dueAt={dueAtIso} />
                        <span className="text-[11px] font-bold text-[var(--cyan-d)]">Open →</span>
                      </div>
                    </div>
                  </CaseCard>
                </Link>
              </li>
            );
          })
        )}
      </ul>
      {done.length > 0 && (
        <>
          <h2 className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Completed ({done.length})
          </h2>
          <ul className="space-y-2">
            {done.map(({ stage, candidate, roleName, projectName }) => {
              const context = [roleName, projectName].filter(Boolean).join(" - ");
              const hasReport = Boolean(
                (stage as { reportKey?: string | null; decision?: string | null }).reportKey ||
                (stage as { reportKey?: string | null; decision?: string | null }).decision,
              );
              const decisionVariant = stage.decision === "yes" ? "green" : stage.decision === "no" ? "orange" : "neutral";
              const decisionLabel = stage.decision === "yes" ? "Proceeded" : stage.decision === "no" ? "Not proceeded" : stage.status.replace(/_/g, " ");
              return (
                <li key={stage.id}>
                  <CaseCard className="flex items-center gap-4 p-4 opacity-80 transition-opacity hover:opacity-100">
                    <FaceAvatar name={candidate.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <strong className="text-[var(--ink)]">{candidate.name}</strong>
                      <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{stage.label}{context ? ` - ${context}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill variant={decisionVariant}>{decisionLabel}</Pill>
                      {hasReport ? (
                        <a href={`/api/stages/${stage.id}/report`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:bg-[var(--cyan)] hover:text-white">
                          PDF Report
                        </a>
                      ) : (
                        <Link href={`/evaluate/${candidate.id}`} className="text-[11px] font-semibold text-[var(--ink-faint)] hover:text-[var(--cyan-d)]">Open</Link>
                      )}
                    </div>
                  </CaseCard>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </CabinetPage>
  );
}
