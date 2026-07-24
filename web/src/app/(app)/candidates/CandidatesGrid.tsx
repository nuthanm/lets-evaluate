"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Button } from "@/components/Button";
import { EmailComposer } from "@/components/EmailComposer";
import { FieldInput, FieldLabel, FieldSelect } from "@/components/FormField";
import type { RenderedMail } from "@/lib/email";
import { cn } from "@/lib/utils";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";
import {
  candidateNeedsAction,
  nextActionForCandidate,
} from "@/lib/recruiter/tasks";

export type GridCandidate = {
  id: string;
  name: string;
  email: string;
  status: string;
  projectId: string | null;
  roleId: string | null;
  projectName: string | null;
  roleName: string | null;
  roleLevel: string | null;
  resumeFilename: string | null;
  hasResume: boolean;
  techScore: number | null;
  screeningDecision: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  isOwner?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GridProject = { id: string; name: string };
export type GridRole = {
  id: string;
  name: string;
  projectId: string | null;
  projectIds: string[];
};

type Tone = "active" | "selected" | "hold" | "rejected" | "draft";

type StageMeta = {
  label: string;
  percent: number;
  rank: number;
  tone: Tone;
};

const STAGE_META: Record<string, StageMeta> = {
  draft: { label: "Draft", percent: 8, rank: 0, tone: "draft" },
  screening: { label: "Screening", percent: 35, rank: 2, tone: "active" },
  screened_hold: { label: "Screen hold", percent: 35, rank: 2, tone: "hold" },
  screened_rejected: {
    label: "Screen reject",
    percent: 100,
    rank: 2,
    tone: "rejected",
  },
  ready_for_interview: { label: "Ready", percent: 55, rank: 4, tone: "active" },
  assigned: { label: "Assigned", percent: 68, rank: 5, tone: "active" },
  interview_in_progress: {
    label: "Interviewing",
    percent: 82,
    rank: 6,
    tone: "active",
  },
  interview_complete: {
    label: "Interviewed",
    percent: 92,
    rank: 7,
    tone: "active",
  },
  selected: { label: "Selected", percent: 100, rank: 9, tone: "selected" },
  rejected: { label: "Rejected", percent: 100, rank: 8, tone: "rejected" },
  hold: { label: "On hold", percent: 90, rank: 8, tone: "hold" },
};

function stageMeta(status: string): StageMeta {
  return (
    STAGE_META[status] ?? {
      label: status.replace(/_/g, " "),
      percent: 20,
      rank: 1,
      tone: "active",
    }
  );
}

const TONE_BAR: Record<Tone, string> = {
  active: "bg-[var(--cyan)]",
  selected: "bg-[var(--green)]",
  hold: "bg-[var(--orange)]",
  rejected: "bg-[#c0392b]",
  draft: "bg-[var(--ink-faint)]",
};

const TONE_TEXT: Record<Tone, string> = {
  active: "text-[var(--cyan-d)]",
  selected: "text-[var(--green)]",
  hold: "text-[var(--orange)]",
  rejected: "text-[#c0392b]",
  draft: "text-[var(--ink-faint)]",
};

const TONE_PILL: Record<Tone, string> = {
  active: "border-[var(--cyan)]/20 bg-[var(--cyan-soft)] text-[var(--cyan-d)]",
  selected: "border-[var(--green)]/20 bg-[var(--green-soft)] text-[var(--green)]",
  hold: "border-[var(--orange)]/20 bg-[var(--orange-soft)] text-[var(--orange)]",
  rejected: "border-[#c0392b]/20 bg-[#c0392b]/10 text-[#c0392b]",
  draft: "border-[var(--cream-2)] bg-[var(--cream-2)] text-[var(--ink-soft)]",
};

type ToneFilter = "all" | Tone | "action";
type QuickFilter = "all" | "unmapped";
type OwnershipFilter = "all" | "mine" | string;

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "active", label: "In progress" },
  { tone: "selected", label: "Selected" },
  { tone: "hold", label: "On hold" },
  { tone: "rejected", label: "Rejected" },
  { tone: "draft", label: "Draft" },
];

