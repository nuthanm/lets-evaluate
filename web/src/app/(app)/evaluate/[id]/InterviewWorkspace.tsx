"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";
import type { ResumeMetrics } from "@/lib/ai";
import { AnalysisReport } from "./EvaluateClient";

type Metrics = Partial<ResumeMetrics>;

/** Category metadata — client bundle copy so we never import server-only AI module.
 * Ids must match the server lists in `@/lib/ai`. */
const TECHNICAL_CATEGORIES: { id: string; label: string; hint: string; code: boolean; icon: string }[] = [
  { id: "Resume based",       label: "Resume based",          hint: "Probe claims & verify real depth",       code: false, icon: "📄" },
  { id: "Backend",            label: "Backend",               hint: "APIs, data, concurrency, scaling",       code: false, icon: "⚙️" },
  { id: "Frontend",           label: "Frontend",              hint: "UI, state, rendering, a11y",             code: false, icon: "🖥️" },
  { id: "Architecture",       label: "Architecture",          hint: "System design & trade-offs",             code: false, icon: "🏗️" },
  { id: "Scenario based",     label: "Scenario based",        hint: "Real-world judgement & problem solving", code: false, icon: "💡" },
  { id: "Code error spotting",label: "Find errors in code",   hint: "Snippets with bugs to identify",         code: true,  icon: "🐛" },
  { id: "Refactoring",        label: "Refactoring techniques",hint: "Snippets to clean and improve",          code: true,  icon: "✏️" },
];

const MANAGER_CATEGORIES: { id: string; label: string; hint: string; code: boolean; icon: string }[] = [
  { id: "Resume based",           label: "Resume based",           hint: "Probe claims & verify real depth",          code: false, icon: "📄" },
  { id: "Leadership & Ownership", label: "Leadership & Ownership", hint: "Driving outcomes, owning failures",         code: false, icon: "🧭" },
  { id: "People Management",      label: "People Management",      hint: "Mentoring, feedback, delegation",           code: false, icon: "🤝" },
  { id: "Conflict Resolution",    label: "Conflict Resolution",    hint: "Difficult stakeholders & escalations",      code: false, icon: "⚖️" },
  { id: "Decision Making",        label: "Decision Making",        hint: "Trade-offs & prioritisation under ambiguity",code: false, icon: "🎯" },
  { id: "Communication",          label: "Communication",          hint: "Stakeholder updates & alignment",           code: false, icon: "💬" },
  { id: "Culture Fit",            label: "Culture Fit",            hint: "Values alignment & collaboration style",    code: false, icon: "🌱" },
];

const HR_CATEGORIES: { id: string; label: string; hint: string; code: boolean; icon: string }[] = [
  { id: "Resume based",     label: "Resume based",     hint: "Probe career history & claims",     code: false, icon: "📄" },
  { id: "Behavioural",      label: "Behavioural",      hint: "Ownership, teamwork, feedback",     code: false, icon: "🧩" },
  { id: "Communication",    label: "Communication",    hint: "Clarity & stakeholder articulation",code: false, icon: "💬" },
  { id: "Culture Fit",      label: "Culture Fit",      hint: "Values alignment & working style",  code: false, icon: "🌱" },
  { id: "Career Motivation",label: "Career Motivation",hint: "Reasons for change & expectations", code: false, icon: "🚀" },
];

type StageKind = "screening" | "technical" | "manager" | "hr" | "final" | "custom";

function categoriesForStageKind(kind: StageKind) {
  if (kind === "manager") return MANAGER_CATEGORIES;
  if (kind === "hr") return HR_CATEGORIES;
  return TECHNICAL_CATEGORIES;
}

type AiInsight = { text: string; detail: string; type: "ok" | "warn" };

