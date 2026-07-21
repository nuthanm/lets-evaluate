"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { DocxPreview } from "@/components/DocxPreview";
import { Pill } from "@/components/Pill";
import { FieldLabel, FieldTextarea } from "@/components/FormField";
import { EmailComposer } from "@/components/EmailComposer";
import type { MemberRole } from "@/lib/auth/config";
import { cn } from "@/lib/utils";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";
import type { RenderedMail } from "@/lib/email";
import type { ResumeMetrics } from "@/lib/ai";
import { resolveScreeningVerdict } from "@/lib/ai/tech-matching";
import {
  SCREENING_NOTES_MIN_LEN,
  validateScreeningDecision,
} from "@/lib/candidates/screening-decision";
import { InterviewWorkspace } from "./InterviewWorkspace";
import { CandidateTimeline } from "@/components/workflow/CandidateTimeline";
import { ApprovalSwimlane } from "@/components/workflow/ApprovalSwimlane";

type Metrics = Partial<ResumeMetrics>;

export type StageView = {
  id: string;
  label: string;
  kind: "screening" | "technical" | "manager" | "hr" | "final" | "custom";
  position: number;
  status: "pending" | "active" | "passed" | "failed" | "skipped";
  assigneeName: string | null;
  dueAt: string | null;
  decision: string | null;
  comments: string | null;
  hasReport: boolean;
  handoffNote?: string | null;
};

