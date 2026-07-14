import { requireRole } from "@/lib/auth/rbac";
import { getCandidatesForUser } from "@/lib/db/queries";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { CabinetPage } from "@/components/CabinetPage";
import Link from "next/link";

function humanStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    screening: "AI screening",
    screened_hold: "Screening hold",
    ready_for_interview: "Ready",
    assigned: "Interviewer booked",
    interview_in_progress: "In progress",
    interview_complete: "Interview done",
    selected: "Selected ✓",
    rejected: "Rejected",
    hold: "On hold",
    screened_rejected: "Screened out",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function statusVariant(status: string): "cyan" | "green" | "orange" | "neutral" {
  if (status === "selected") return "green";
  if (["rejected", "screened_rejected"].includes(status)) return "orange";
  if (["assigned", "interview_in_progress"].includes(status)) return "cyan";
  return "neutral";
}

export default async function PipelinePage() {
  const session = await requireRole(["admin", "ta"]);
  const candidates = await getCandidatesForUser(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  const columns = [
    {
      key: "screening",
      label: "Screening",
      icon: "🔍",
      color: "border-t-[var(--orange)]",
      badgeColor: "bg-[var(--orange-soft)] text-[var(--orange)]",
      statuses: ["draft", "screening", "screened_hold"],
      hint: "Awaiting AI evaluation",
    },
    {
      key: "ready",
      label: "Ready to book",
      icon: "📋",
      color: "border-t-[var(--cyan)]",
      badgeColor: "bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
      statuses: ["ready_for_interview"],
      hint: "Cleared screening — book an interviewer",
    },
    {
      key: "interview",
      label: "Interview",
      icon: "🎙",
      color: "border-t-[var(--navy)]",
      badgeColor: "bg-[var(--cream-2)] text-[var(--ink-soft)]",
      statuses: ["assigned", "interview_in_progress", "interview_complete"],
      hint: "Panel rounds in progress",
    },
    {
      key: "done",
      label: "Decided",
      icon: "✓",
      color: "border-t-[var(--green)]",
      badgeColor: "bg-[var(--green-soft)] text-[var(--green)]",
      statuses: ["selected", "rejected", "hold", "screened_rejected"],
      hint: "Final verdict recorded",
    },
  ];

  const subtitle =
    session.user.role === "admin"
      ? "Full visibility across the team"
      : "Your candidates";

  return (
    <CabinetPage title="Team pipeline" subtitle={subtitle}>
      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((col) => {
          const colCandidates = candidates.filter((c) => col.statuses.includes(c.status));
          return (
            <div
              key={col.key}
              className={`case-card flex flex-col overflow-hidden border-t-4 ${col.color}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.icon}</span>
                  <span className="text-[13px] font-bold text-[var(--ink)]">{col.label}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${col.badgeColor}`}>
                  {colCandidates.length}
                </span>
              </div>
              <p className="px-4 pb-3 text-[11px] text-[var(--ink-faint)]">{col.hint}</p>

              <div className="mx-3 mb-3 h-px bg-[var(--cream-2)]" />

              {/* Candidates */}
              <ul className="flex-1 space-y-2 px-3 pb-4">
                {colCandidates.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-[var(--cream-2)] px-3 py-4 text-center">
                    <p className="text-[11px] text-[var(--ink-faint)]">No candidates here</p>
                  </li>
                ) : (
                  colCandidates.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/evaluate/${c.id}`}
                        className="group block rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 no-underline transition-all hover:border-[var(--cyan)]/40 hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <FaceAvatar name={c.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[var(--ink)] group-hover:text-[var(--cyan-d)]">
                              {c.name}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Pill variant={statusVariant(c.status)} className="text-[10px]">
                            {humanStatus(c.status)}
                          </Pill>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </CabinetPage>
  );
}
