"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ArchivedCandidateRow } from "@/lib/db/queries";
import type { MemberRole } from "@/lib/auth/config";

// ─── Status / display helpers ────────────────────────────────────────────────

const FINAL_STATUS: Record<string, {
  label: string;
  pillClass: string;
  spineClass: string;
}> = {
  selected: {
    label: "Selected",
    pillClass: "border-[var(--green)]/25 bg-[var(--green-soft)] text-[var(--green)]",
    spineClass: "bg-[var(--green)]",
  },
  rejected: {
    label: "Rejected",
    pillClass: "border-red-200 bg-red-50 text-red-600",
    spineClass: "bg-red-500",
  },
  screened_rejected: {
    label: "Screened out",
    pillClass: "border-red-200 bg-red-50 text-red-600",
    spineClass: "bg-red-400",
  },
  hold: {
    label: "On hold",
    pillClass: "border-[var(--orange)]/25 bg-[var(--orange-soft)] text-[var(--orange)]",
    spineClass: "bg-[var(--orange)]",
  },
  interview_complete: {
    label: "Rounds complete",
    pillClass: "border-[var(--cyan)]/25 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
    spineClass: "bg-[var(--cyan)]",
  },
  ready_for_interview: {
    label: "Next round pending",
    pillClass: "border-[var(--cyan)]/25 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
    spineClass: "bg-[var(--cyan)]",
  },
  assigned: {
    label: "Round assigned",
    pillClass: "border-[var(--cyan)]/25 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
    spineClass: "bg-[var(--cyan)]",
  },
  interview_in_progress: {
    label: "In progress",
    pillClass: "border-[var(--cyan)]/25 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
    spineClass: "bg-[var(--cyan)]",
  },
};

const STAGE_KIND_ICON: Record<string, string> = {
  screening: "📋",
  technical: "💻",
  manager: "👔",
  hr: "🤝",
  final: "🏁",
  custom: "📌",
};

const STAGE_STATUS_META: Record<string, {
  icon: string;
  iconClass: string;
}> = {
  passed: {
    icon: "✓",
    iconClass: "border-[var(--green)]/25 bg-[var(--green-soft)] text-[var(--green)]",
  },
  failed: {
    icon: "✗",
    iconClass: "border-red-200 bg-red-50 text-red-500",
  },
  active: {
    icon: "●",
    iconClass: "border-[var(--cyan)]/25 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
  },
  pending: {
    icon: "○",
    iconClass: "border-[var(--cream-2)] bg-[var(--cream)] text-[var(--ink-faint)]",
  },
  skipped: {
    icon: "—",
    iconClass: "border-[var(--cream-2)] bg-[var(--cream)] text-[var(--ink-faint)]",
  },
};

