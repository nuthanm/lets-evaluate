"use client";

import { useState, useMemo } from "react";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/lib/auth/config";

type Question = {
  id: string;
  questionText: string;
  category: string;
  difficulty: string;
  roleId: string | null;
  code: string;
  visibility: "org" | "private";
  createdById: string | null;
};

type RoleOption = { id: string; name: string };

const CATEGORIES = [
  "Resume based",
  "Backend",
  "Frontend",
  "Architecture",
  "Scenario based",
  "Code error spotting",
  "Refactoring",
  "Technical",
  "General",
  // Manager round categories
  "Leadership & Ownership",
  "People Management",
  "Conflict Resolution",
  "Decision Making",
  // Shared people categories (manager + HR)
  "Communication",
  "Culture Fit",
  // HR round categories
  "Behavioural",
  "Career Motivation",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-[var(--green)] bg-[var(--green-soft)] border-[var(--green)]/20",
  Medium: "text-[var(--orange)] bg-[var(--orange-soft)] border-[var(--orange)]/20",
  Hard: "text-red-600 bg-red-50 border-red-200",
};

const CAT_ICONS: Record<string, string> = {
  "Resume based": "📄",
  Backend: "⚙️",
  Frontend: "🖥️",
  Architecture: "🏗️",
  "Scenario based": "💡",
  "Code error spotting": "🐛",
  Refactoring: "✏️",
  Technical: "🔧",
  General: "📋",
  "Leadership & Ownership": "🧭",
  "People Management": "🤝",
  "Conflict Resolution": "⚖️",
  "Decision Making": "🎯",
  Communication: "💬",
  "Culture Fit": "🌱",
  Behavioural: "🧩",
  "Career Motivation": "🚀",
};