type SortKey = "name" | "project" | "role" | "stage" | "score" | "updated";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scoreTone(score: number): Tone {
  if (score >= 70) return "selected";
  if (score >= 40) return "hold";
  return "rejected";
}

export function CandidatesGrid({
  candidates,
  projects,
  roles,
  currentUserId,
}: {
  candidates: GridCandidate[];
  projects: GridProject[];
  roles: GridRole[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuickFilter: QuickFilter =
    searchParams.get("quick")?.toLowerCase() === "unmapped" ? "unmapped" : "all";
  const [query, setQuery] = useState("");
  const [toneFilter, setToneFilter] = useState<ToneFilter>("action");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialQuickFilter);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "updated",
    dir: "desc",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<GridCandidate | null>(null);
  const [deleting, setDeleting] = useState<GridCandidate[] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<string | null>(null);
  const [preparedDeleteMails, setPreparedDeleteMails] = useState<RenderedMail[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const recruiters = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of candidates) {
      if (c.createdById) {
        map.set(c.createdById, c.createdByName ?? "Unknown recruiter");
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates]);

  const ownershipScoped = useMemo(() => {
    if (ownershipFilter === "all") return candidates;
    if (ownershipFilter === "mine") {
      return candidates.filter(
        (c) => c.isOwner || (currentUserId && c.createdById === currentUserId),
      );
    }
    return candidates.filter((c) => c.createdById === ownershipFilter);
  }, [candidates, ownershipFilter, currentUserId]);

  const toneCounts = useMemo(() => {
    const counts: Record<ToneFilter, number> = {
      all: ownershipScoped.length,
      action: ownershipScoped.filter((c) => candidateNeedsAction(c.status)).length,
      active: 0,
      selected: 0,
      hold: 0,
      rejected: 0,
      draft: 0,
    };
    for (const c of ownershipScoped) counts[stageMeta(c.status).tone] += 1;
    return counts;
  }, [ownershipScoped]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = ownershipScoped.filter((c) => {
      if (quickFilter === "unmapped" && c.projectId && c.roleId) return false;
      if (toneFilter === "action") {
        if (!candidateNeedsAction(c.status)) return false;
      } else if (toneFilter !== "all") {
        const tone = stageMeta(c.status).tone;
        if (tone !== toneFilter) return false;
      }
      if (!q) return true;
      return [c.name, c.email, c.projectName, c.roleName]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    const cmp = (a: GridCandidate, b: GridCandidate) => {
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "project":
          return (a.projectName ?? "").localeCompare(b.projectName ?? "") * dir;
        case "role":
          return (a.roleName ?? "").localeCompare(b.roleName ?? "") * dir;
        case "stage":
          return (stageMeta(a.status).rank - stageMeta(b.status).rank) * dir;
        case "score":
          return ((a.techScore ?? -1) - (b.techScore ?? -1)) * dir;
        case "updated":
        default:
          return (
            (new Date(a.updatedAt).getTime() -
              new Date(b.updatedAt).getTime()) *
            dir
          );
      }
    };
    return [...filtered].sort(cmp);
  }, [ownershipScoped, query, toneFilter, quickFilter, sort]);

  function canEditRow(c: GridCandidate) {
    return c.isOwner !== false;
  }

  const selectedVisibleCount = useMemo(
    () => visible.filter((c) => selectedIds.has(c.id)).length,
    [visible, selectedIds],
  );
  const allVisibleSelected = visible.length > 0 && selectedVisibleCount === visible.length;
  const hasSelected = selectedIds.size > 0;

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "project" || key === "role" ? "asc" : "desc" },
    );
  }

  function deleteScopeText(candidate: GridCandidate) {
    if (["draft", "screening"].includes(candidate.status) && !candidate.screeningDecision) {
      return "No AI or recruiter analysis has been recorded yet.";
    }
    if (["screened_hold", "screened_rejected"].includes(candidate.status) || candidate.screeningDecision) {
      return "Screening analysis already exists. A candidate notice email will be prepared before removal.";
    }
    return "Interview-stage records and follow-up notes will also be removed. A candidate notice email will be prepared before removal.";
  }

  async function confirmDelete() {
    if (!deleting || deleting.length === 0) return;
    if (deleteConfirm.trim() !== "DELETE") {
      setDeleteError('Type DELETE exactly to confirm the removal.');
      return;
    }

    setDeleteBusy(true);
    setDeleteError(null);
    const mails: RenderedMail[] = [];
    const deletedNames: string[] = [];
    const failed: string[] = [];

    for (const candidate of deleting) {
      setBusyId(candidate.id);
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: deleteConfirm.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        failed.push(`${candidate.name}${data.error ? ` (${data.error as string})` : ""}`);
        continue;
      }

      deletedNames.push(candidate.name);
      if (data.mail) mails.push(data.mail as RenderedMail);
    }

    setBusyId(null);
    setDeleteBusy(false);

    if (deletedNames.length === 0) {
      setDeleteError(
        failed.length
          ? `Could not delete candidates: ${failed.join(", ")}`
          : "Could not delete selected candidates.",
      );
      return;
    }

    setPreparedDeleteMails(mails.length ? mails : null);
    const summary =
      deletedNames.length === 1
        ? `Removed ${deletedNames[0]}`
        : `Removed ${deletedNames.length} candidates`;
    const suffix =
      mails.length > 0
        ? " and prepared candidate notice email drafts."
        : ".";
    setDeleteBanner(
      `${summary}${suffix}`,
    );

    if (failed.length > 0) {
      setDeleteError(
        `Deleted ${deletedNames.length}. Could not delete ${failed.length}: ${failed.join(", ")}`,
      );
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleting.forEach((c) => next.delete(c.id));
      return next;
    });
    setDeleting(null);
    setDeleteConfirm("");
    router.refresh();
  }

  function openDeleteModal(candidate: GridCandidate) {
    setDeleting([candidate]);
    setDeleteConfirm("");
    setDeleteError(null);
  }

  function openBulkDeleteModal() {
    const targets = candidates.filter((c) => selectedIds.has(c.id));
    if (targets.length === 0) return;
    setDeleting(targets);
    setDeleteConfirm("");
    setDeleteError(null);
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const editable = visible.filter((c) => canEditRow(c));
      const allEditableSelected =
        editable.length > 0 && editable.every((c) => next.has(c.id));
      if (allEditableSelected) {
        editable.forEach((c) => next.delete(c.id));
      } else {
        editable.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {deleteBanner && (
        <div className="case-alert border-[var(--orange)]/30 bg-[var(--orange-soft)] text-[var(--ink)]">
          <strong>Deletion recorded.</strong> {deleteBanner}
        </div>
      )}
      {preparedDeleteMails && (
        <EmailComposer
          mails={preparedDeleteMails}
          title="Deletion notice prepared"
          onClose={() => setPreparedDeleteMails(null)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, project, role…"
            className="case-input w-full !pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="ownership-filter">
            Filter by recruiter
          </label>
          <select
            id="ownership-filter"
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
            className="case-input !w-auto !py-1.5 text-xs font-bold"
          >
            <option value="all">All recruiters</option>
            <option value="mine">Mine only</option>
            {recruiters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setQuickFilter((prev) => (prev === "unmapped" ? "all" : "unmapped"))}
            aria-pressed={quickFilter === "unmapped"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              quickFilter === "unmapped"
                ? "border-[var(--green)]/30 bg-[var(--green-soft)] text-[var(--green)]"
                : "border-[var(--cream-2)] bg-white text-[var(--ink-faint)] hover:text-[var(--ink)]",
            )}
          >
            Unmapped only
            <span
              className={cn(
                quickFilter === "unmapped" ? "text-[var(--green)]/70" : "text-[var(--ink-faint)]",
              )}
            >
              {ownershipScoped.filter((c) => !c.projectId || !c.roleId).length}
            </span>
          </button>
          {(["action", "all", "active", "selected", "hold", "rejected", "draft"] as const).map(
            (t) => {
              const active = toneFilter === t;
              const dotTone = t === "all" || t === "action" ? null : (t as Tone);
              const label =
                t === "all"
                  ? "All"
                  : t === "action"
                    ? "Needs action"
                    : t === "active"
                      ? "In progress"
                      : t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setToneFilter(t)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--cream-2)] bg-white text-[var(--ink-faint)] hover:text-[var(--ink)]",
                  )}
                >
                  {dotTone ? (
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        TONE_BAR[dotTone],
                      )}
                    />
                  ) : null}
                  {label}
                  <span className={cn(active ? "text-white/70" : "text-[var(--ink-faint)]")}>
                    {toneCounts[t]}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {quickFilter === "unmapped" ? (
        <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green-soft)] px-3 py-2 text-xs text-[var(--ink)]">
          Showing candidates missing project or role mapping so recruiters can complete assignment context faster.
        </div>
      ) : null}

      {hasSelected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#c0392b]/20 bg-[#c0392b]/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--ink)]">
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={deleteBusy}
              className="px-3 py-1.5 text-xs"
            >
              Clear selection
            </Button>
            <Button
              onClick={openBulkDeleteModal}
              disabled={deleteBusy}
              className="bg-[#c0392b] px-3 py-1.5 text-xs hover:bg-[#a93226]"
            >
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--cream-2)] bg-[var(--cream)] text-left">
                <th className="w-10 px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible candidates"
                    checked={allVisibleSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
                    }}
                    onChange={toggleVisibleSelection}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--cream-2)] text-[var(--cyan-d)] focus:ring-[var(--cyan)]"
                  />
                </th>
                <SortHeader
                  label="Candidate"
                  active={sort.key === "name"}
                  dir={sort.dir}
                  onClick={() => toggleSort("name")}
                  className="pl-4"
                />
                <SortHeader
                  label="Project"
                  active={sort.key === "project"}
                  dir={sort.dir}
                  onClick={() => toggleSort("project")}
                />
                <SortHeader
                  label="Role"
                  active={sort.key === "role"}
                  dir={sort.dir}
                  onClick={() => toggleSort("role")}
                />
                <SortHeader
                  label="Stage & progress"
                  active={sort.key === "stage"}
                  dir={sort.dir}
                  onClick={() => toggleSort("stage")}
                />
                <SortHeader
                  label="Match"
                  active={sort.key === "score"}
                  dir={sort.dir}
                  onClick={() => toggleSort("score")}
                />
                <SortHeader
                  label="Resume"
                  active={false}
                  dir={sort.dir}
                  onClick={() => {}}
                  sortable={false}
                />
                <SortHeader
                  label="Updated"
                  active={sort.key === "updated"}
                  dir={sort.dir}
                  onClick={() => toggleSort("updated")}
                />
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                  Owner
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                  Next action
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-[var(--ink-faint)]"
                  >
                    No candidates match your search.
                  </td>
                </tr>
              ) : (
                visible.map((c) => {
                  const meta = stageMeta(c.status);
                  const checked = selectedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/evaluate/${c.id}`)}
                      className="group cursor-pointer border-b border-[var(--cream-2)] transition-colors last:border-b-0 hover:bg-[var(--cyan-soft)]/40"
                    >
                      <td className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${c.name}`}
                          checked={checked}
                          disabled={!canEditRow(c)}
                          onChange={() => {
                            if (!canEditRow(c)) return;
                            toggleRowSelection(c.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer rounded border-[var(--cream-2)] text-[var(--cyan-d)] focus:ring-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-2.5">
                          <FaceAvatar name={c.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--ink)]">
                              {c.name}
                            </div>
                            <div className="truncate text-[11px] text-[var(--ink-faint)]">
                              {c.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--ink-soft)]">
                        {c.projectName ?? (
                          <span className="text-[var(--ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.roleName ? (
                          <span className="text-[var(--ink-soft)]">
                            {c.roleName}
                            {c.roleLevel ? (
                              <span className="ml-1 text-[11px] text-[var(--ink-faint)]">
                                {c.roleLevel}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-[var(--ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-[150px]">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                TONE_PILL[meta.tone],
                              )}
                            >
                              {meta.label}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-bold",
                                TONE_TEXT[meta.tone],
                              )}
                            >
                              {meta.percent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cream-2)]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                TONE_BAR[meta.tone],
                              )}
                              style={{ width: `${meta.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {c.techScore === null ? (
                          <span className="text-[var(--ink-faint)]">—</span>
                        ) : (
                          <span
                            className={cn(
                              "font-serif text-base font-bold",
                              TONE_TEXT[scoreTone(c.techScore)],
                            )}
                          >
                            {c.techScore}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.hasResume ? (
                          <span
                            title={c.resumeFilename ?? "Resume on file"}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--cyan-d)]"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--ink-faint)]">
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-[var(--ink-faint)]">
                        {formatDate(c.updatedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-semibold text-[var(--ink-soft)]">
                            {c.createdByName ?? "—"}
                          </span>
                          {!canEditRow(c) && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--ink-faint)]">
                              View only
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const next = nextActionForCandidate(c.id, c.status);
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(next.href);
                              }}
                              className="text-[11px] font-semibold text-[var(--cyan-d)] hover:underline"
                            >
                              {canEditRow(c) ? `${next.label} →` : "Open →"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canEditRow(c)) return;
                              setEditing(c);
                            }}
                            disabled={!canEditRow(c)}
                            title={
                              canEditRow(c)
                                ? "Edit candidate"
                                : "Only the owning recruiter can edit"
                            }
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--cream-2)] bg-white text-[var(--ink-soft)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan-d)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canEditRow(c)) return;
                              openDeleteModal(c);
                            }}
                            disabled={busyId === c.id || !canEditRow(c)}
                            title={
                              canEditRow(c)
                                ? "Delete candidate"
                                : "Only the owning recruiter can delete"
                            }
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--cream-2)] bg-white text-[#c0392b] transition-colors hover:border-[#c0392b] hover:bg-[#c0392b]/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--ink-faint)]">
        <span className="font-bold uppercase tracking-[0.06em]">Legend</span>
        {LEGEND.map((l) => (
          <span key={l.tone} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-4 rounded-full", TONE_BAR[l.tone])} />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="font-serif font-bold text-[var(--green)]">%</span>
          Match = résumé tech-fit score · bar = pipeline progress
        </span>
      </div>

      {editing ? (
        <EditModal
          candidate={editing}
          projects={projects}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {deleting ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => {
            if (!deleteBusy) setDeleting(null);
          }}
        >
          <div
            className="case-card w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold">
                  {deleting.length > 1 ? "Delete candidates" : "Delete candidate"}
                </h2>
                <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">
                  This action permanently removes candidate records and related workflow data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-[var(--ink-faint)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--ink)] disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-4 text-[13px] text-[var(--ink-soft)]">
              {deleting.length > 1 ? (
                <>
                  <div className="font-bold text-[var(--ink)]">{deleting.length} candidates selected</div>
                  <div className="mt-1 text-[12px] text-[var(--ink-faint)]">
                    Includes profile, screening, stage progression, and attached resume references.
                  </div>
                  <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-[var(--cream-2)] bg-white p-2 text-[12px]">
                    {deleting.slice(0, 8).map((candidate) => (
                      <div key={candidate.id} className="truncate py-0.5">
                        {candidate.name}
                      </div>
                    ))}
                    {deleting.length > 8 ? (
                      <div className="pt-1 text-[var(--ink-faint)]">
                        +{deleting.length - 8} more
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-[var(--ink)]">{deleting[0].name}</div>
                  <div>{deleting[0].email || "No email on file"}</div>
                  <div>
                    {deleting[0].projectName ?? "No project"}
                    {deleting[0].roleName ? ` · ${deleting[0].roleName}` : ""}
                  </div>
                  <div className="mt-2 text-[12px] font-semibold text-[var(--ink-faint)]">
                    Current stage: {deleting[0].status.replace(/_/g, " ")}
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--ink-faint)]">
                    {deleteScopeText(deleting[0])}
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--orange)]/20 bg-[var(--orange-soft)] p-4 text-[13px] text-[var(--ink)]">
              <strong>Type DELETE to continue.</strong> This prevents accidental removal.
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor="delete-confirm">Confirmation text</FieldLabel>
              <FieldInput
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>

            {deleteError && <p className="mt-3 text-sm font-semibold text-red-600">{deleteError}</p>}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteBusy || deleteConfirm.trim() !== "DELETE"}
                className="bg-[#c0392b] hover:bg-[#a93226]"
              >
                {deleteBusy
                  ? "Deleting…"
                  : deleting.length > 1
                    ? `Delete ${deleting.length} candidates`
                    : "Delete candidate"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
  sortable = true,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
  sortable?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]",
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-[var(--ink)]",
            active && "text-[var(--ink)]",
          )}
        >
          {label}
          <span className="text-[9px] leading-none">
            {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function EditModal({
  candidate,
  projects,
  roles,
  onClose,
  onSaved,
}: {
  candidate: GridCandidate;
  projects: GridProject[];
  roles: GridRole[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(candidate.name);
  const [email, setEmail] = useState(candidate.email);
  const [projectId, setProjectId] = useState(candidate.projectId ?? "");
  const [roleId, setRoleId] = useState(candidate.roleId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectRoles = roles.filter(
    (r) =>
      !projectId ||
      r.projectId === projectId ||
      r.projectIds.includes(projectId),
  );

  async function save() {
    if (!name.trim()) {
      setError("Candidate name is required.");
      return;
    }
    if (file && !isAllowedResumeFilename(file.name)) {
      setError(RESUME_UPLOAD_FRIENDLY_ERROR);
      return;
    }
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.set("name", name.trim());
    form.set("email", email.trim());
    form.set("projectId", projectId);
    form.set("roleId", roleId);
    if (file) form.set("resume", file);

    const res = await fetch(`/api/candidates/${candidate.id}`, {
      method: "PUT",
      body: form,
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save changes. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="case-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Edit candidate</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">
              Update profile details and evidence
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg text-[var(--ink-faint)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--ink)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <FieldLabel htmlFor="edit-name">Candidate name</FieldLabel>
            <FieldInput
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Rivera"
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-email">Email</FieldLabel>
            <FieldInput
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-project">Project</FieldLabel>
            <FieldSelect
              id="edit-project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setRoleId("");
              }}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FieldSelect>
          </div>
          <div>
            <FieldLabel htmlFor="edit-role">Role</FieldLabel>
            <FieldSelect
              id="edit-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">No role</option>
              {projectRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </FieldSelect>
          </div>
          <div>
            <FieldLabel>Replace resume (optional)</FieldLabel>
            <label
              htmlFor="edit-resume"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3 text-sm transition-colors hover:border-[var(--cyan)]"
            >
              <span className="min-w-0 truncate text-[var(--ink-soft)]">
                {file
                  ? file.name
                  : candidate.resumeFilename || "Upload a PDF or DOCX resume"}
              </span>
              <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[var(--cyan-d)] shadow-sm">
                {file || candidate.hasResume ? "Change" : "Browse"}
              </span>
            </label>
            <input
              id="edit-resume"
              type="file"
              accept={RESUME_UPLOAD_ACCEPT}
              onChange={(e) => {
                const nextFile = e.target.files?.[0] ?? null;
                if (nextFile && !isAllowedResumeFilename(nextFile.name)) {
                  setFile(null);
                  setError(RESUME_UPLOAD_FRIENDLY_ERROR);
                  e.target.value = "";
                  return;
                }
                setFile(nextFile);
                setError(null);
              }}
              className="sr-only"
            />
          </div>

          {error ? (
            <p className="text-sm font-semibold text-[#c0392b]">{error}</p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-[13px]"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