const STAGE_STATUS_BADGE: Record<string, string> = {
  passed: "border-[var(--green)]/20 bg-[var(--green-soft)] text-[var(--green)]",
  failed: "border-red-200 bg-red-50 text-red-500",
  active: "border-[var(--cyan)]/20 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
  skipped: "border-[var(--cream-2)] bg-[var(--cream)] text-[var(--ink-faint)]",
  pending: "border-[var(--cream-2)] bg-[var(--cream)] text-[var(--ink-faint)]",
};

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
  { key: "interview_complete", label: "Rounds complete" },
  { key: "ready_for_interview", label: "Next round pending" },
  { key: "assigned", label: "Round assigned" },
  { key: "interview_in_progress", label: "In progress" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [dateRange, setDateRange] = useState<"all" | "month" | "quarter">("all");

  const stats = useMemo(() => ({
    total: candidates.length,
    selected: candidates.filter((c) => c.status === "selected").length,
    rejected: candidates.filter(
      (c) => c.status === "rejected" || c.status === "screened_rejected",
    ).length,
    hold: candidates.filter((c) => c.status === "hold").length,
    inProgress: candidates.filter((c) =>
      ["ready_for_interview", "assigned", "interview_in_progress", "interview_complete"].includes(c.status)
    ).length,
  }), [candidates]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const quarterAgo = now - 91 * 24 * 60 * 60 * 1000;
    const needle = search.toLowerCase();
    return candidates.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search) {
        const inName = c.name.toLowerCase().includes(needle);
        const inRole = (c.roleName ?? "").toLowerCase().includes(needle);
        const inProject = (c.projectName ?? "").toLowerCase().includes(needle);
        const inStage = c.stages.some((s) => s.label.toLowerCase().includes(needle));
        if (!inName && !inRole && !inProject && !inStage) return false;
      }
      if (dateRange !== "all") {
        const cutoff = dateRange === "month" ? monthAgo : quarterAgo;
        const latestDecided = c.stages
          .map((s) => s.decidedAt ? new Date(s.decidedAt).getTime() : 0)
          .reduce((a, b) => Math.max(a, b), 0);
        if (latestDecided < cutoff) return false;
      }
      return true;
    });
  }, [candidates, filter, search, dateRange]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--cream-2)] bg-white py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-[var(--cream)] text-3xl">▤</div>
        <div>
          <h3 className="font-serif text-xl font-bold">No archived cases yet</h3>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">
            Completed evaluations will appear here once candidates are finalised.
          </p>
        </div>
        <a
          href="/candidates"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--cyan-d)]"
        >
          View active candidates →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total", count: stats.total, cls: "text-[var(--ink)]" },
          { label: "Selected", count: stats.selected, cls: "text-[var(--green)]" },
          { label: "Rejected", count: stats.rejected, cls: "text-red-500" },
          { label: "On Hold", count: stats.hold, cls: "text-[var(--orange)]" },
          { label: "In Progress", count: stats.inProgress, cls: "text-[var(--cyan-d)]" },
        ].map((s) => (
          <div key={s.label} className="case-card flex items-center gap-3 px-4 py-2.5">
            <span className={cn("font-serif text-2xl font-bold", s.cls)}>{s.count}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Search + filter tabs ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <input
          type="search"
          placeholder="Search by name, role, project, or stage…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="case-input w-full px-4 py-2.5 text-sm"
        />
        {/* Date range tabs */}
        <div className="flex gap-1.5">
          {(["all", "month", "quarter"] as const).map((r) => {
            const label = r === "all" ? "All time" : r === "month" ? "Last 30 days" : "Last quarter";
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
                : candidates.filter((c) => c.status === opt.key).length;
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

      {/* ── Candidate list ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cream-2)] bg-white px-4 py-8 text-center">
          <p className="text-sm text-[var(--ink-faint)]">No candidates match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const meta = FINAL_STATUS[c.status] ?? FINAL_STATUS.interview_complete;
            const isOpen = expandedId === c.id;
            const myStages = c.stages.filter((s) => s.decidedById === currentUserId);
            const nonScreeningStages = c.stages.filter(
              (s) => s.kind !== "screening",
            );
            const completedCount = c.stages.filter(
              (s) => s.status === "passed" || s.status === "failed",
            ).length;

            return (
              <div
                key={c.id}
                className={cn(
                  "case-card overflow-hidden transition-shadow",
                  isOpen && "shadow-md",
                )}
              >
                {/* Coloured spine */}
                <div className={cn("h-1", meta.spineClass)} />

                {/* Card header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--cream)]"
                >
                  {/* Avatar */}
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--cream-2)] bg-[var(--ink)] font-serif text-sm font-extrabold text-white">
                    {c.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-serif text-base font-bold text-[var(--ink)]">
                        {c.name}
                      </span>
                      {myStages.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan)]/25 bg-[var(--cyan-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--cyan-d)]">
                          ★ Interviewed by you
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ink-faint)]">
                      {c.roleName && (
                        <span className="font-semibold text-[var(--ink-soft)]">
                          {c.roleName}
                        </span>
                      )}
                      {c.roleLevel && (
                        <>
                          <span>·</span>
                          <span>{c.roleLevel}</span>
                        </>
                      )}
                      {c.projectName && (
                        <>
                          <span>·</span>
                          <span>{c.projectName}</span>
                        </>
                      )}
                      {c.techScore != null && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-[var(--cyan-d)]">
                            AI {c.techScore}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + date + expand indicator */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                        meta.pillClass,
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-[var(--ink-faint)]">
                      {new Date(c.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {nonScreeningStages.length > 0 && (
                        <span className="text-[10px] text-[var(--ink-faint)]">
                          {completedCount}/{nonScreeningStages.length} rounds
                        </span>
                      )}
                      <svg
                        className={cn(
                          "size-4 text-[var(--ink-faint)] transition-transform",
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
                    </div>
                  </div>
                </button>

                {/* ── Expanded: stage pipeline ─────────────────────────────── */}
                {isOpen && (
                  <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] p-4">
                    <p className="case-label mb-4">Interview pipeline</p>

                    <div className="space-y-0">
                      {c.stages.map((s, si) => {
                        const stageMeta =
                          STAGE_STATUS_META[s.status] ?? STAGE_STATUS_META.pending;
                        const badgeClass =
                          STAGE_STATUS_BADGE[s.status] ?? STAGE_STATUS_BADGE.pending;
                        const statusLabel =
                          STAGE_STATUS_LABEL[s.status] ?? s.status;
                        const isMe = s.decidedById === currentUserId;
                        const isLast = si === c.stages.length - 1;
                        const kindIcon = STAGE_KIND_ICON[s.kind] ?? "📌";
                        const hasReport = Boolean(s.reportKey);
                        const isSkipped = s.status === "skipped";

                        return (
                          <div key={s.id} className="flex gap-3">
                            {/* Timeline track */}
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                                  stageMeta.iconClass,
                                  isSkipped && "opacity-50",
                                )}
                              >
                                {stageMeta.icon}
                              </div>
                              {!isLast && (
                                <div
                                  className="my-1 w-px flex-1 bg-[var(--cream-2)]"
                                  style={{ minHeight: "14px" }}
                                />
                              )}
                            </div>

                            {/* Stage content */}
                            <div
                              className={cn(
                                "flex-1 pb-4",
                                isLast && "pb-0",
                                isSkipped && "opacity-50",
                              )}
                            >
                              {/* Stage name row */}
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-sm font-bold text-[var(--ink)]",
                                    isSkipped && "line-through",
                                  )}
                                >
                                  {kindIcon} {s.label}
                                </span>

                                {/* Status badge */}
                                {s.status !== "pending" && (
                                  <span
                                    className={cn(
                                      "rounded-full border px-2 py-0.5 text-[9px] font-bold",
                                      badgeClass,
                                    )}
                                  >
                                    {statusLabel}
                                  </span>
                                )}

                                {/* "You" badge */}
                                {isMe && (
                                  <span className="rounded-full border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--cyan-d)]">
                                    ★ You
                                  </span>
                                )}
                              </div>

                              {/* Assignee + date + report */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--ink-faint)]">
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
                                {hasReport && (
                                  <a
                                    href={`/api/stages/${s.id}/report`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 font-semibold text-[var(--cyan-d)] hover:underline"
                                  >
                                    📄 Report
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Link to full case file */}
                    <div className="mt-4 border-t border-[var(--cream-2)] pt-3">
                      <a
                        href={`/evaluate/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cyan-d)] hover:underline"
                      >
                        View full case file →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
