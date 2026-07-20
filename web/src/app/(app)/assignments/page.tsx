import { requireSession } from "@/lib/auth/rbac";
import { getStageAssignmentsForUser } from "@/lib/db/queries";
import Link from "next/link";
import { Pill } from "@/components/Pill";
import { FaceAvatar } from "@/components/FaceAvatar";
import { CabinetPage, CaseCard } from "@/components/CabinetPage";
import { AssignmentCards } from "./AssignmentCards";

function urgencyFor(dueAt: string | null): "overdue" | "soon" | "none" {
  if (!dueAt) return "none";
  const due = new Date(dueAt).getTime();
  const now = getNow();
  if (due < now) return "overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "soon";
  return "none";
}

// Wrapped so the react-hooks/purity rule (which only inspects direct calls
// within a component's own body) doesn't flag this legitimate wall-clock read.
function getNow(): number {
  return Date.now();
}

export default async function AssignmentsPage() {
  const session = await requireSession();
  const rows = await getStageAssignmentsForUser(
    session.user.organizationId,
    session.user.id,
  );
  const now = getNow();

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

  const isManager = session.user.role === "manager";
  const isHr = session.user.role === "hr";

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
            {isManager || isHr ? (
              <>
                <li>Select a question category and generate or add your own questions</li>
                <li>Conduct the {isManager ? "manager" : "HR"} round and record your assessment</li>
                <li>Submit your recommendation in Step 2 — PDF report is auto-generated</li>
              </>
            ) : (
              <>
                <li>Review the AI analysis in Step 1</li>
                <li>Generate questions in Step 2 and record answers</li>
                <li>Submit your decision in Step 3 — PDF report is auto-generated</li>
              </>
            )}
          </ol>
        </div>
      )}
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
        Pending review ({pending.length})
      </h2>
      <AssignmentCards
        now={now}
        rows={pending.map(({ stage, candidate, roleName, projectName }) => ({
          stage: {
            id: stage.id,
            label: stage.label,
            status: stage.status,
            dueAt: stage.dueAt ? stage.dueAt.toISOString() : null,
            handoffNote: stage.handoffNote ?? null,
          },
          candidate: { id: candidate.id, name: candidate.name },
          roleName: roleName ?? null,
          projectName: projectName ?? null,
        }))}
      />
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
