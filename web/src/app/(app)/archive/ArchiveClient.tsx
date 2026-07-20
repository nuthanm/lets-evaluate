"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";
import { StatBlock, CasePanel } from "@/components/CabinetPage";
import type { ArchivedCandidateRow } from "@/lib/db/queries";
import type { MemberRole } from "@/lib/auth/config";

const ACTIVE_STATUSES = [
  "ready_for_interview",
  "assigned",
  "interview_in_progress",
  "interview_complete",
];

function statusMeta(status: string): {
  label: string;
  variant: "green" | "orange" | "cyan" | "neutral" | "red";
} {
  if (status === "selected") return { label: "Selected", variant: "green" };
  if (status === "rejected") return { label: "Rejected", variant: "orange" };
  if (status === "screened_rejected")
    return { label: "Screened out", variant: "red" };
  if (status === "hold") return { label: "On hold", variant: "neutral" };
  if (status === "interview_complete")
    return { label: "Rounds complete", variant: "cyan" };
  if (status === "ready_for_interview")
    return { label: "Next round pending", variant: "cyan" };
  if (status === "assigned")
    return { label: "Round assigned", variant: "cyan" };
  if (status === "interview_in_progress")
    return { label: "In progress", variant: "cyan" };
  return { label: status.replace(/_/g, " "), variant: "neutral" };
}