function aiInsightFor(categoryId: string, metrics?: Metrics): AiInsight | null {
  if (!metrics) return null;
  switch (categoryId) {
    case "Resume based": {
      const clars = metrics.clarifications ?? [];
      if (clars.length > 0)
        return {
          text: `${clars.length} item${clars.length !== 1 ? "s" : ""} to verify`,
          detail: `Clarify: ${clars.slice(0, 3).map((c) => c.technology).join(", ")}`,
          type: "warn",
        };
      const matched = (metrics.matched_technologies ?? []).length;
      if (matched > 0)
        return {
          text: `${matched} matched skill${matched !== 1 ? "s" : ""} on file`,
          detail: (metrics.matched_technologies ?? []).slice(0, 4).join(", "),
          type: "ok",
        };
      return null;
    }
    case "Backend": {
      const missing = (metrics.missing_technologies ?? []).slice(0, 4);
      if (missing.length > 0)
        return { text: `${missing.length} tech gap${missing.length !== 1 ? "s" : ""}`, detail: `Probe: ${missing.join(", ")}`, type: "warn" };
      const concerns = metrics.concerns ?? [];
      if (concerns.length > 0)
        return { text: `${concerns.length} concern${concerns.length !== 1 ? "s" : ""} noted`, detail: concerns.slice(0, 2).join("; "), type: "warn" };
      return null;
    }
    case "Frontend": {
      const matched = (metrics.matched_technologies ?? []).filter((t) =>
        /react|vue|angular|svelte|next|css|html|ts|js|redux|tailwind/i.test(t),
      );
      if (matched.length > 0)
        return { text: `${matched.length} frontend tech${matched.length !== 1 ? "s" : ""} found`, detail: matched.slice(0, 4).join(", "), type: "ok" };
      return null;
    }
    case "Architecture": {
      const domains = metrics.domain_expertise ?? [];
      const strengths = metrics.strengths ?? [];
      if (domains.length > 0)
        return { text: `${domains.length} domain${domains.length !== 1 ? "s" : ""} of expertise`, detail: domains.slice(0, 3).join(", "), type: "ok" };
      if (strengths.length > 0)
        return { text: "Validate AI-reported strengths", detail: strengths.slice(0, 2).join("; "), type: "ok" };
      return null;
    }
    case "Scenario based": {
      const concerns = metrics.concerns ?? [];
      if (concerns.length > 0)
        return { text: `Probe ${concerns.length} concern${concerns.length !== 1 ? "s" : ""}`, detail: concerns.slice(0, 2).join("; "), type: "warn" };
      return null;
    }
    case "Code error spotting":
    case "Refactoring": {
      const tech = (metrics.matched_technologies ?? []).slice(0, 3);
      if (tech.length > 0)
        return { text: `Using their stack`, detail: `Snippets in: ${tech.join(", ")}`, type: "ok" };
      return null;
    }
    default:
      return null;
  }
}

const SATISFACTION = ["", "Satisfied", "Not satisfied"];
const SEVERITIES = ["Easy", "Medium", "Hard"];
const JUSTIFICATION_MIN_LEN = 40;

type WorkItem = {
  id: string;
  category: string;
  question: string;
  code: string;
  difficulty: string;
  expected_answer_hints: string;
  satisfaction: string;
  notes: string;
  savedToLibrary: boolean;
};

type RoleOption = { id: string; name: string };

let seq = 0;
const nextId = () => `q_${Date.now()}_${seq++}`;