export function EvaluateClient({
  candidateId,
  candidateName,
  role,
  projectName,
  resumeFilename,
  hasResume: initialHasResume,
  hasStoredResume: initialHasStoredResume,
  canScreen,
  initialMetrics,
  screeningComments,
  stages,
  candidateStatus,
  candidateEmail,
  canFinalize,
  myActiveStageId,
  viewerRole,
  roleOpen = true,
  initialQuestions,
}: {
  candidateId: string;
  candidateName: string;
  role: string;
  projectName?: string;
  resumeFilename?: string;
  hasResume: boolean;
  hasStoredResume: boolean;
  canScreen: boolean;
  initialMetrics?: Metrics;
  screeningComments?: string;
  stages: StageView[];
  candidateStatus: string;
  candidateEmail?: string;
  canFinalize: boolean;
  myActiveStageId: string | null;
  viewerRole: MemberRole;
  roleOpen?: boolean;
  resumeText?: string;
  initialQuestions?: {
    standard: unknown[];
    resume: unknown[];
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(
    initialMetrics?.tech_match_score ? 2 : 1,
  );
  const [metrics, setMetrics] = useState<Metrics | undefined>(initialMetrics);
  const screening = useMemo(
    () => (metrics ? resolveScreeningVerdict(metrics) : null),
    [metrics],
  );
  const [comments, setComments] = useState("");
  const [analysisModel, setAnalysisModel] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [resumeReady, setResumeReady] = useState(initialHasResume);
  const [resumeStored, setResumeStored] = useState(initialHasStoredResume);
  const [resumeName, setResumeName] = useState(resumeFilename);
  const [uploading, setUploading] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [resumePaneWidth, setResumePaneWidth] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [wsStep, setWsStep] = useState<number>(1);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [questions, setQuestions] = useState<{
    standard: unknown[];
    resume: unknown[];
  } | null>(
    initialQuestions
      ? {
          standard: initialQuestions.standard,
          resume: initialQuestions.resume,
        }
      : null,
  );
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [preparedMails, setPreparedMails] = useState<RenderedMail[] | null>(null);
  const [caseTab, setCaseTab] = useState<"case" | "timeline" | "approvals">("case");

  useEffect(() => {
    if (canScreen) {
      fetch(`/api/drafts?candidateId=${candidateId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.step) setStep(Math.min(2, d.step as number) as 1 | 2);
          if (d?.data?.comments) setComments(d.data.comments as string);
        })
        .catch(() => {});
    }
  }, [canScreen, candidateId]);

  async function saveDraft(nextStep: number, extra: Record<string, unknown> = {}) {
    await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        step: nextStep,
        data: { comments, ...extra },
      }),
    });
    setSavedAt(Date.now());
  }

  async function uploadResume(file: File) {
    if (!isAllowedResumeFilename(file.name)) {
      setError(RESUME_UPLOAD_FRIENDLY_ERROR);
      return;
    }
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("resume", file);
    fd.append("name", candidateName);
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PUT",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not upload the resume. Please try again.");
      return;
    }
    setResumeName(file.name);
    setResumeReady(true);
    setResumeStored(true);
  }

  async function runAnalyze() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Analysis failed. Please try again.");
      return;
    }
    if (data.metrics) {
      setMetrics(data.metrics as Metrics);
      if (data.model) setAnalysisModel(data.model as string);
      setStep(2);
      await saveDraft(2);
    }
  }

  async function decide(decision: "proceed" | "hold" | "reject") {
    const validationError = validateScreeningDecision(
      comments,
      decision,
      metrics?.recommendation,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decide", decision, comments }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "Could not record the verdict.");
      return;
    }
    await fetch(`/api/drafts?id=${candidateId}`, { method: "DELETE" }).catch(() => {});
    if (data.mail) setPreparedMails([data.mail as RenderedMail]);
    if (decision === "proceed" && !data.mail) {
      router.push(`/booking/${candidateId}`);
    } else if (decision !== "proceed" && !data.mail) {
      router.push("/people");
    }
    setLoading(false);
    router.refresh();
  }

  async function generateQuestions() {
    setQuestionsLoading(true);
    setError(null);
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "questions" }),
    });
    const data = await res.json();
    setQuestionsLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not generate questions.");
      return;
    }
    setQuestions({
      standard: (data.standardQuestions as unknown[]) ?? [],
      resume: (data.resumeQuestions as unknown[]) ?? [],
    });
  }

  const caseId = candidateId.slice(0, 8).toUpperCase();
  const score = metrics?.tech_match_score;
  const hasResume = resumeReady;
  const analyzed = Boolean(metrics?.tech_match_score);
  const activeResumeFilename = resumeName ?? resumeFilename;
  const resumeExt = activeResumeFilename?.toLowerCase() ?? "";
  const isPdfResume = resumeReady && resumeExt.endsWith(".pdf");
  const isDocxResume = resumeReady && resumeExt.endsWith(".docx");
  const canRenderStoredFile = resumeReady && resumeStored;
  const canRenderHtmlPreview = resumeReady && Boolean(activeResumeFilename);

  function updateSplitFromClientX(clientX: number) {
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(75, Math.max(25, raw));
    setResumePaneWidth(clamped);
  }

  function handleSplitPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    setIsDraggingSplit(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSplitFromClientX(e.clientX);
  }

  function handleSplitPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingSplit) return;
    updateSplitFromClientX(e.clientX);
  }

  function handleSplitPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setIsDraggingSplit(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleSplitKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setResumePaneWidth((w) => Math.max(25, w - 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setResumePaneWidth((w) => Math.min(75, w + 2));
    }
  }

  const screeningStage = stages.find((s) => s.kind === "screening");
  const screeningOpen =
    stages.length === 0 ||
    !screeningStage ||
    screeningStage.status === "active" ||
    screeningStage.status === "pending";
  const showWizard = canScreen && screeningOpen;

  const myActiveStage = stages.find((s) => s.id === myActiveStageId) ?? null;
  const activeInterviewStage = stages.find(
    (s) => s.status === "active" && s.kind !== "screening" && s.kind !== "final",
  );

  // The most recently completed round before the panelist's own — gives a
  // manager/HR panelist context on how the candidate did earlier in the
  // process without having to go dig through the archive.
  const previousStage = myActiveStage
    ? [...stages]
        .filter(
          (s) =>
            s.kind !== "screening" &&
            s.position < myActiveStage.position &&
            (s.status === "passed" || s.status === "failed"),
        )
        .sort((a, b) => b.position - a.position)[0] ?? null
    : null;

  // Show the tech-stack score sidebar only when viewing the AI Analysis step.
  const showSidebar =
    score != null &&
    ((showWizard && step === 2) ||
     (!showWizard && myActiveStage != null && wsStep === 1));

  // A single, plain-language read on where the candidate has landed. Drives the
  // outcome banner so a rejection / hold / selection is never mistaken for an
  // "in progress" case file.
  const outcome = deriveOutcome(candidateStatus, stages, screeningComments);

  // Setup is complete once the profile has been analyzed; AI Analysis is the
  // last interactive screening step (the verdict is recorded downstream).
  const isStepComplete = (n: number) => (n === 1 ? analyzed : false);
  const maxReachableStep: 1 | 2 = analyzed ? 2 : 1;
  const canContinue = step < 2 && isStepComplete(step);

  function goToStep(n: 1 | 2) {
    if (n > maxReachableStep) return;
    setStep(n);
    saveDraft(n);
  }

  // The step bar mirrors the whole journey: the two interactive screening
  // steps (Setup, AI Analysis) followed by the admin-configured rounds, which
  // render as read-only progress indicators here.
  // HR and Final Confirmation stages are hidden only for panel users. Recruiter
  // side users keep the full stage map so they can see every section.
  const viewerIsPanel =
    viewerRole === "interviewer" || viewerRole === "manager" || viewerRole === "hr";
  const viewerIsRecruiter = viewerRole === "admin" || viewerRole === "ta";
  const downstreamStages = stages.filter(
    (s) =>
      s.kind !== "screening" &&
      (!viewerIsPanel || (s.kind !== "hr" && s.kind !== "final")),
  );
  const showStepBar =
    viewerIsRecruiter || showWizard || stages.length > 0;
  const screeningNotesReady =
    comments.trim().length >= SCREENING_NOTES_MIN_LEN;

  type StepItem = {
    key: string;
    label: string;
    num: number;
    state: "on" | "done" | "idle" | "fail" | "skip";
    statusLabel?: string;
    onClick?: () => void;
  };

  const stepItems: StepItem[] = [
    {
      key: "setup",
      label: "Setup",
      num: 1,
      state: showWizard ? (step === 1 ? "on" : "done") : "done",
      onClick: showWizard ? () => goToStep(1) : undefined,
    },
    {
      key: "analysis",
      label: "AI Analysis",
      num: 2,
      state: showWizard
        ? step === 2
          ? "on"
          : analyzed
            ? "done"
            : "idle"
        : "done",
      onClick: showWizard && analyzed ? () => goToStep(2) : undefined,
    },
    ...downstreamStages.map((s, i) => {
      const meta = stageStatusMeta(s.status);
      const state: StepItem["state"] =
        s.status === "passed"
          ? "done"
          : s.status === "active"
            ? "on"
            : s.status === "failed"
              ? "fail"
              : s.status === "skipped"
                ? "skip"
                : "idle";
      return {
        key: s.id,
        label: s.label,
        num: i + 3,
        state,
        statusLabel: meta.label,
      };
    }),
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 bg-[var(--navy)] px-5 py-3.5 text-white md:px-6">
        <div className="min-w-0">
          <div className="font-serif text-[1.05rem] leading-tight text-white">
            {showWizard ? "Candidate screening" : "Candidate case file"}
          </div>
          <div className="truncate text-[11px] text-white/50">
            Case #{caseId} · {candidateStatus.replace(/_/g, " ")}
          </div>
        </div>
        {showWizard && (
          <button
            type="button"
            onClick={() => saveDraft(step)}
            className="shrink-0 rounded-lg border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            {savedAt ? "Saved ✓" : "Save draft"}
          </button>
        )}
      </div>

      {showStepBar && (
        <div className="flex flex-wrap border-b border-[var(--cream-2)]">
          {stepItems.map((it) => {
            const inner = (
              <>
                <span className="num">
                  {it.state === "done"
                    ? "✓"
                    : it.state === "fail"
                      ? "✗"
                      : it.state === "skip"
                        ? "–"
                        : it.num}
                </span>
                {it.label}
                {it.statusLabel && (
                  <span className="mt-1 block text-[9px] font-semibold normal-case tracking-normal opacity-70">
                    {it.statusLabel}
                  </span>
                )}
              </>
            );
            const className = cn(
              "eval-step",
              it.state === "done" && "done",
              it.state === "on" && "on",
              it.state === "fail" && "fail",
              it.state === "skip" && "skip",
            );
            return it.onClick ? (
              <button
                key={it.key}
                type="button"
                onClick={it.onClick}
                aria-current={it.state === "on" ? "step" : undefined}
                title={`Go to ${it.label}`}
                className={className}
              >
                {inner}
              </button>
            ) : (
              <div
                key={it.key}
                aria-current={it.state === "on" ? "step" : undefined}
                className={cn(className, "cursor-default")}
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Info tiles strip (visible to all roles) ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cream-2)] bg-white px-4 py-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-2.5 py-1">
          <span className="text-[10px] font-bold text-[var(--cyan-d)]">In review</span>
        </div>
        {projectName && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Project</span>
            <span className="text-xs font-bold text-[var(--ink)]">{projectName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Evidence</span>
          <span className="max-w-[200px] truncate text-xs font-bold text-[var(--ink)]">{activeResumeFilename ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Opened</span>
          <span className="text-xs font-bold text-[var(--ink)]">
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {/* Hide Resume Preview for manager rounds — they don't assess technical profile */}
        {myActiveStage?.kind !== "manager" && (
          <button
            type="button"
            onClick={() => setSplitView((v) => !v)}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              splitView
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
            )}
          >
            {splitView ? "✕ Close" : "📄 Resume Preview & AI Analysis"}
          </button>
        )}
      </div>

      {/* ── Split view panel: resume left, AI analysis right ── */}
      {splitView && (
        <div
          ref={splitContainerRef}
          className={cn(
            "flex min-h-0 flex-1 border-b border-[var(--cream-2)]",
            isDraggingSplit ? "cursor-col-resize select-none" : "",
          )}
        >
          {/* Resume panel */}
          <div
            className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--cream-2)]"
            style={{ width: `${resumePaneWidth}%` }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2.5">
              <span>📄</span>
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Resume Preview</span>
              {activeResumeFilename && (
                <span className="ml-1 max-w-[180px] truncate text-[11px] text-[var(--ink-faint)]">{activeResumeFilename}</span>
              )}
            </div>
            {isPdfResume && canRenderStoredFile ? (
              /* PDF — native browser renderer */
              <iframe
                src={`/api/candidates/${candidateId}/resume`}
                title="Resume preview"
                className="flex-1 w-full border-0 bg-white"
              />
            ) : isDocxResume && canRenderStoredFile ? (
              /* DOCX — strict read-only document preview. */
              <DocxPreview
                fileUrl={`/api/candidates/${candidateId}/resume`}
                filename={activeResumeFilename}
              />
            ) : canRenderHtmlPreview ? (
              /* Legacy records without a stored file fall back to persisted resume text. */
              <iframe
                src={`/api/candidates/${candidateId}/resume/html`}
                title="Resume preview"
                className="flex-1 w-full border-0 bg-white"
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {resumeReady ? (
                  /* Unknown/unsupported file type — fallback to download */
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <span className="text-3xl opacity-30">📄</span>
                    <p className="text-sm font-semibold text-[var(--ink-soft)]">
                      {activeResumeFilename ?? "Resume on file"}
                    </p>
                    <p className="text-xs text-[var(--ink-faint)]">
                      Preview not available for this file type.
                    </p>
                    <a
                      href={`/api/candidates/${candidateId}/resume`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[var(--navy)]"
                    >
                      Download to view ↓
                    </a>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <span className="text-3xl opacity-30">📄</span>
                    <p className="text-sm font-semibold text-[var(--ink-soft)]">No resume on file</p>
                    <p className="text-xs text-[var(--ink-faint)]">Upload a resume to view it here.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            role="separator"
            aria-label="Resize resume and AI analysis panels"
            aria-orientation="vertical"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(resumePaneWidth)}
            tabIndex={0}
            onPointerDown={handleSplitPointerDown}
            onPointerMove={handleSplitPointerMove}
            onPointerUp={handleSplitPointerUp}
            onPointerCancel={handleSplitPointerUp}
            onKeyDown={handleSplitKeyDown}
            className={cn(
              "group relative w-2 shrink-0 cursor-col-resize touch-none bg-[var(--cream-2)] transition-colors",
              "hover:bg-[var(--cyan)]/45 focus-visible:bg-[var(--cyan)]/45 focus-visible:outline-none",
            )}
          >
            <span className="pointer-events-none absolute inset-y-1 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-[var(--ink-faint)]/55 group-hover:bg-[var(--ink)]/70" />
          </div>

          {/* AI Analysis panel */}
          <div
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
            style={{ width: `${100 - resumePaneWidth}%` }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2.5">
              <span>🤖</span>
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">AI Analysis</span>
              {screening?.recommendation && (
                <Pill variant={recommendationVariant(screening.recommendation)} className="ml-2 text-[10px]">
                  {screening.recommendation}
                </Pill>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {metrics ? (
                <AnalysisReport
                  metrics={metrics}
                  candidateName={candidateName}
                  role={role}
                  projectName={projectName}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="text-3xl opacity-30">🤖</span>
                  <p className="text-sm font-semibold text-[var(--ink-soft)]">No analysis yet</p>
                  {canScreen && (
                    <Button
                      onClick={runAnalyze}
                      disabled={loading || !resumeReady}
                      className="mt-2 px-4 py-2 text-xs"
                    >
                      {loading ? "Analyzing…" : "Run AI analysis →"}
                    </Button>
                  )}
                  {!canScreen && (
                    <p className="text-xs text-[var(--ink-faint)]">
                      Analysis will appear here once completed by the TA.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!splitView && (
      <div className={cn("grid flex-1", showSidebar ? "md:grid-cols-[1fr_200px]" : "")}>
        <main className="overflow-auto p-5 md:p-7">
          {screeningComments &&
            !(viewerIsRecruiter && !myActiveStage && !showWizard && stages.length > 0) && (
            <div className="case-card mb-4 border-[var(--cyan)] bg-[var(--cyan-soft)] p-4 text-sm">
              <strong>TA screening notes:</strong> {screeningComments}
            </div>
          )}

          <div className="mb-5 flex items-center gap-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-4">
            <div className="font-serif grid size-14 place-items-center rounded-xl border border-[var(--cream-2)] bg-[var(--ink)] text-lg text-white">
              {candidateName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-lg font-extrabold">{candidateName}</div>
              <div className="text-[13px] text-[var(--ink-faint)]">{role}</div>
            </div>
            {screening?.recommendation && (
              <Pill variant={recommendationVariant(screening.recommendation)}>
                AI: {screening.recommendation}
              </Pill>
            )}
          </div>

          {/* Terminal / hold outcome — always front-and-centre with the reason. */}
          {outcome && <OutcomeBanner outcome={outcome} />}

          {!showWizard && stages.length > 0 && !myActiveStage && (
            <CaseFileViewTabs active={caseTab} onChange={setCaseTab} />
          )}

          {!showWizard && !myActiveStage && caseTab === "timeline" && (
            <CandidateTimeline candidateId={candidateId} />
          )}

          {!showWizard && !myActiveStage && caseTab === "approvals" && (
            <ApprovalSwimlane
              stages={stages.map((s) => ({
                id: s.id,
                label: s.label,
                kind: s.kind,
                status: s.status,
                assigneeName: s.assigneeName,
                decision: s.decision,
              }))}
            />
          )}

          {(showWizard || myActiveStage || caseTab === "case") && (
            <>
          {/* Full pipeline history for recruiters — shows what happened at each round. */}
          {viewerIsRecruiter && !myActiveStage && !showWizard && stages.length > 0 && (
            <WorkflowHistoryPanel
              stages={stages}
              screeningComments={screeningComments}
              aiRecommendation={metrics?.recommendation}
            />
          )}

          {/* Recruiter's handoff note for the panelist's own active round — was
              previously only visible on the Assignments list, so it disappeared
              the moment they opened the case file. Surface it here too. */}
          {!showWizard && myActiveStage?.handoffNote && (
            <div className="case-card mb-4 border-[var(--orange)] bg-[var(--orange-soft)] p-4 text-sm">
              <strong>Handoff note from recruiter:</strong> {myActiveStage.handoffNote}
            </div>
          )}

          {/* Previous round context — lets a manager/HR panelist see how the
              candidate did earlier in the process (who ran it, the verdict,
              and their notes) without leaving the case file. */}
          {!showWizard && myActiveStage && previousStage && (
            <div
              className={cn(
                "case-card mb-4 overflow-hidden border-l-4 p-0",
                previousStage.status === "passed"
                  ? "border-l-[var(--green)]"
                  : "border-l-[var(--orange)]",
              )}
            >
              {/* Header band */}
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 px-4 py-3",
                  previousStage.status === "passed"
                    ? "bg-[var(--green-soft)]"
                    : "bg-[var(--orange-soft)]",
                )}
              >
                <span
                  className={cn(
                    "case-label",
                    previousStage.status === "passed"
                      ? "text-[var(--green)]"
                      : "text-[var(--orange)]",
                  )}
                >
                  {previousStage.label} — completed
                </span>
                <Pill variant={previousStage.status === "passed" ? "green" : "orange"}>
                  {previousStage.decision === "yes"
                    ? "Recommended to proceed"
                    : previousStage.decision === "no"
                      ? "Did not recommend"
                      : previousStage.status === "passed"
                        ? "Passed"
                        : "Not cleared"}
                </Pill>
                {previousStage.assigneeName && (
                  <span className="text-xs text-[var(--ink-faint)]">
                    by <strong>{previousStage.assigneeName}</strong>
                  </span>
                )}
                {previousStage.hasReport && (
                  <a
                    href={`/api/stages/${previousStage.id}/report`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--cyan-d)] hover:underline"
                  >
                    📄 View full report
                  </a>
                )}
              </div>
              {/* Comments body */}
              {previousStage.comments && (
                <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">{previousStage.comments}</p>
              )}
            </div>
          )}

          {/* Interviewer / manager / HR workspace for their active round. */}
          {!showWizard && myActiveStage && (
            <InterviewWorkspace
              stageId={myActiveStage.id}
              stageLabel={myActiveStage.label}
              stageKind={myActiveStage.kind}
              candidateName={candidateName}
              role={role}
              projectName={projectName}
              metrics={metrics}
              onStepChange={setWsStep}
              onDone={() => {
                router.push("/assignments");
                router.refresh();
              }}
            />
          )}

          {!showWizard && !myActiveStage && canFinalize && (
            <FinalConfirmationPanel
              candidateId={candidateId}
              candidateName={candidateName}
              candidateEmail={candidateEmail}
              role={role}
              projectName={projectName}
              metrics={metrics}
              onDone={() => {
                router.push("/people");
                router.refresh();
              }}
            />
          )}

          {!showWizard &&
            !myActiveStage &&
            !canFinalize &&
            canScreen &&
            (activeInterviewStage || !outcome) && (
            <div className="case-card mb-4 border-[var(--cyan)] bg-[var(--cyan-soft)] p-4">
              {activeInterviewStage ? (
                activeInterviewStage.assigneeName ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="case-label">
                        {activeInterviewStage.label} — in progress
                      </span>
                      <Pill variant="cyan">Awaiting decision</Pill>
                    </div>
                    <p className="mt-2 text-sm">
                      Assigned to <strong>{activeInterviewStage.assigneeName}</strong>
                      {activeInterviewStage.dueAt && (
                        <>
                          {" · "}
                          <span className="font-semibold text-[var(--cyan-d)]">
                            {new Date(activeInterviewStage.dueAt).toLocaleString(
                              "en-GB",
                              {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </>
                      )}
                    </p>
                    <a
                      href={`/booking/${candidateId}`}
                      className="mt-2 inline-block text-xs font-semibold text-[var(--cyan-d)] hover:underline"
                    >
                      Reschedule / change assignee →
                    </a>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="case-label">Next: {activeInterviewStage.label}</span>
                      <Pill variant="orange">Needs assignee</Pill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      Assign this round to a{" "}
                      {activeInterviewStage.kind === "manager"
                        ? "manager"
                        : activeInterviewStage.kind === "hr"
                          ? "HR"
                          : "technical interviewer"}{" "}
                      and schedule a slot.
                    </p>
                    <a
                      href={`/booking/${candidateId}`}
                      className="mt-2 inline-block text-sm font-semibold text-[var(--cyan-d)] hover:underline"
                    >
                      Assign interviewer & schedule →
                    </a>
                  </>
                )
              ) : outcome ? null : (
                <p className="text-sm text-[var(--ink-soft)]">
                  This candidate has completed the interview flow.
                </p>
              )}
            </div>
          )}

          {preparedMails && (
            <div className="mb-5 space-y-3">
              <EmailComposer
                mails={preparedMails}
                title="Prepared email — copy or open in your mail client"
                onClose={() => setPreparedMails(null)}
              />
              {preparedMails.some((m) => m.slug === "candidate_proceed") && (
                <Button onClick={() => router.push(`/booking/${candidateId}`)}>
                  Continue to schedule →
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="case-card mb-4 border-[var(--orange)] bg-[var(--orange-soft)] p-3 text-sm text-[var(--orange)]">
              {error}
            </div>
          )}

          {showWizard && step === 1 && (
            <section className="case-card p-5 case-fade-in">
              <h2 className="font-serif text-xl font-bold">Evidence & analysis</h2>
              <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
                We read the uploaded resume automatically — no copy/paste needed.
              </p>
              <div
                className={cn(
                  "mt-4 flex items-center gap-3 rounded-xl border p-4",
                  hasResume
                    ? "border-[var(--cream-2)] bg-[var(--cream)]"
                    : "border-[var(--orange)] bg-[var(--orange-soft)]",
                )}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-white">
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {resumeName || "No resume on file"}
                  </div>
                  <div className="text-xs text-[var(--ink-faint)]">
                    {hasResume
                      ? "Resume on file — ready to analyze"
                      : "Resume file is missing — upload it to enable analysis"}
                  </div>
                </div>
                {hasResume ? (
                  <Pill variant="green">Ready</Pill>
                ) : (
                  <Pill variant="orange">Missing</Pill>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={runAnalyze}
                  disabled={loading || uploading || !hasResume}
                >
                  {loading
                    ? "Analyzing…"
                    : analyzed
                      ? "Re-evaluate the profile →"
                      : "Analyze the candidate profile →"}
                </Button>

                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center rounded-xl border border-[var(--cream-2)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--cyan)] hover:bg-[var(--cream)]",
                    uploading && "pointer-events-none opacity-50",
                  )}
                >
                  {uploading
                    ? "Uploading…"
                    : hasResume
                      ? "Replace resume"
                      : "Upload resume"}
                  <input
                    type="file"
                    accept={RESUME_UPLOAD_ACCEPT}
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadResume(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {!hasResume && (
                <p className="mt-2 text-xs text-[var(--ink-faint)]">
                  Accepted formats: PDF or DOCX (max 10MB).
                </p>
              )}
            </section>
          )}

          {showWizard && step === 2 && (
            <section className="case-fade-in space-y-4">
              {!metrics ? (
                <div className="case-card p-5">
                  <h2 className="font-serif text-xl font-bold">AI Analysis</h2>
                  <Button
                    className="mt-4"
                    onClick={runAnalyze}
                    disabled={loading || !hasResume}
                  >
                    {loading ? "Analyzing…" : "Evaluate the profile →"}
                  </Button>
                </div>
              ) : (
                <>
                  <AnalysisReport
                    metrics={metrics}
                    candidateName={candidateName}
                    role={role}
                    projectName={projectName}
                    candidateId={candidateId}
                    canReassign={canScreen}
                  />
                  <div className="case-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-serif text-xl font-bold">
                        Screening questions
                      </h2>
                      <Button
                        variant="ghost"
                        onClick={generateQuestions}
                        disabled={questionsLoading || !hasResume}
                        className="text-[12px]"
                      >
                        {questionsLoading
                          ? "Generating…"
                          : questions
                            ? "Regenerate"
                            : "Generate questions"}
                      </Button>
                    </div>
                    {questions ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <QuestionList
                          title="Role & tech"
                          items={questions.standard}
                        />
                        <QuestionList
                          title="Resume-based"
                          items={questions.resume}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-[var(--ink-faint)]">
                        Optional — generate suggested questions before your
                        screening call or candidate email.
                      </p>
                    )}
                  </div>
                  {!roleOpen && (
                    <div className="case-alert border-[var(--orange)] bg-[var(--orange-soft)]">
                      <p className="text-[13px] font-semibold text-[var(--orange)]">
                        This opening is closed. Reopen the role or change the
                        candidate&apos;s role before proceeding or scheduling.
                      </p>
                    </div>
                  )}
                  <div className="case-card p-5">
                    <h2 className="font-serif text-xl font-bold">
                      Proceed to interviews
                    </h2>
                    <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
                      The AI analysis above is advisory. Choosing{" "}
                      <strong>Proceed</strong> moves the candidate into the
                      interview rounds and opens the scheduling calendar. The
                      final verdict is recorded at{" "}
                      <strong>Final Confirmation</strong>, after all rounds are
                      complete.
                    </p>
                    {screening?.recommendation === "Reject" && (
                      <div className="case-alert mt-4 border-[var(--orange)] bg-[var(--orange-soft)]">
                        <p className="text-[13px] font-semibold text-[var(--orange)]">
                          AI recommended Reject — if you choose Proceed or Hold,
                          you must justify why this candidate should continue in
                          the notes below.
                        </p>
                      </div>
                    )}
                    <div className="mt-4">
                      <FieldLabel>
                        Screening notes <span className="text-[var(--orange)]">*</span>
                      </FieldLabel>
                    </div>
                    <FieldTextarea
                      placeholder={
                        screening?.recommendation === "Reject"
                          ? "Explain why you are overriding the AI Reject recommendation…"
                          : "Record your screening rationale before proceeding, holding, or rejecting…"
                      }
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      aria-required
                    />
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-semibold",
                        screeningNotesReady
                          ? "text-[var(--green)]"
                          : "text-[var(--ink-faint)]",
                      )}
                    >
                      {screeningNotesReady
                        ? "Notes recorded — you may submit your decision."
                        : `${Math.max(0, SCREENING_NOTES_MIN_LEN - comments.trim().length)} more characters required`}
                    </p>
                    {error && (
                      <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => decide("proceed")}
                        disabled={loading || !roleOpen || !screeningNotesReady}
                        title={
                          !screeningNotesReady
                            ? `Add at least ${SCREENING_NOTES_MIN_LEN} characters of screening notes`
                            : undefined
                        }
                      >
                        {loading ? "Saving…" : "Proceed to scheduling →"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => decide("hold")}
                        disabled={loading || !screeningNotesReady}
                        title={
                          !screeningNotesReady
                            ? `Add at least ${SCREENING_NOTES_MIN_LEN} characters of screening notes`
                            : undefined
                        }
                      >
                        Hold
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => decide("reject")}
                        disabled={loading || !screeningNotesReady}
                        title={
                          !screeningNotesReady
                            ? `Add at least ${SCREENING_NOTES_MIN_LEN} characters of screening notes`
                            : undefined
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

            </>
          )}

        </main>

        {showSidebar && (
        <aside className="hidden flex-col border-l border-[var(--cream-2)] bg-[var(--navy)] p-4 text-white md:flex">
          {score != null ? (
            <>
              <div className="mx-auto grid size-[100px] place-items-center rounded-full border-[3px] border-[var(--cyan)] font-serif text-3xl text-[var(--cyan)]">
                {score}%
              </div>
              <p className="case-label mt-3 text-center text-white/50">Tech match</p>
              {metrics?.strengths && metrics.strengths.length > 0 && (
                <div className="mt-5 w-full space-y-2">
                  {metrics.strengths.slice(0, 4).map((s) => (
                    <ScoreBar key={s} label={s} width={85} />
                  ))}
                  {(metrics.concerns ?? []).slice(0, 2).map((c) => (
                    <ScoreBar key={c} label={c} width={45} warn />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-8 text-center text-xs text-white/40">
              Run analysis to see scores
            </p>
          )}
          <p className="mt-auto border-t border-white/15 pt-4 text-center text-[10px] leading-relaxed text-white/40">
            Analysis: {(analysisModel ?? "gpt-4o").toUpperCase()}
            <br />
            Human review required
          </p>
        </aside>
        )}
      </div>
      )}

      {showWizard && (
        <footer className="flex items-center justify-between border-t border-[var(--cream-2)] bg-[var(--cream)] px-5 py-3.5 md:px-7">
          <Button
            variant="ghost"
            className="px-4 py-2 text-sm"
            onClick={() => {
              if (step === 1) router.back();
              else goToStep((step - 1) as 1 | 2);
            }}
          >
            ← Back
          </Button>
          <Button
            className="px-4 py-2 text-sm"
            onClick={() => goToStep(Math.min(2, step + 1) as 1 | 2)}
            disabled={!canContinue}
            title={
              canContinue
                ? undefined
                : step === 1
                  ? "Analyze the profile to continue"
                  : "Complete this step to continue"
            }
          >
            Continue →
          </Button>
        </footer>
      )}
    </div>
  );
}

/* ─────────────────────────── Case file view tabs ─────────────────────────── */

function CaseFileViewTabs({
  active,
  onChange,
}: {
  active: "case" | "timeline" | "approvals";
  onChange: (tab: "case" | "timeline" | "approvals") => void;
}) {
  const tabs = [
    ["case", "Case file"],
    ["timeline", "Timeline"],
    ["approvals", "Approvals"],
  ] as const;

  return (
    <div className="mb-4 flex gap-1 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-1">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-[12px] font-bold transition-colors",
            active === id
              ? "bg-white text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── Workflow history ─────────────────────────── */

function stageDecisionLabel(stage: StageView): string | null {
  if (stage.kind === "screening") {
    if (stage.decision === "yes") return "Proceeded to interviews";
    if (stage.decision === "no") return "Rejected at screening";
    if (stage.status === "failed") return "Rejected at screening";
    return null;
  }
  if (stage.decision === "yes") return "Recommended to proceed";
  if (stage.decision === "no") return "Did not recommend";
  if (stage.status === "passed") return "Passed";
  if (stage.status === "failed") return "Not cleared";
  return null;
}

function WorkflowHistoryPanel({
  stages,
  screeningComments,
  aiRecommendation,
}: {
  stages: StageView[];
  screeningComments?: string;
  aiRecommendation?: string;
}) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  return (
    <section className="case-card mb-4 overflow-hidden p-0">
      <div className="border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3">
        <h2 className="font-serif text-lg font-bold">Workflow history</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
          Outcomes and notes from each stage in the evaluation pipeline.
        </p>
      </div>
      <div className="divide-y divide-[var(--cream-2)]">
        {ordered.map((stage) => {
          const meta = stageStatusMeta(stage.status);
          const decisionLabel = stageDecisionLabel(stage);
          const notes =
            stage.kind === "screening"
              ? screeningComments ?? stage.comments
              : stage.comments;
          const isPending = stage.status === "pending";
          const isSkipped = stage.status === "skipped";

          return (
            <div
              key={stage.id}
              className={cn(
                "px-4 py-3",
                isPending && "bg-white/60",
                isSkipped && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold text-[var(--ink)]",
                    isSkipped && "line-through",
                  )}
                >
                  {stage.label}
                </span>
                {!isPending && (
                  <Pill variant={meta.variant} className="px-2 py-0.5 text-[9px]">
                    {meta.label}
                  </Pill>
                )}
                {isPending && (
                  <Pill variant="neutral" className="px-2 py-0.5 text-[9px]">
                    Pending
                  </Pill>
                )}
                {decisionLabel && (
                  <span className="text-[11px] font-semibold text-[var(--ink-soft)]">
                    · {decisionLabel}
                  </span>
                )}
                {stage.assigneeName && (
                  <span className="text-[11px] text-[var(--ink-faint)]">
                    · {stage.status === "active" ? "Assigned to" : "By"}{" "}
                    <strong>{stage.assigneeName}</strong>
                  </span>
                )}
                {stage.hasReport && (
                  <a
                    href={`/api/stages/${stage.id}/report`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[11px] font-semibold text-[var(--cyan-d)] hover:underline"
                  >
                    View report →
                  </a>
                )}
              </div>
              {stage.kind === "screening" && aiRecommendation && (
                <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
                  <span className="font-semibold">AI recommendation:</span>{" "}
                  {aiRecommendation}
                </p>
              )}
              {stage.handoffNote && (
                <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
                  <span className="font-semibold">Handoff note:</span>{" "}
                  {stage.handoffNote}
                </p>
              )}
              {notes && (
                <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
                  <span className="font-semibold">Notes:</span> {notes}
                </p>
              )}
              {stage.dueAt && stage.status === "active" && (
                <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                  Scheduled:{" "}
                  {new Date(stage.dueAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────── Stage pipeline ─────────────────────────── */

function stageStatusMeta(status: StageView["status"]): {
  variant: "green" | "orange" | "cyan" | "neutral";
  label: string;
} {
  if (status === "passed") return { variant: "green", label: "Passed" };
  if (status === "failed") return { variant: "orange", label: "Not selected" };
  if (status === "active") return { variant: "cyan", label: "In progress" };
  if (status === "skipped") return { variant: "neutral", label: "Skipped" };
  return { variant: "neutral", label: "Pending" };
}

/* ─────────────────────────── Outcome banner ─────────────────────────── */

type Outcome = {
  kind: "rejected" | "hold" | "selected";
  title: string;
  reason?: string;
};

function deriveOutcome(
  status: string,
  stages: StageView[],
  screeningComments?: string,
): Outcome | null {
  const rejected = status === "rejected" || status === "screened_rejected";
  const hold = status === "hold" || status === "screened_hold";
  const selected = status === "selected";
  if (!rejected && !hold && !selected) return null;

  if (rejected) {
    const failed = stages.find((s) => s.status === "failed");
    const reason =
      (failed && failed.kind !== "screening" ? failed.comments : null) ||
      screeningComments ||
      failed?.comments ||
      undefined;
    return {
      kind: "rejected",
      title: failed ? `Rejected at ${failed.label}` : "Rejected",
      reason: reason ?? undefined,
    };
  }
  if (hold) {
    return { kind: "hold", title: "On hold", reason: screeningComments ?? undefined };
  }
  return {
    kind: "selected",
    title: "Selected",
    reason: stages.find((s) => s.kind === "final")?.comments ?? undefined,
  };
}

const OUTCOME_STYLES: Record<
  Outcome["kind"],
  { card: string; pill: "green" | "orange" | "cyan"; icon: string }
> = {
  rejected: {
    card: "border-[var(--orange)] bg-[var(--orange-soft)]",
    pill: "orange",
    icon: "✕",
  },
  hold: {
    card: "border-[var(--cyan)] bg-[var(--cyan-soft)]",
    pill: "cyan",
    icon: "‖",
  },
  selected: {
    card: "border-[var(--green)] bg-[var(--green-soft)]",
    pill: "green",
    icon: "✓",
  },
};

function OutcomeBanner({ outcome }: { outcome: Outcome }) {
  const s = OUTCOME_STYLES[outcome.kind];
  return (
    <section className={cn("case-card mb-4 p-4", s.card)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-white/70 text-sm font-bold">
          {s.icon}
        </span>
        <h2 className="font-serif text-lg font-bold">{outcome.title}</h2>
        <Pill variant={s.pill} className="text-[10px] capitalize">
          {outcome.kind}
        </Pill>
      </div>
      {outcome.reason ? (
        <div className="mt-2">
          <span className="case-label">Reason</span>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{outcome.reason}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--ink-faint)]">
          No reason was recorded.
        </p>
      )}
    </section>
  );
}

/* ─────────────────────────── Final confirmation ─────────────────────────── */

function FinalConfirmationPanel({
  candidateId,
  candidateName,
  candidateEmail,
  role,
  projectName,
  metrics,
  onDone,
}: {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  role: string;
  projectName?: string;
  metrics?: Metrics;
  onDone: () => void;
}) {
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalize(finalDecision: "selected" | "rejected" | "hold") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finalize", finalDecision, comments }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not record the final decision.");
      return;
    }
    onDone();
  }

  return (
    <section className="case-card mb-4 border-[var(--green)] bg-[var(--green-soft)] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-xl font-bold">Final confirmation</h2>
        <Pill variant="green">All rounds cleared</Pill>
      </div>
      <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
        Review the full candidate dossier and record the final outcome.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <KeyVal label="Candidate" value={candidateName} />
        <KeyVal label="Email" value={candidateEmail || "—"} />
        <KeyVal label="Role" value={projectName ? `${role} — ${projectName}` : role} />
        <KeyVal
          label="Tech match"
          value={metrics?.tech_match_score != null ? `${metrics.tech_match_score}%` : "—"}
        />
      </div>

      <FieldTextarea
        className="mt-4"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Final notes (offer details, reservations)…"
      />
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => finalize("selected")} disabled={busy}>
          {busy ? "Saving…" : "Confirm — Selected"}
        </Button>
        <Button variant="ghost" onClick={() => finalize("hold")} disabled={busy}>
          Hold
        </Button>
        <Button variant="ghost" onClick={() => finalize("rejected")} disabled={busy}>
          Reject
        </Button>
      </div>
    </section>
  );
}

/* ─────────────────────────── Analysis report ─────────────────────────── */

export function AnalysisReport({
  metrics,
  candidateName,
  role,
  projectName,
  candidateId,
  canReassign,
}: {
  metrics: Metrics;
  candidateName: string;
  role: string;
  projectName?: string;
  candidateId?: string;
  canReassign?: boolean;
}) {
  const router = useRouter();
  const [reassigning, setReassigning] = useState<string | null>(null);
  const clarifications = metrics.clarifications ?? [];
  const screening = resolveScreeningVerdict(metrics);
  const roleLabel = projectName ? `${role} — ${projectName}` : role;

  return (
    <div className="space-y-4">
      {/* Top tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCell
          label="Match score"
          value={`${screening.tech_match_score ?? 0}%`}
          accent
        />
        <MetricCell
          label="Relevant experience"
          value={
            metrics.relevant_experience ||
            metrics.total_experience_calculated ||
            metrics.total_experience_mentioned ||
            "Not specified"
          }
        />
        <MetricCell
          label="AI recommendation"
          value={screening.recommendation ?? "—"}
          accent={recommendationVariant(screening.recommendation) === "green"}
        />
      </div>

      {/* Current / last employer for cross-check */}
      {(metrics.current_employer ||
        metrics.current_role ||
        metrics.current_tenure) && (
        <div className="case-card p-5">
          <SectionTitle>
            {metrics.is_currently_employed
              ? "Current employment"
              : "Most recent employment"}
          </SectionTitle>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Use this to cross-check with the candidate during the call.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <KeyVal label="Employer" value={metrics.current_employer || "—"} />
            <KeyVal label="Role" value={metrics.current_role || "—"} />
            <KeyVal label="Tenure" value={metrics.current_tenure || "—"} />
          </div>
        </div>
      )}

      {/* Domain expertise */}
      {metrics.domain_expertise && metrics.domain_expertise.length > 0 && (
        <div className="case-card p-5">
          <SectionTitle>Domain expertise</SectionTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {metrics.domain_expertise.map((d) => (
              <Pill key={d} variant="neutral">
                {d}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {/* Tech stack comparison */}
      {metrics.tech_comparison && metrics.tech_comparison.length > 0 && (
        <div className="case-card p-5">
          <SectionTitle>Tech stack comparison</SectionTitle>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--cream-2)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--cream)] text-left">
                  <Th>Technology</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {metrics.tech_comparison.map((t) => (
                  <tr key={t.technology} className="border-t border-[var(--cream-2)]">
                    <Td>{t.technology}</Td>
                    <Td>
                      <StatusPill status={t.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clarifications required */}
      {clarifications.length > 0 && (
        <div className="case-card border-[var(--orange)] bg-[var(--orange-soft)] p-5">
          <SectionTitle>Clarification required</SectionTitle>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            These skills are mentioned generically. Review the gaps below, then
            send the single combined message to the candidate via email for now.
          </p>
          <ClarificationBlock
            candidateName={candidateName}
            clarifications={clarifications}
          />
        </div>
      )}

      {/* Tech experience years */}
      {(metrics.tech_experience ?? []).some(
        (t) => t.total_years || t.first_year,
      ) && (
        <div className="case-card p-5">
          <SectionTitle>Technology experience</SectionTitle>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Calculated from employment and project date ranges (alias-aware — e.g.
            Entity Framework counts toward EFCore).
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--cream-2)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--cream)] text-left">
                  <Th>Technology</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Total years</Th>
                </tr>
              </thead>
              <tbody>
                {(metrics.tech_experience ?? [])
                  .filter((t) => t.total_years || t.first_year)
                  .map((t) => (
                  <tr key={t.technology} className="border-t border-[var(--cream-2)]">
                    <Td>{t.technology}</Td>
                    <Td>{t.first_year || "—"}</Td>
                    <Td>{t.last_year || "—"}</Td>
                    <Td>{t.total_years || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Career history */}
      {metrics.career_history && metrics.career_history.length > 0 && (
        <div className="case-card p-5">
          <SectionTitle>Career timeline</SectionTitle>
          <ol className="mt-3 space-y-3">
            {metrics.career_history.map((c, i) => (
              <li
                key={`${c.company}-${i}`}
                className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">
                    {c.title || "Role"} · {c.company || "Company"}
                  </span>
                  {c.is_current && <Pill variant="green">Current</Pill>}
                </div>
                <div className="mt-1 text-xs text-[var(--ink-faint)]">
                  {[c.start, c.end].filter(Boolean).join(" – ") || "Dates not specified"}
                  {c.duration ? ` · ${c.duration}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Certifications */}
      {metrics.certifications && metrics.certifications.length > 0 && (
        <div className="case-card p-5">
          <SectionTitle>Certifications</SectionTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {metrics.certifications.map((c) => (
              <li
                key={c}
                className="rounded-lg bg-[var(--cream)] px-3 py-2"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths & weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="case-card p-5">
          <SectionTitle>Strengths</SectionTitle>
          {metrics.strengths && metrics.strengths.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {metrics.strengths.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-[var(--green)]">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-faint)]">None noted.</p>
          )}
        </div>
        <div className="case-card p-5">
          <SectionTitle>Weaknesses / gaps</SectionTitle>
          {metrics.concerns && metrics.concerns.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {metrics.concerns.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-[var(--orange)]">–</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-faint)]">None noted.</p>
          )}
        </div>
      </div>

      {/* Suitability */}
      <div className="case-card border-[var(--cyan)] bg-[var(--cyan-soft)] p-5">
        <SectionTitle>Suitability for {roleLabel}</SectionTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill variant={suitabilityVariant(screening.suitability?.verdict)}>
            {screening.suitability?.verdict || "Review required"}
          </Pill>
          {screening.recommendation && (
            <Pill variant={recommendationVariant(screening.recommendation)}>
              AI: {screening.recommendation}
            </Pill>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          {screening.suitability?.description || metrics.summary || "—"}
        </p>
        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          This is an AI advisory only. The recruiter makes the final Proceed /
          Hold / Reject decision in the Verdict step.
        </p>
      </div>

      {/* Project suggestions */}
      {metrics.project_suggestions && metrics.project_suggestions.length > 0 && (
        <div className="case-card p-5">
          <SectionTitle>Other matching projects</SectionTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {metrics.project_suggestions.map((p, i) => (
              <li
                key={`${p.project}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--cream)] px-3 py-2"
              >
                <span>
                  <span className="font-bold">{p.project}</span>
                  {p.reason ? ` — ${p.reason}` : ""}
                </span>
                {canReassign && candidateId && (
                  <button
                    type="button"
                    disabled={reassigning === p.project}
                    onClick={async () => {
                      setReassigning(p.project);
                      const projects = (await fetch("/api/projects").then((r) =>
                        r.json(),
                      )) as { id: string; name: string }[];
                      const match = projects.find((x) => x.name === p.project);
                      if (!match) {
                        setReassigning(null);
                        return;
                      }
                      await fetch(`/api/candidates/${candidateId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "reassign",
                          projectId: match.id,
                        }),
                      });
                      setReassigning(null);
                      router.refresh();
                    }}
                    className="text-[11px] font-semibold text-[var(--cyan-d)] hover:underline"
                  >
                    {reassigning === p.project ? "Moving…" : "Reassign →"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function joinTechList(techs: string[]) {
  if (techs.length <= 1) return techs[0] ?? "";
  if (techs.length === 2) return `${techs[0]} and ${techs[1]}`;
  return `${techs.slice(0, -1).join(", ")}, and ${techs[techs.length - 1]}`;
}

function ClarificationBlock({
  candidateName,
  clarifications,
}: {
  candidateName: string;
  clarifications: { technology: string; reason: string }[];
}) {
  const firstName = candidateName.split(" ")[0] || "there";
  const techs = clarifications.map((c) => c.technology);
  const bulletList = techs.map((t) => `  • ${t}`).join("\n");
  const defaultMessage = `Hi ${firstName},\n\nThank you for sharing your profile. Before we proceed, we'd like to understand your hands-on, real-time project experience with the following:\n\n${bulletList}\n\nFor each, a short note on the project context, your exact responsibilities, and how you applied it in production would help us evaluate your experience accurately.\n\nThank you!`;
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--cream)] text-left">
              <Th>Technology</Th>
              <Th>Why clarification is needed</Th>
            </tr>
          </thead>
          <tbody>
            {clarifications.map((c) => (
              <tr key={c.technology} className="border-t border-[var(--cream-2)]">
                <Td>
                  <span className="font-bold">{c.technology}</span>
                </Td>
                <Td>
                  <span className="text-[var(--ink-faint)]">
                    {c.reason || "Mentioned generically — confirm real-world usage."}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="case-label mt-4">Message for the candidate</p>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">
        One combined message covering {joinTechList(techs)}. Edit if needed, then
        copy and send.
      </p>
      <FieldTextarea
        className="mt-2 text-sm"
        rows={9}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-lg border border-[var(--cream-2)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--cyan)] hover:bg-[var(--cream)]"
      >
        {copied ? "Copied ✓" : "Copy message for recruiter"}
      </button>
    </div>
  );
}

function QuestionList({
  title,
  items,
}: {
  title: string;
  items: unknown[];
}) {
  const list = items.filter(
    (q): q is string => typeof q === "string" && q.trim().length > 0,
  );
  return (
    <div>
      <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
        {title}
      </h3>
      {list.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--ink-faint)]">None generated.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] text-[var(--ink-soft)]">
          {list.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.startsWith("match")) return <Pill variant="green">Matched</Pill>;
  if (s.startsWith("clarif")) return <Pill variant="orange">Clarification</Pill>;
  return <Pill variant="neutral">Unmatched</Pill>;
}

function suitabilityVariant(verdict?: string): "green" | "orange" | "neutral" {
  const v = (verdict ?? "").toLowerCase();
  if (v.startsWith("suitable")) return "green";
  if (v.startsWith("partial")) return "orange";
  if (v.startsWith("not")) return "orange";
  return "neutral";
}

function recommendationVariant(rec?: string): "green" | "orange" | "neutral" {
  const r = (rec ?? "").toLowerCase();
  if (r.startsWith("proceed")) return "green";
  if (r.startsWith("hold")) return "orange";
  if (r.startsWith("reject")) return "orange";
  return "neutral";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-lg font-bold">{children}</h3>;
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3">
      <div className="case-label">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-4 text-center">
      <div className="case-label">{label}</div>
      <div
        className={cn(
          "font-serif mt-1 text-2xl",
          accent && "text-[var(--green)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  width,
  warn,
}: {
  label: string;
  width: number;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[9px] uppercase tracking-wide text-white/50">
        {label.slice(0, 20)}
      </div>
      <div className="h-1.5 bg-white/15">
        <div
          className={cn("h-full", warn ? "bg-[var(--orange)]" : "bg-[var(--cyan)]")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