const STAGE_STATUS_LABEL: Record<string, string> = {
  passed: "Passed",
  failed: "Not passed",
  active: "In progress",
  skipped: "Skipped",
  pending: "Pending",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "selected", label: "Selected" },
  { key: "rejected", label: "Rejected" },
  { key: "screened_rejected", label: "Screened out" },
  { key: "hold", label: "On hold" },
  { key: "active", label: "In progress" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

function matchesFilter(status: string, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.includes(status);
  if (filter === "rejected") return status === "rejected";
  return status === filter;
}

export function ArchiveClient({
  candidates,
  currentUserId,
}: {
  candidates: ArchivedCandidateRow[];
  currentUserId: string;
  userRole: MemberRole;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "month" | "quarter">(
    "all",
  );

  const stats = useMemo(
    () => ({
      total: candidates.length,
      selected: candidates.filter((c) => c.status === "selected").length,
      rejected: candidates.filter(
        (c) => c.status === "rejected" || c.status === "screened_rejected",
      ).length,
      inProgress: candidates.filter((c) => ACTIVE_STATUSES.includes(c.status))
        .length,
    }),
    [candidates],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const quarterAgo = now - 91 * 24 * 60 * 60 * 1000;
    const needle = search.toLowerCase();
    return candidates.filter((c) => {
      if (!matchesFilter(c.status, filter)) return false;
      if (search) {
        const inName = c.name.toLowerCase().includes(needle);
        const inRole = (c.roleName ?? "").toLowerCase().includes(needle);
        const inProject = (c.projectName ?? "").toLowerCase().includes(needle);
        const inStage = c.stages.some((s) =>
          s.label.toLowerCase().includes(needle),
        );
        if (!inName && !inRole && !inProject && !inStage) return false;
      }
      if (dateRange !== "all") {
        const cutoff = dateRange === "month" ? monthAgo : quarterAgo;
        const latestDecided = c.stages
          .map((s) => (s.decidedAt ? new Date(s.decidedAt).getTime() : 0))
          .reduce((a, b) => Math.max(a, b), 0);
        if (latestDecided < cutoff) return false;
      }
      return true;
    });
  }, [candidates, filter, search, dateRange]);

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--cream-2)] bg-white py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-[var(--cream)] text-3xl">
          ▤
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">No archived cases yet</h3>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">
            Completed evaluations will appear here once candidates are finalised.
          </p>
        </div>
        <ButtonLink href="/candidates">View active candidates →</ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Total cases" value={stats.total} variant="default" />
        <StatBlock
          label="Selected"
          value={stats.selected}
          variant="green"
        />
        <StatBlock
          label="Rejected"
          value={stats.rejected}
          variant="orange"
        />
        <StatBlock
          label="In progress"
          value={stats.inProgress}
          variant="cyan"
        />
      </div>

      <div className="space-y-2">
        <input
          type="search"
          placeholder="Search by name, role, project, or stage…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="case-input w-full px-4 py-2.5 text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "month", "quarter"] as const).map((r) => {
            const label =
              r === "all"
                ? "All time"
                : r === "month"
                  ? "Last 30 days"
                  : "Last quarter";
            return (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                  dateRange === r
                    ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                    : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--cyan)]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.key === "all"
                ? candidates.length
                : candidates.filter((c) => matchesFilter(c.status, opt.key))
                    .length;
            if (opt.key !== "all" && count === 0) return null;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                  filter === opt.key
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)]",
                )}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cream-2)] bg-white px-4 py-8 text-center">
          <p className="text-sm text-[var(--ink-faint)]">
            No candidates match your filters.
          </p>
        </div>
      ) : (
        <CasePanel title={`Case files (${filtered.length})`}>
          {filtered.map((c, idx) => {
            const meta = statusMeta(c.status);
            const isOpen = expandedId === c.id;
            const myStages = c.stages.filter(
              (s) => s.decidedById === currentUserId,
            );
            const nonScreeningStages = c.stages.filter(
              (s) => s.kind !== "screening",
            );
            const completedCount = c.stages.filter(
              (s) => s.status === "passed" || s.status === "failed",
            ).length;
            const context = [c.roleName, c.projectName]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={c.id}
                className={cn(
                  idx < filtered.length - 1 && "border-b border-[var(--cream-2)]",
                )}
              >
                <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--cream)]">
                  <FaceAvatar name={c.name} size="md" />
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : c.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[var(--ink)]">{c.name}</strong>
                      {myStages.length > 0 && (
                        <Pill variant="cyan" className="px-2 py-0.5 text-[9px]">
                          ★ You interviewed
                        </Pill>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-faint)]">
                      {context && <span>{context}</span>}
                      {c.roleLevel && (
                        <>
                          {context && <span>·</span>}
                          <span>{c.roleLevel}</span>
                        </>
                      )}
                      {c.techScore != null && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-[var(--cyan-d)]">
                            AI {c.techScore}%
                          </span>
                        </>
                      )}
                      {nonScreeningStages.length > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {completedCount}/{nonScreeningStages.length} rounds
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Pill variant={meta.variant}>{meta.label}</Pill>
                    <span className="text-[11px] text-[var(--ink-faint)]">
                      {new Date(c.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : c.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--cream-2)] text-[var(--ink-faint)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan-d)]"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    <svg
                      className={cn(
                        "size-4 transition-transform",
                        isOpen && "rotate-180",
                      )}
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] px-4 py-4">
                    <p className="case-label mb-3">Interview pipeline</p>
                    <div className="space-y-2">
                      {c.stages.map((s) => {
                        const isMe = s.decidedById === currentUserId;
                        const isSkipped = s.status === "skipped";
                        const statusLabel =
                          STAGE_STATUS_LABEL[s.status] ?? s.status;
                        const stageVariant =
                          s.status === "passed"
                            ? "green"
                            : s.status === "failed"
                              ? "orange"
                              : s.status === "active"
                                ? "cyan"
                                : "neutral";

                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border border-[var(--cream-2)] bg-white px-3 py-2.5",
                              isSkipped && "opacity-60",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-sm font-semibold text-[var(--ink)]",
                                    isSkipped && "line-through",
                                  )}
                                >
                                  {s.label}
                                </span>
                                {s.status !== "pending" && (
                                  <Pill
                                    variant={stageVariant}
                                    className="px-2 py-0.5 text-[9px]"
                                  >
                                    {statusLabel}
                                  </Pill>
                                )}
                                {isMe && (
                                  <Pill
                                    variant="cyan"
                                    className="px-2 py-0.5 text-[9px]"
                                  >
                                    You
                                  </Pill>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-faint)]">
                                {s.assigneeName && !isSkipped && (
                                  <span>
                                    {isMe
                                      ? "Assessed by you"
                                      : `Assessed by ${s.assigneeName}`}
                                  </span>
                                )}
                                {s.decidedAt && (
                                  <span>
                                    {new Date(s.decidedAt).toLocaleDateString(
                                      "en-GB",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      },
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            {s.reportKey && (
                              <a
                                href={`/api/stages/${s.id}/report`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:bg-[var(--cyan)] hover:text-white"
                              >
                                PDF
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 border-t border-[var(--cream-2)] pt-3">
                      <Link
                        href={`/evaluate/${c.id}`}
                        className="text-xs font-semibold text-[var(--cyan-d)] hover:underline"
                      >
                        View full case file →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CasePanel>
      )}
    </div>
  );
}