export function InterviewWorkspace({
  stageId,
  stageLabel,
  stageKind = "technical",
  candidateName,
  role,
  projectName,
  metrics,
  onStepChange,
  onDone,
}: {
  stageId: string;
  stageLabel: string;
  stageKind?: StageKind;
  candidateName: string;
  role: string;
  projectName?: string;
  metrics?: Metrics;
  onStepChange?: (step: number) => void;
  onDone: () => void;
}) {
  const isManagerRound = stageKind === "manager";
  const CATEGORIES = categoriesForStageKind(stageKind);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [ratings, setRatings] = useState<
    Record<string, { recruiter?: string; interviewer?: string }>
  >({});
  const [genCategory, setGenCategory] = useState<string>(CATEGORIES[0].id);
  const [viewCategory, setViewCategory] = useState<string>("All");
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [justification, setJustification] = useState("");
  const [decision, setDecision] = useState<"yes" | "no" | "">("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [libToast, setLibToast] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualDiff, setManualDiff] = useState("Medium");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [enhancingQuestion, setEnhancingQuestion] = useState(false);
  const [enhancingJustification, setEnhancingJustification] = useState(false);

  async function enhanceText(
    text: string,
    type: "question" | "justification",
    setText: (v: string) => void,
  ) {
    if (!text.trim()) return;
    const setEnhancing = type === "question" ? setEnhancingQuestion : setEnhancingJustification;
    setEnhancing(true);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), type }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.enhanced) {
        setText(data.enhanced as string);
      }
    } finally {
      setEnhancing(false);
    }
  }

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: RoleOption[]) =>
        setRoles(
          Array.isArray(rows)
            ? rows.map((r) => ({ id: r.id, name: r.name }))
            : [],
        ),
      )
      .catch(() => {});
  }, []);

  // Notify EvaluateClient whenever the workspace step changes so the
  // tech-stack sidebar can show/hide based on the current step.
  // Manager rounds have no AI Analysis step so offset by 1 to prevent sidebar.
  useEffect(() => {
    onStepChange?.(isManagerRound ? step + 1 : step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/stages/${stageId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: genCategory, count: genCount }),
      });
      let data: { questions?: unknown[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Server error — could not generate questions. Check that all migrations have been applied.");
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "Could not generate questions.");
        return;
      }
      const generated = (data.questions ?? []) as {
        question: string;
        category: string;
        code?: string;
        difficulty?: string;
        expected_answer_hints?: string;
      }[];
      setItems((prev) => [
        ...prev,
        ...generated.map((q) => ({
          id: nextId(),
          category: q.category || genCategory,
          question: q.question,
          code: q.code ?? "",
          difficulty: q.difficulty || "Medium",
          expected_answer_hints: q.expected_answer_hints ?? "",
          satisfaction: "",
          notes: "",
          savedToLibrary: false,
        })),
      ]);
    } finally {
      setGenerating(false);
    }
  }

  function update(id: string, patch: Partial<WorkItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function showLibToast(msg: string) {
    setLibToast(msg);
    setTimeout(() => setLibToast(null), 2800);
  }

  function addManual() {
    if (!manualText.trim()) {
      setManualError("Question text is required.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: nextId(),
        category: genCategory,
        question: manualText.trim(),
        code: manualCode.trim(),
        difficulty: manualDiff,
        expected_answer_hints: "",
        satisfaction: "",
        notes: "",
        savedToLibrary: false,
      },
    ]);
    setManualText("");
    setManualCode("");
    setManualDiff("Medium");
    setManualError(null);
    setManualOpen(false);
  }

  async function saveAllToLibrary() {
    const unsaved = items.filter((it) => !it.savedToLibrary);
    if (!unsaved.length) return;
    setBulkSaving(true);
    let saved = 0;
    for (const it of unsaved) {
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: it.question,
            category: it.category,
            difficulty: it.difficulty,
            code: it.code,
            visibility: "org",
          }),
        });
        if (res.ok) {
          update(it.id, { savedToLibrary: true });
          saved++;
        }
      } catch { /* continue */ }
    }
    setBulkSaving(false);
    showLibToast(`${saved} question${saved !== 1 ? "s" : ""} saved to library ✓`);
  }

  async function submit() {
    if (items.length === 0) {
      setError("Add at least one question in Step 2 before submitting your evaluation.");
      return;
    }
    if (!decision) {
      setError("Select a recommendation — Proceed or Do not proceed.");
      return;
    }
    if (justification.trim().length < JUSTIFICATION_MIN_LEN) {
      setError(`Justification must be at least ${JUSTIFICATION_MIN_LEN} characters. Please elaborate on your assessment.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        comments: justification,
        questions: items.map((it) => ({
          category: it.category,
          question: it.question,
          code: it.code,
          difficulty: it.difficulty,
          satisfaction: it.satisfaction,
          notes: it.notes,
        })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not submit your evaluation.");
      return;
    }
    setSubmitted(true);
    setTimeout(onDone, 1500);
  }

  // Manager round: skip AI Analysis — only Questions → Final (2 steps).
  const steps: { n: 1 | 2 | 3; label: string }[] = isManagerRound
    ? [
        { n: 1, label: "Questions" },
        { n: 2, label: "Final" },
      ]
    : [
        { n: 1, label: "AI Analysis" },
        { n: 2, label: "Questions" },
        { n: 3, label: "Final" },
      ];

  if (submitted) {
    return (
      <div className="case-card case-fade-in flex items-center gap-4 border-[var(--green)] bg-[var(--green-soft)] p-6">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl shadow-sm">
          ✓
        </div>
        <div>
          <p className="font-serif text-lg font-bold text-[var(--green)]">Evaluation submitted</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            Your PDF evaluation report is being generated and will be sent to the recruiter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="case-fade-in">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-xl font-bold">Your round: {stageLabel}</h2>
        <Pill variant="orange">Awaiting your evaluation</Pill>
      </div>

      {/* Step bar */}
      <div className="mb-5 flex flex-wrap overflow-hidden rounded-xl border border-[var(--cream-2)]">
        {steps.map((s) => {
          const state = step === s.n ? "on" : step > s.n ? "done" : "idle";
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={cn(
                "eval-step flex-1",
                state === "done" && "done",
                state === "on" && "on",
              )}
              aria-current={state === "on" ? "step" : undefined}
            >
              <span className="num">{state === "done" ? "✓" : s.n}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="case-card mb-4 border-[var(--orange)] bg-[var(--orange-soft)] p-3 text-sm text-[var(--orange)]">
          {error}
        </div>
      )}

      {/* Step 1: AI Analysis — shown only for non-manager rounds */}
      {step === 1 && !isManagerRound && (
        <section className="space-y-4">
          {metrics && metrics.tech_match_score != null ? (
            <AnalysisReport
              metrics={metrics}
              candidateName={candidateName}
              role={role}
              projectName={projectName}
              ratings={ratings}
              onRatingsChange={setRatings}
            />
          ) : (
            <div className="case-card border-[var(--cyan)] bg-[var(--cyan-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">
                No AI profile analysis is available for this candidate.
              </p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Review their background manually and proceed to the questions below.
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>Continue to questions →</Button>
          </div>
        </section>
      )}

      {/* Questions — step 1 for manager, step 2 for all others */}
      {((step === 2 && !isManagerRound) || (step === 1 && isManagerRound)) && (
        <section className="space-y-4">

          {/* ── Category cards grid ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((c) => {
              const catCount = items.filter((i) => i.category === c.id).length;
              const isActive = genCategory === c.id;
              const insight = aiInsightFor(c.id, metrics);
              return (
                <button
                  key={c.id}
                  type="button"
                  title={insight?.detail}
                  onClick={() => { setGenCategory(c.id); setViewCategory(c.id); setManualOpen(false); setManualText(""); setManualCode(""); setManualError(null); }}
                  className={cn(
                    "group flex flex-col rounded-xl border p-3 text-left transition-all",
                    isActive
                      ? "border-[var(--cyan)] bg-[var(--cyan-soft)] shadow-sm"
                      : "border-[var(--cream-2)] bg-white hover:border-[var(--cyan)] hover:bg-[var(--cream)]",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xl leading-none">{c.icon}</span>
                    {catCount > 0 && (
                      <span className="rounded-full bg-[var(--cyan)] px-2 py-0.5 text-[10px] font-bold text-white">
                        {catCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[13px] font-bold leading-tight text-[var(--ink)]">{c.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[var(--ink-faint)]">{c.hint}</div>
                  {insight && (
                    <div
                      className={cn(
                        "mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        insight.type === "warn"
                          ? "bg-[var(--orange-soft)] text-[var(--orange)]"
                          : "bg-[var(--green-soft)] text-[var(--green)]",
                      )}
                    >
                      {insight.type === "warn" ? "⚠" : "✓"} {insight.text}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Generate panel for selected category ── */}
          {(() => {
            const cat = CATEGORIES.find((c) => c.id === genCategory)!;
            return (
              <div className="overflow-hidden rounded-xl border border-[var(--cyan)]/20 bg-gradient-to-r from-[var(--cyan-soft)] to-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cyan)]/15 px-4 py-3">
                  <span className="text-lg">{cat.icon}</span>
                  <h3 className="font-serif text-base font-bold text-[var(--ink)]">{cat.label}</h3>
                  {cat.code && (
                    <span className="rounded-full border border-[var(--cream-2)] bg-white px-2.5 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
                      Includes code
                    </span>
                  )}
                  <span className="text-xs text-[var(--ink-faint)]">{cat.hint}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setManualOpen((v) => !v); setManualError(null); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                        manualOpen
                          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                          : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                      )}
                    >
                      {manualOpen ? "✕ Cancel" : "➕ Add your own"}
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[var(--ink-faint)]">Count</label>
                      <select
                        value={genCount}
                        onChange={(e) => setGenCount(Number(e.target.value))}
                        className="rounded-lg border border-[var(--cream-2)] bg-white px-2 py-1.5 text-sm font-semibold"
                      >
                        {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <Button
                      onClick={generate}
                      disabled={generating}
                      className="px-6 py-2.5 text-sm"
                    >
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin size-3.5" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity=".3"/>
                            <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Generating…
                        </span>
                      ) : "Generate →"}
                    </Button>
                  </div>
                </div>
                {manualOpen && (
                  <div className="border-t border-[var(--cyan)]/15 p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                      {cat.icon} Custom question &middot; {cat.label}
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Type your question…"
                      value={manualText}
                      onChange={(e) => { setManualText(e.target.value); setManualError(null); }}
                      className="case-input w-full resize-y px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-[var(--ink-faint)]">Difficulty</label>
                        <select
                          value={manualDiff}
                          onChange={(e) => setManualDiff(e.target.value)}
                          className="rounded-lg border border-[var(--cream-2)] bg-white px-2 py-1.5 text-sm font-semibold"
                        >
                          {["Easy", "Medium", "Hard"].map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      {/* AI Enhancer for custom question */}
                      <button
                        type="button"
                        disabled={!manualText.trim() || enhancingQuestion}
                        onClick={() => enhanceText(manualText, "question", setManualText)}
                        title={!manualText.trim() ? "Type a question first" : "Improve this question with AI"}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan)] bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:bg-[var(--cyan)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--cream-2)] disabled:bg-[var(--cream)] disabled:text-[var(--ink-faint)]"
                      >
                        {enhancingQuestion ? (
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
                    {cat.code && (
                      <textarea
                        rows={4}
                        placeholder="Optional code snippet…"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="case-input w-full resize-y px-3 py-2 font-mono text-xs"
                      />
                    )}
                    {manualError && (
                      <p className="text-xs font-semibold text-[var(--orange)]">{manualError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setManualOpen(false); setManualError(null); setManualText(""); setManualCode(""); }}
                        className="rounded-lg border border-[var(--cream-2)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={addManual}
                        className="rounded-lg bg-[var(--ink)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--navy)] transition-colors"
                      >
                        Add question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Progress bar + category filter + question list ── */}
          {items.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--cream-2)] bg-[var(--cream)] px-4 py-6">
              <span className="text-2xl opacity-40">❓</span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink-soft)]">No questions yet</p>
                <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
                  Select a category above and click Generate to create tailored interview questions.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Progress summary */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2.5">
                <span className="case-label">Progress</span>
                <Pill variant="neutral" className="text-[10px]">{items.length} question{items.length !== 1 ? "s" : ""}</Pill>
                {items.filter((i) => i.satisfaction === "Satisfied").length > 0 && (
                  <Pill variant="green" className="text-[10px]">
                    {items.filter((i) => i.satisfaction === "Satisfied").length} satisfied
                  </Pill>
                )}
                {items.filter((i) => i.satisfaction === "Not satisfied").length > 0 && (
                  <Pill variant="orange" className="text-[10px]">
                    {items.filter((i) => i.satisfaction === "Not satisfied").length} not satisfied
                  </Pill>
                )}
                {/* Bulk save to library */}
                {items.filter((i) => !i.savedToLibrary).length > 0 && (
                  <button
                    type="button"
                    onClick={saveAllToLibrary}
                    disabled={bulkSaving}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--cyan)]/30 bg-white px-3 py-1 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:border-[var(--cyan)] hover:bg-[var(--cyan-soft)] disabled:opacity-50"
                  >
                    📚 {bulkSaving ? "Saving…" : `Save all to library (${items.filter((i) => !i.savedToLibrary).length})`}
                  </button>
                )}
              </div>

              {/* Toast notification */}
              {libToast && (
                <div className="case-fade-in flex items-center gap-2 rounded-xl border border-[var(--green)]/30 bg-[var(--green-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--green)]">
                  <span>✓</span> {libToast}
                </div>
              )}

              {/* Category filter tabs */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewCategory("All")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                    viewCategory === "All"
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)]",
                  )}
                >
                  All ({items.length})
                </button>
                {CATEGORIES.filter((c) => items.some((i) => i.category === c.id)).map((c) => {
                  const count = items.filter((i) => i.category === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setViewCategory(c.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                        viewCategory === c.id
                          ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                          : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--cyan)]",
                      )}
                    >
                      {c.icon} {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Questions list (filtered) */}
              <div className="space-y-3">
                {items
                  .filter((it) => viewCategory === "All" || it.category === viewCategory)
                  .map((it, i) => (
                    <QuestionCard
                      key={it.id}
                      index={i + 1}
                      item={it}
                      roles={roles}
                      onChange={(patch) => update(it.id, patch)}
                      onRemove={() => remove(it.id)}
                    />
                  ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3">
            {!isManagerRound ? (
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {items.length === 0 && (
                <span className="text-xs text-[var(--orange)] font-semibold">
                  ⚠ Add questions before continuing
                </span>
              )}
              <Button
                onClick={() => setStep(isManagerRound ? 2 : 3)}
                disabled={items.length === 0}
                className="px-6 py-2.5 text-sm disabled:opacity-50"
              >
                Continue to final →
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Final Decision — step 2 for manager, step 3 for all others */}
      {((step === 3 && !isManagerRound) || (step === 2 && isManagerRound)) && (
        <section className="space-y-4">

          {/* Pre-flight summary card */}
          <div className="case-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--cream-2)] bg-[var(--navy)] px-5 py-4">
              <span className="grid size-9 place-items-center rounded-full bg-white/10 text-lg">📊</span>
              <div>
                <h3 className="font-serif text-base font-bold text-white">
                  {isManagerRound ? "Manager round summary" : "Interview summary"}
                </h3>
                <p className="text-[11px] text-white/55">{candidateName} · {stageLabel}</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="flex items-center gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--orange-soft)] text-lg">⚠</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--orange)]">No questions recorded</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
                    You must add at least one interview question before submitting.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setStep(2)} className="shrink-0 px-4 py-2 text-sm">
                  ← Add questions
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-[var(--cream-2)]">
                  <div className="px-5 py-4 text-center">
                    <div className="font-serif text-3xl font-bold text-[var(--ink)]">{items.length}</div>
                    <div className="case-label mt-1">Questions</div>
                  </div>
                  <div className="px-5 py-4 text-center">
                    <div className="font-serif text-3xl font-bold text-[var(--green)]">
                      {items.filter((i) => i.satisfaction === "Satisfied").length}
                    </div>
                    <div className="case-label mt-1 text-[var(--green)]">Satisfied</div>
                  </div>
                  <div className="px-5 py-4 text-center">
                    <div className="font-serif text-3xl font-bold text-[var(--orange)]">
                      {items.filter((i) => i.satisfaction === "Not satisfied").length}
                    </div>
                    <div className="case-label mt-1 text-[var(--orange)]">Not satisfied</div>
                  </div>
                </div>
                {items.filter((i) => !i.satisfaction).length > 0 && (
                  <div className="flex items-center gap-2 border-t border-[var(--cream-2)] bg-[var(--orange-soft)]/50 px-5 py-3">
                    <span className="text-sm">⚠</span>
                    <span className="text-xs font-semibold text-[var(--orange)]">
                      {items.filter((i) => !i.satisfaction).length} question{items.filter((i) => !i.satisfaction).length !== 1 ? "s" : ""} not yet assessed
                    </span>
                    <button type="button" onClick={() => setStep(2)} className="ml-auto text-xs font-bold text-[var(--orange)] hover:underline">
                      Go back to assess →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Justification */}
          <div className="case-card p-5">
            <label className="font-serif text-base font-bold block">
              {isManagerRound ? "Manager's assessment" : "Interviewer justification"}
            </label>
            <p className="mt-1 mb-3 text-[13px] text-[var(--ink-faint)]">
              {isManagerRound
                ? "Summarise the candidate's leadership presence, people skills, decision-making, and cultural fit. Your notes will appear in the PDF report sent to the recruiter."
                : "Summarise performance: technical depth, strengths, concerns, and your reasoning. Your notes will appear in the PDF report sent to the recruiter."}
            </p>
            <textarea
              rows={7}
              placeholder={isManagerRound
                ? "Describe the candidate's performance across the manager round — cover leadership qualities, ownership mindset, communication style, and cultural fit. Explain why you are recommending to proceed or not proceed…"
                : "Describe the candidate's performance across the questions asked — highlight areas of strength, gaps identified, and overall technical competency. Explain why you are recommending to proceed or not proceed…"}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className={cn(
                "case-input w-full resize-y px-4 py-3 text-sm leading-relaxed",
                justification.length > 0 && justification.trim().length < JUSTIFICATION_MIN_LEN
                  ? "border-[var(--orange)] focus:border-[var(--orange)]"
                  : "",
              )}
            />
            {/* AI Enhancer for justification */}
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                disabled={!justification.trim() || enhancingJustification}
                onClick={() => enhanceText(justification, "justification", setJustification)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--cyan-d)] transition-colors hover:border-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enhancingJustification ? (
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
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[var(--ink-faint)]">
                Be specific — generic notes reduce report quality
              </span>
              <span className={cn(
                "text-[11px] font-bold",
                justification.trim().length === 0
                  ? "text-[var(--ink-faint)]"
                  : justification.trim().length < JUSTIFICATION_MIN_LEN
                    ? "text-[var(--orange)]"
                    : "text-[var(--green)]",
              )}>
                {justification.trim().length < JUSTIFICATION_MIN_LEN
                  ? `${JUSTIFICATION_MIN_LEN - justification.trim().length} more chars needed`
                  : "✓ Length OK"}
              </span>
            </div>
          </div>

          {/* Decision */}
          <div className="case-card p-5">
            <label className="font-serif text-base font-bold block mb-1">Recommendation</label>
            <p className="mb-4 text-[13px] text-[var(--ink-faint)]">
              Your recommendation moves this candidate to the next stage or closes their process.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDecision("yes")}
                className={cn(
                  "rounded-xl border-2 p-5 text-left transition-all",
                  decision === "yes"
                    ? "border-[var(--green)] bg-[var(--green-soft)] shadow-sm"
                    : "border-[var(--cream-2)] bg-white hover:border-[var(--green)] hover:bg-[var(--green-soft)]",
                )}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className={cn(
                    "grid size-8 place-items-center rounded-full text-sm font-bold transition-colors",
                    decision === "yes" ? "bg-[var(--green)] text-white" : "bg-[var(--cream-2)] text-[var(--ink-soft)]",
                  )}>✓</span>
                  <span className="font-bold text-[var(--green)]">
                    {isManagerRound ? "Recommend to proceed" : "Proceed to next round"}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  {isManagerRound
                    ? "Candidate demonstrates the leadership presence, ownership mindset, and cultural fit required for this role."
                    : "Candidate meets the technical bar. Move them forward in the hiring pipeline."}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDecision("no")}
                className={cn(
                  "rounded-xl border-2 p-5 text-left transition-all",
                  decision === "no"
                    ? "border-[var(--orange)] bg-[var(--orange-soft)] shadow-sm"
                    : "border-[var(--cream-2)] bg-white hover:border-[var(--orange)] hover:bg-[var(--orange-soft)]",
                )}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className={cn(
                    "grid size-8 place-items-center rounded-full text-sm font-bold transition-colors",
                    decision === "no" ? "bg-[var(--orange)] text-white" : "bg-[var(--cream-2)] text-[var(--ink-soft)]",
                  )}>✗</span>
                  <span className="font-bold text-[var(--orange)]">
                    {isManagerRound ? "Do not recommend" : "Do not proceed"}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  {isManagerRound
                    ? "Candidate does not demonstrate the maturity or alignment needed for this role at this stage."
                    : "Candidate does not meet requirements for this role at this stage."}
                </p>
              </button>
            </div>
          </div>

          {/* Report note */}
          <div className="flex items-start gap-3 rounded-xl border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-4 py-3">
            <span className="mt-0.5 text-base">📄</span>
            <p className="text-xs text-[var(--ink-soft)]">
              Submitting will generate a <strong>PDF evaluation report</strong> and send it to the recruiter.
              Your questions, assessments, and justification will all be included.
            </p>
          </div>

          {/* Submit row */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(isManagerRound ? 1 : 2)}>← Back to questions</Button>
            <Button
              onClick={submit}
              disabled={busy || items.length === 0 || !decision || justification.trim().length < JUSTIFICATION_MIN_LEN}
              className="px-7 py-3 text-sm"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin size-3.5" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity=".3"/>
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Generating report…
                </span>
              ) : "Generate report & submit →"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function QuestionCard({
  index,
  item,
  roles,
  onChange,
  onRemove,
}: {
  index: number;
  item: WorkItem;
  roles: RoleOption[];
  onChange: (patch: Partial<WorkItem>) => void;
  onRemove: () => void;
}) {
  const [libOpen, setLibOpen] = useState(false);
  const [visibility, setVisibility] = useState<"org" | "private">("org");
  const [libRoleId, setLibRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveToLibrary() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: item.question,
          category: item.category,
          difficulty: item.difficulty,
          roleId: libRoleId || undefined,
          code: item.code,
          visibility,
        }),
      });
      if (res.ok) {
        onChange({ savedToLibrary: true });
        setLibOpen(false);
      } else {
        setSaveError("Could not save — please try again.");
      }
    } catch {
      setSaveError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const satisfactionColor =
    item.satisfaction === "Satisfied"
      ? "text-[var(--green)]"
      : item.satisfaction === "Not satisfied"
        ? "text-[var(--orange)]"
        : "text-[var(--ink-faint)]";

  return (
    <div className={cn(
      "case-card overflow-hidden transition-shadow",
      item.satisfaction === "Satisfied" && "border-[var(--green)]/30",
      item.satisfaction === "Not satisfied" && "border-[var(--orange)]/30",
    )}>
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2.5">
        <span className="font-serif text-base font-bold text-[var(--ink-faint)]">#{index}</span>
        <Pill variant="neutral" className="text-[10px]">{item.category}</Pill>
        <Pill variant="cyan" className="text-[10px]">{item.difficulty}</Pill>
        {item.savedToLibrary && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green)]/30 bg-[var(--green-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--green)]">
            📚 In library
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!item.savedToLibrary && (
            <button
              type="button"
              onClick={() => setLibOpen((v) => !v)}
              title="Save to question library"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                libOpen
                  ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                  : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--cyan)] hover:bg-[var(--cyan-soft)] hover:text-[var(--cyan-d)]",
              )}
            >
              📚 {libOpen ? "Cancel" : "Save to library"}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            title="Remove question"
            className="rounded-full border border-transparent p-1.5 text-[var(--ink-faint)] transition-colors hover:border-[var(--orange)]/30 hover:bg-[var(--orange-soft)] hover:text-[var(--orange)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="text-sm font-semibold leading-relaxed text-[var(--ink)]">{item.question}</p>
        {item.code && (
          <pre className="mt-3 overflow-auto rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-xs leading-relaxed">
            <code>{item.code}</code>
          </pre>
        )}
        {item.expected_answer_hints && (
          <div className="mt-3 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-xs text-[var(--ink-soft)]">
            <span className="font-bold uppercase tracking-wider text-[var(--ink-faint)]">Hints · </span>
            {item.expected_answer_hints}
          </div>
        )}

        {/* Assessment row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="case-label block mb-1.5">Assessment</label>
            <select
              value={item.satisfaction}
              onChange={(e) => onChange({ satisfaction: e.target.value })}
              className={cn("case-input px-3 py-2 text-sm font-semibold", satisfactionColor)}
            >
              {SATISFACTION.map((s) => (
                <option key={s} value={s}>{s || "— Not assessed yet —"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="case-label block mb-1.5">Notes on answer</label>
            <textarea
              rows={2}
              placeholder="Candidate's response, observations…"
              value={item.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="case-input resize-none px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Library save panel */}
        {libOpen && !item.savedToLibrary && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--cyan)]/20 bg-gradient-to-br from-[var(--cyan-soft)] to-white">
            <div className="flex items-center gap-2 border-b border-[var(--cyan)]/15 px-4 py-2.5">
              <span className="text-base">📚</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--cyan-d)]">
                Save to question library
              </span>
              <span className="ml-auto text-[11px] text-[var(--ink-faint)]">
                Reusable across future interviews
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="case-label">Share with</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as "org" | "private")}
                  className="case-input px-2 py-1.5 text-sm"
                >
                  <option value="org">🏢 All users in org</option>
                  <option value="private">🔒 Only me</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="case-label">Link to role</span>
                <select
                  value={libRoleId}
                  onChange={(e) => setLibRoleId(e.target.value)}
                  className="case-input px-2 py-1.5 text-sm"
                >
                  <option value="">Any role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="case-label">Difficulty</span>
                <select
                  value={item.difficulty}
                  onChange={(e) => onChange({ difficulty: e.target.value })}
                  className="case-input px-2 py-1.5 text-sm"
                >
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex flex-col gap-2 sm:col-span-3">
                {saveError && (
                  <p className="text-xs font-semibold text-[var(--orange)]">{saveError}</p>
                )}
                <button
                  type="button"
                  onClick={saveToLibrary}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--navy)] hover:-translate-y-px disabled:opacity-50"
                >
                  {saving ? "Saving…" : "💾 Save to library"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