export function QuestionLibraryClient({
  questions: initial,
  roles,
  currentUserId,
  userRole,
}: {
  questions: Question[];
  roles: RoleOption[];
  currentUserId: string;
  userRole: MemberRole;
}) {
  const [questions, setQuestions] = useState(initial);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDiff, setFilterDiff] = useState("All");
  const [filterVis, setFilterVis] = useState<"all" | "org" | "private">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState("");
  const [addCat, setAddCat] = useState(CATEGORIES[0]);
  const [addDiff, setAddDiff] = useState("Medium");
  const [addCode, setAddCode] = useState("");
  const [addVis, setAddVis] = useState<"org" | "private">("org");
  const [addRoleId, setAddRoleId] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [enhancingAdd, setEnhancingAdd] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyQuestion(q: Question) {
    const text = q.code?.trim()
      ? `${q.questionText}\n\nCode:\n${q.code}`
      : q.questionText;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(q.id);
    setTimeout(() => setCopiedId((prev) => (prev === q.id ? null : prev)), 2000);
  }

  const usedCategories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category));
    return CATEGORIES.filter((c) => cats.has(c));
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (search && !q.questionText.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== "All" && q.category !== filterCat) return false;
      if (filterRole !== "all" && q.roleId !== filterRole) return false;
      if (filterDiff !== "All" && q.difficulty !== filterDiff) return false;
      if (filterVis === "org" && q.visibility !== "org") return false;
      if (filterVis === "private" && q.visibility !== "private") return false;
      return true;
    });
  }, [questions, search, filterCat, filterRole, filterDiff, filterVis]);

  async function deleteQuestion(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function enhanceAddText() {
    if (!addText.trim()) return;
    setEnhancingAdd(true);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: addText.trim(), type: "question" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.enhanced) {
        setAddText(data.enhanced as string);
      }
    } finally {
      setEnhancingAdd(false);
    }
  }

  async function addQuestion() {
    if (!addText.trim()) {
      setAddError("Question text is required.");
      return;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: addText.trim(),
          category: addCat,
          difficulty: addDiff,
          code: addCode.trim() || undefined,
          visibility: addVis,
          roleId: addRoleId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError((data as { error?: string }).error ?? "Could not save question.");
        return;
      }
      const newQ: Question = {
        id: (data as { id: string }).id,
        questionText: addText.trim(),
        category: addCat,
        difficulty: addDiff,
        code: addCode.trim(),
        visibility: addVis,
        roleId: addRoleId || null,
        createdById: currentUserId,
      };
      setQuestions((prev) => [newQ, ...prev]);
      setAddText("");
      setAddCode("");
      setAddDiff("Medium");
      setAddVis("org");
      setAddRoleId("");
      setAddOpen(false);
    } finally {
      setAddBusy(false);
    }
  }

  const canDelete = (q: Question) =>
    userRole === "admin" || q.createdById === currentUserId;

  return (
    <div className="space-y-4">
      {/* ── Add question panel ── */}
      <div className="case-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--cream-2)] px-4 py-3">
          <span className="font-serif text-sm font-bold text-[var(--ink)]">
            {addOpen ? "New question" : "Add to library"}
          </span>
          <button
            type="button"
            onClick={() => { setAddOpen((v) => !v); setAddError(null); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              addOpen
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--cyan)]/40 bg-[var(--cyan-soft)] text-[var(--cyan-d)] hover:border-[var(--cyan)]",
            )}
          >
            {addOpen ? "✕ Cancel" : "+ Add question"}
          </button>
        </div>
        {addOpen && (
          <div className="p-4 space-y-3">
            <div>
              <label className="case-label mb-1.5 block">
                Question text <span className="text-[var(--orange)]">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Explain the difference between REST and GraphQL…"
                value={addText}
                onChange={(e) => { setAddText(e.target.value); setAddError(null); }}
                className="case-input w-full resize-y px-3 py-2 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!addText.trim() || enhancingAdd}
                  onClick={enhanceAddText}
                  title={!addText.trim() ? "Type a question first" : "Improve this question with AI"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan)] bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:bg-[var(--cyan)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--cream-2)] disabled:bg-[var(--cream)] disabled:text-[var(--ink-faint)]"
                >
                  {enhancingAdd ? (
                    <>
                      <svg className="animate-spin size-3" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity=".3"/>
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Enhancing…
                    </>
                  ) : (
                    <>✨ Enhance with AI</>
                  )}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="case-label mb-1.5 block">Category</label>
                <select
                  value={addCat}
                  onChange={(e) => setAddCat(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="case-label mb-1.5 block">Difficulty</label>
                <select
                  value={addDiff}
                  onChange={(e) => setAddDiff(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  {["Easy", "Medium", "Hard"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="case-label mb-1.5 block">Visibility</label>
                <select
                  value={addVis}
                  onChange={(e) => setAddVis(e.target.value as "org" | "private")}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="org">🏢 Shared with org</option>
                  <option value="private">🔒 Only me</option>
                </select>
              </div>
              <div>
                <label className="case-label mb-1.5 block">Role (optional)</label>
                <select
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="">Any role</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="case-label mb-1.5 block">Code snippet (optional)</label>
              <textarea
                rows={3}
                placeholder="Paste a code snippet if relevant…"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                className="case-input w-full resize-y px-3 py-2 font-mono text-xs"
              />
            </div>
            {addError && (
              <p className="text-xs font-semibold text-[var(--orange)]">{addError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setAddOpen(false); setAddError(null); setAddText(""); setAddCode(""); }}
                className="rounded-lg border border-[var(--cream-2)] bg-white px-4 py-2 text-xs font-bold text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addQuestion}
                disabled={addBusy}
                className="rounded-lg bg-[var(--ink)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--navy)] transition-colors disabled:opacity-50"
              >
                {addBusy ? "Saving…" : "Save to library"}
              </button>
            </div>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--cream-2)] bg-white py-16 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-[var(--cream)] text-3xl">📚</div>
          <div>
            <h3 className="font-serif text-xl font-bold">Your library is empty</h3>
            <p className="mt-1 text-sm text-[var(--ink-faint)]">
              Add questions directly, or save them during interview evaluations.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => { setAddOpen(true); setAddError(null); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--navy)]"
            >
              + Add first question
            </button>
            <a
              href={userRole === "interviewer" || userRole === "manager" || userRole === "hr" ? "/assignments" : "/candidates"}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--cream-2)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-all hover:border-[var(--ink)]"
            >
              {userRole === "interviewer" || userRole === "manager" || userRole === "hr" ? "View my assignments →" : "Go to candidates →"}
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-2">
            <div className="case-card flex items-center gap-3 px-4 py-2.5">
              <span className="font-serif text-2xl font-bold">{questions.length}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Total</span>
            </div>
            <div className="case-card flex items-center gap-3 px-4 py-2.5">
              <span className="font-serif text-2xl font-bold">{questions.filter(q => q.visibility === "org").length}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Shared</span>
            </div>
            <div className="case-card flex items-center gap-3 px-4 py-2.5">
              <span className="font-serif text-2xl font-bold">{questions.filter(q => q.visibility === "private").length}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Private</span>
            </div>
            <div className="case-card flex items-center gap-3 px-4 py-2.5">
              <span className="font-serif text-2xl font-bold">{usedCategories.length}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Categories</span>
            </div>
          </div>

          {/* Filters */}
          <div className="case-card p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-4">
                <input
                  type="search"
                  placeholder="Search questions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="case-input px-4 py-2.5 text-sm"
                />
              </div>

              {/* Category filter */}
              <div>
                <label className="case-label mb-1.5 block">Category</label>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="All">All categories</option>
                  {usedCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty filter */}
              <div>
                <label className="case-label mb-1.5 block">Difficulty</label>
                <select
                  value={filterDiff}
                  onChange={(e) => setFilterDiff(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="All">All difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Role filter */}
              <div>
                <label className="case-label mb-1.5 block">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="all">All roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Visibility filter */}
              <div>
                <label className="case-label mb-1.5 block">Visibility</label>
                <select
                  value={filterVis}
                  onChange={(e) => setFilterVis(e.target.value as typeof filterVis)}
                  className="case-input px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="org">🏢 Shared with org</option>
                  <option value="private">🔒 Only me</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category pill shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCat("All")}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                filterCat === "All"
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)]",
              )}
            >
              All ({questions.length})
            </button>
            {usedCategories.map((c) => {
              const count = questions.filter((q) => q.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCat(c === filterCat ? "All" : c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                    filterCat === c
                      ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                      : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--cyan)]",
                  )}
                >
                  {CAT_ICONS[c] ?? "📋"} {c} ({count})
                </button>
              );
            })}
          </div>

          {/* Results count */}
          {filtered.length !== questions.length && (
            <p className="text-[13px] text-[var(--ink-faint)]">
              Showing {filtered.length} of {questions.length} questions
            </p>
          )}

          {/* Question list */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--cream-2)] bg-white px-4 py-8 text-center">
              <p className="text-sm text-[var(--ink-faint)]">No questions match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((q, i) => {
                const isOpen = expandedId === q.id;
                const roleName = roles.find((r) => r.id === q.roleId)?.name;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "case-card overflow-hidden transition-shadow",
                      isOpen && "shadow-md",
                    )}
                  >
                    {/* Header row */}
                    <div className="flex w-full items-start hover:bg-[var(--cream)] transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : q.id)}
                        className="flex flex-1 items-start gap-3 p-4 text-left"
                      >
                        <span className="font-serif text-base text-[var(--ink-faint)] shrink-0">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cream-2)] bg-[var(--cream)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                              {CAT_ICONS[q.category] ?? "📋"} {q.category}
                            </span>
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                              DIFFICULTY_COLORS[q.difficulty] ?? DIFFICULTY_COLORS.Medium
                            )}>
                              {q.difficulty}
                            </span>
                            {roleName && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--cyan-d)]">
                                {roleName}
                              </span>
                            )}
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              q.visibility === "private"
                                ? "border-[var(--cream-2)] bg-[var(--cream-2)] text-[var(--ink-faint)]"
                                : "border-[var(--green)]/20 bg-[var(--green-soft)] text-[var(--green)]",
                            )}>
                              {q.visibility === "private" ? "🔒 Private" : "🏢 Shared"}
                            </span>
                          </div>
                          <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                            {q.questionText}
                          </p>
                        </div>
                        <svg
                          className={cn("mt-0.5 size-4 shrink-0 text-[var(--ink-faint)] transition-transform", isOpen && "rotate-180")}
                          fill="none" viewBox="0 0 16 16"
                        >
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Copy + delete buttons */}
                      <div className="flex shrink-0 items-center gap-1.5 pr-3 pt-3.5">
                        <button
                          type="button"
                          onClick={() => copyQuestion(q)}
                          title="Copy question to clipboard"
                          className="rounded-lg border border-transparent p-1.5 text-[var(--ink-faint)] transition-colors hover:border-[var(--cyan)]/30 hover:bg-[var(--cyan-soft)] hover:text-[var(--cyan-d)]"
                        >
                          {copiedId === q.id ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <rect x="4" y="4" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M4 3V2.5A1.5 1.5 0 0 0 2.5 1H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      {canDelete(q) && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {pendingDeleteId === q.id ? (
                            <>
                              <span className="text-[11px] font-semibold text-[var(--orange)]">Delete?</span>
                              <button
                                type="button"
                                onClick={() => { deleteQuestion(q.id); setPendingDeleteId(null); }}
                                disabled={deletingId === q.id}
                                className="rounded border border-[var(--orange)]/40 bg-[var(--orange-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--orange)] transition-colors hover:bg-[var(--orange)] hover:text-white disabled:opacity-50"
                              >
                                {deletingId === q.id ? "…" : "Yes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="rounded border border-[var(--cream-2)] bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)]"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(q.id)}
                              title="Delete question"
                              className="rounded-lg border border-transparent p-1.5 text-[var(--ink-faint)] transition-colors hover:border-[var(--orange)]/30 hover:bg-[var(--orange-soft)] hover:text-[var(--orange)]"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 3h8M5 3V2h2v1M4 5v4M8 5v4M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] p-4 space-y-3">
                        {q.code && (
                          <div>
                            <p className="case-label mb-1.5">Code snippet</p>
                            <pre className="overflow-auto rounded-lg border border-[var(--cream-2)] bg-white p-3 text-xs leading-relaxed">
                              <code>{q.code}</code>
                            </pre>
                          </div>
                        )}
                        <p className="text-[11px] text-[var(--ink-faint)]">
                          Question #{q.id.slice(0, 8).toUpperCase()}
                          {roleName ? ` · ${roleName}` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
