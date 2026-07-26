"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";

type Audience = "candidate" | "interviewer";
type CandidatePhase = "intro" | "writing" | "submitted";
type InterviewerPanel = "setup" | "live" | "review";
type SetupMode = "library" | "ai" | "blank";

type ActivityEvent = {
  id: string;
  at: string;
  type:
    | "opened"
    | "focused"
    | "typing"
    | "pasted"
    | "blurred"
    | "submitted"
    | "link_created"
    | "code_sync";
  label: string;
};

type ExerciseTemplate = {
  id: string;
  title: string;
  language: string;
  timeLimitMin: number;
  scenario: string;
  starterCode: string;
  tags: string[];
  source: "library" | "ai" | "custom";
};

const DEMO = {
  candidate: "Priya Sharma",
  role: "Senior Backend Engineer",
  project: "Payments Platform",
  stage: "First technical",
  interviewer: "Arjun Mehta",
  link: "https://evaluate.example.com/coding/ex_8f3a2c",
  /** Same defaults as app: OPENAI_MODEL → gpt-4o-mini; analysis uses gpt-4o */
  aiModel: "gpt-4o-mini",
};

const LIBRARY_SEED: ExerciseTemplate[] = [
  {
    id: "lib-race",
    title: "Fix the race condition",
    language: "TypeScript",
    timeLimitMin: 45,
    tags: ["concurrency", "backend"],
    source: "library",
    scenario: `You are given an in-memory cache used by a checkout service.
Under concurrent requests, some keys occasionally return stale values.

1. Identify the bug in the snippet below.
2. Rewrite get/set so concurrent reads/writes are safe.
3. Briefly note the trade-off you chose (complexity vs latency).`,
    starterCode: `type Entry = { value: string; expiresAt: number };

class Cache {
  private store = new Map<string, Entry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlMs: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export { Cache };`,
  },
  {
    id: "lib-sql",
    title: "Slow payments query",
    language: "SQL",
    timeLimitMin: 30,
    tags: ["sql", "performance"],
    source: "library",
    scenario: `A nightly reconciliation job scans payments and is timing out.

Rewrite the query and suggest one index. Explain why your change helps.`,
    starterCode: `SELECT p.*, c.email
FROM payments p
JOIN customers c ON c.id = p.customer_id
WHERE p.status = 'settled'
  AND p.created_at > NOW() - INTERVAL '90 days'
ORDER BY p.amount DESC;`,
  },
  {
    id: "lib-api",
    title: "Idempotent refund API",
    language: "TypeScript",
    timeLimitMin: 40,
    tags: ["api", "payments"],
    source: "library",
    scenario: `Design and sketch an idempotent refund endpoint.
Clients may retry the same request. Show request shape, status codes, and how you store idempotency keys.`,
    starterCode: `// POST /v1/payments/:id/refunds
// TODO: request/response types + handler sketch
`,
  },
];

const AI_GENERATED: ExerciseTemplate = {
  id: "ai-debounce",
  title: "Debounce search without dropping the latest query",
  language: "TypeScript",
  timeLimitMin: 35,
  tags: ["frontend", "async", "ai-generated"],
  source: "ai",
  scenario: `AI-generated for Senior Backend Engineer · Payments Platform (prototype).

Build a debounced search helper used by a payment lookup UI.
- Wait 300ms after the last keystroke before calling search(query)
- If a newer query arrives while a request is in flight, ignore stale results
- Expose cancel() to abort on unmount

Write the implementation in the starter file.`,
  starterCode: `export type SearchFn = (query: string) => Promise<string[]>;

export function createDebouncedSearch(search: SearchFn, delayMs = 300) {
  // TODO: implement debounce + stale-result guard + cancel()
  return {
    push(_query: string) {},
    cancel() {},
  };
}
`,
};

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function eventLabel(type: ActivityEvent["type"]): string {
  switch (type) {
    case "link_created":
      return "Exercise link created — tagged to candidate + interviewer + stage (no candidate login)";
    case "opened":
      return "Candidate opened token link (identity = token, not a user account)";
    case "focused":
      return "Editor focused";
    case "typing":
      return "Typing heartbeat in our editor";
    case "code_sync":
      return "Live code snapshot synced to interviewer preview";
    case "pasted":
      return "Large paste detected in editor";
    case "blurred":
      return "Tab hidden / editor blurred";
    case "submitted":
      return "Candidate submitted — locked for report";
  }
}

export function CodingExercisePrototype() {
  const [audience, setAudience] = useState<Audience>("interviewer");
  const [candidatePhase, setCandidatePhase] = useState<CandidatePhase>("intro");
  const [interviewerPanel, setInterviewerPanel] = useState<InterviewerPanel>("setup");
  const [setupMode, setSetupMode] = useState<SetupMode>("library");
  const [library, setLibrary] = useState<ExerciseTemplate[]>(LIBRARY_SEED);
  const [selected, setSelected] = useState<ExerciseTemplate>(LIBRARY_SEED[0]!);
  const [draftTitle, setDraftTitle] = useState(LIBRARY_SEED[0]!.title);
  const [draftScenario, setDraftScenario] = useState(LIBRARY_SEED[0]!.scenario);
  const [draftCode, setDraftCode] = useState(LIBRARY_SEED[0]!.starterCode);
  const [draftLang, setDraftLang] = useState(LIBRARY_SEED[0]!.language);
  const [draftMins, setDraftMins] = useState(LIBRARY_SEED[0]!.timeLimitMin);
  const [aiPrompt, setAiPrompt] = useState(
    "Concurrency bug in a Node cache used by checkout — suitable for 35–45 min",
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [code, setCode] = useState(LIBRARY_SEED[0]!.starterCode);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCreated, setLinkCreated] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<"waiting" | "active" | "submitted">("waiting");
  const [secondsLeft, setSecondsLeft] = useState(LIBRARY_SEED[0]!.timeLimitMin * 60);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const pushEvent = useCallback((type: ActivityEvent["type"]) => {
    setEvents((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: nowLabel(),
        type,
        label: eventLabel(type),
      },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    if (candidatePhase !== "writing" || liveStatus !== "active") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [candidatePhase, liveStatus]);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  function applyTemplate(t: ExerciseTemplate) {
    setSelected(t);
    setDraftTitle(t.title);
    setDraftScenario(t.scenario);
    setDraftCode(t.starterCode);
    setDraftLang(t.language);
    setDraftMins(t.timeLimitMin);
    if (liveStatus === "waiting") {
      setCode(t.starterCode);
      setSecondsLeft(t.timeLimitMin * 60);
    }
  }

  function createLink() {
    setLinkCreated(true);
    setLiveStatus("waiting");
    setCode(draftCode);
    setSecondsLeft(draftMins * 60);
    pushEvent("link_created");
    setInterviewerPanel("live");
  }

  function copyLink() {
    void navigator.clipboard?.writeText(DEMO.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function beginExercise() {
    setCandidatePhase("writing");
    setLiveStatus("active");
    setSecondsLeft(draftMins * 60);
    setCode(draftCode);
    pushEvent("opened");
    pushEvent("focused");
  }

  function onCodeChange(value: string) {
    const grewALot = value.length - code.length > 40;
    setCode(value);
    setLastSyncAt(nowLabel());
    if (grewALot) pushEvent("pasted");
    else {
      pushEvent("typing");
      pushEvent("code_sync");
    }
  }

  function submitExercise() {
    setCandidatePhase("submitted");
    setLiveStatus("submitted");
    pushEvent("submitted");
    setInterviewerPanel("review");
    setAudience("interviewer");
  }

  function runAiGenerate() {
    setAiBusy(true);
    // Prototype only — real impl calls existing OpenAI helper (OPENAI_MODEL / gpt-4o-mini)
    window.setTimeout(() => {
      const generated = {
        ...AI_GENERATED,
        title: AI_GENERATED.title,
        scenario: `${AI_GENERATED.scenario}\n\n(Prompt used: “${aiPrompt.trim()}”)`,
      };
      setLibrary((prev) => [generated, ...prev.filter((x) => x.id !== generated.id)]);
      applyTemplate(generated);
      setSetupMode("ai");
      setAiBusy(false);
    }, 900);
  }

  function saveToLibrary() {
    const id = `lib-${Date.now()}`;
    const item: ExerciseTemplate = {
      id,
      title: draftTitle.trim() || "Untitled exercise",
      language: draftLang,
      timeLimitMin: draftMins,
      scenario: draftScenario,
      starterCode: draftCode,
      tags: ["saved"],
      source: selected.source === "ai" ? "ai" : "custom",
    };
    setLibrary((prev) => [item, ...prev]);
    setSelected(item);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }

  function startBlank() {
    const blank: ExerciseTemplate = {
      id: `blank-${Date.now()}`,
      title: "",
      language: "TypeScript",
      timeLimitMin: 40,
      scenario: "",
      starterCode: "// Starter code…\n",
      tags: [],
      source: "custom",
    };
    applyTemplate(blank);
    setSetupMode("blank");
  }

  function resetDemo() {
    setAudience("interviewer");
    setCandidatePhase("intro");
    setInterviewerPanel("setup");
    setSetupMode("library");
    setLibrary(LIBRARY_SEED);
    applyTemplate(LIBRARY_SEED[0]!);
    setNotes("");
    setCopied(false);
    setLinkCreated(false);
    setEvents([]);
    setLiveStatus("waiting");
    setLastSyncAt(null);
    setAiBusy(false);
    setSavedFlash(false);
  }

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--cream-2)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cyan-d)]">
              Visual prototype · not wired to data
            </p>
            <h1 className="font-serif text-lg font-bold text-[var(--ink)] md:text-xl">
              Coding exercise — no candidate login · live editor track · AI + library
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-0.5">
              {(
                [
                  ["interviewer", "Interviewer"],
                  ["candidate", "Candidate (token link)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAudience(id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors",
                    audience === id
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" className="!px-4 !py-2 text-[12px]" onClick={resetDemo}>
              Reset demo
            </Button>
          </div>
        </div>

        {audience === "interviewer" && (
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:px-6">
            {(
              [
                ["setup", "1. Pick / AI / save"],
                ["live", "2. Live editor track"],
                ["review", "3. In report"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setInterviewerPanel(id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold",
                  interviewerPanel === id
                    ? "bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                    : "text-[var(--ink-faint)] hover:bg-[var(--cream-2)] hover:text-[var(--ink-soft)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 rounded-xl border border-[var(--cyan)]/20 bg-[var(--cyan-soft)] px-4 py-3 text-[13px] text-[var(--ink)]">
          <strong>No candidate login.</strong> Tracking uses a one-time token URL bound to this candidate +
          interviewer + stage (same idea as AI screening).{" "}
          <strong>Real-time code only if they type in our editor</strong> — we cannot see Notepad/VS Code on their
          machine. No camera/video required; we log editor activity + live code snapshots.
        </div>

        {audience === "candidate" ? (
          <CandidateViews
            phase={candidatePhase}
            title={draftTitle}
            language={draftLang}
            scenario={draftScenario}
            code={code}
            notes={notes}
            mmss={mmss}
            onBegin={beginExercise}
            onCodeChange={onCodeChange}
            onNotesChange={setNotes}
            onBlur={() => pushEvent("blurred")}
            onFocus={() => pushEvent("focused")}
            onSubmit={submitExercise}
          />
        ) : interviewerPanel === "setup" ? (
          <SetupPanel
            setupMode={setupMode}
            onSetupMode={setSetupMode}
            library={library}
            selectedId={selected.id}
            onSelect={(t) => {
              applyTemplate(t);
              setSetupMode("library");
            }}
            draftTitle={draftTitle}
            draftScenario={draftScenario}
            draftCode={draftCode}
            draftLang={draftLang}
            draftMins={draftMins}
            onDraftTitle={setDraftTitle}
            onDraftScenario={setDraftScenario}
            onDraftCode={setDraftCode}
            onDraftLang={setDraftLang}
            onDraftMins={setDraftMins}
            aiPrompt={aiPrompt}
            onAiPrompt={setAiPrompt}
            aiBusy={aiBusy}
            onAiGenerate={runAiGenerate}
            onSave={saveToLibrary}
            savedFlash={savedFlash}
            onBlank={startBlank}
            linkCreated={linkCreated}
            copied={copied}
            onCreateLink={createLink}
            onCopyLink={copyLink}
          />
        ) : interviewerPanel === "live" ? (
          <LivePanel
            liveStatus={liveStatus}
            events={events}
            code={code}
            mmss={mmss}
            lastSyncAt={lastSyncAt}
            title={draftTitle}
            language={draftLang}
            copied={copied}
            onCopyLink={copyLink}
            onJumpToCandidate={() => setAudience("candidate")}
          />
        ) : (
          <ReviewPanel
            liveStatus={liveStatus}
            events={events}
            code={code}
            notes={notes}
            title={draftTitle}
            language={draftLang}
            scenario={draftScenario}
          />
        )}
      </main>
    </div>
  );
}

function SetupPanel({
  setupMode,
  onSetupMode,
  library,
  selectedId,
  onSelect,
  draftTitle,
  draftScenario,
  draftCode,
  draftLang,
  draftMins,
  onDraftTitle,
  onDraftScenario,
  onDraftCode,
  onDraftLang,
  onDraftMins,
  aiPrompt,
  onAiPrompt,
  aiBusy,
  onAiGenerate,
  onSave,
  savedFlash,
  onBlank,
  linkCreated,
  copied,
  onCreateLink,
  onCopyLink,
}: {
  setupMode: SetupMode;
  onSetupMode: (m: SetupMode) => void;
  library: ExerciseTemplate[];
  selectedId: string;
  onSelect: (t: ExerciseTemplate) => void;
  draftTitle: string;
  draftScenario: string;
  draftCode: string;
  draftLang: string;
  draftMins: number;
  onDraftTitle: (v: string) => void;
  onDraftScenario: (v: string) => void;
  onDraftCode: (v: string) => void;
  onDraftLang: (v: string) => void;
  onDraftMins: (v: number) => void;
  aiPrompt: string;
  onAiPrompt: (v: string) => void;
  aiBusy: boolean;
  onAiGenerate: () => void;
  onSave: () => void;
  savedFlash: boolean;
  onBlank: () => void;
  linkCreated: boolean;
  copied: boolean;
  onCreateLink: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="space-y-4">
        <section className="rounded-xl border border-[var(--cream-2)] bg-white p-4 shadow-sm">
          <h2 className="font-serif text-base font-bold text-[var(--ink)]">How do you want the exercise?</h2>
          <div className="mt-3 grid gap-2">
            {(
              [
                ["library", "Load saved", "Reuse a scenario already in the system"],
                ["ai", "Generate with AI", `Uses ${DEMO.aiModel} (same OPENAI_MODEL stack)`],
                ["blank", "Create new", "Write from scratch, then save for next time"],
              ] as const
            ).map(([id, title, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSetupMode(id);
                  if (id === "blank") onBlank();
                }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  setupMode === id
                    ? "border-[var(--cyan)] bg-[var(--cyan-soft)]"
                    : "border-[var(--cream-2)] bg-white hover:border-[var(--cyan)]/40",
                )}
              >
                <p className="text-[13px] font-bold text-[var(--ink)]">{title}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{hint}</p>
              </button>
            ))}
          </div>
        </section>

        {setupMode === "library" && (
          <section className="rounded-xl border border-[var(--cream-2)] bg-white p-4 shadow-sm">
            <h3 className="font-serif text-sm font-bold">Saved exercises</h3>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {library.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left",
                      selectedId === t.id
                        ? "border-[var(--cyan)] bg-[var(--cyan-soft)]"
                        : "border-[var(--cream-2)] hover:bg-[var(--cream)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[var(--ink)]">{t.title || "Untitled"}</span>
                      {t.source === "ai" && <Pill variant="cyan">AI</Pill>}
                      {t.tags.includes("saved") && <Pill variant="green">Saved</Pill>}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                      {t.language} · {t.timeLimitMin} min
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {setupMode === "ai" && (
          <section className="rounded-xl border border-[var(--cream-2)] bg-white p-4 shadow-sm">
            <h3 className="font-serif text-sm font-bold">AI scenario generator</h3>
            <p className="mt-1 text-[12px] text-[var(--ink-soft)]">
              Context auto-filled from candidate role/project (prototype shows the prompt only).
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[13px] outline-none focus:border-[var(--cyan)]"
              rows={4}
              value={aiPrompt}
              onChange={(e) => onAiPrompt(e.target.value)}
              placeholder="What should we test? e.g. SQL performance, API idempotency…"
            />
            <Button
              type="button"
              className="mt-3 w-full !py-2.5 text-[13px]"
              disabled={aiBusy || !aiPrompt.trim()}
              onClick={onAiGenerate}
            >
              {aiBusy ? "Generating…" : `Generate with ${DEMO.aiModel}`}
            </Button>
          </section>
        )}

        <div className="rounded-xl border border-[var(--cream-2)] bg-white p-4 text-[12px] text-[var(--ink-soft)] shadow-sm">
          <p className="font-bold text-[var(--ink)]">Tagged when you share</p>
          <ul className="mt-2 space-y-1">
            <li>Candidate · {DEMO.candidate}</li>
            <li>Interviewer · {DEMO.interviewer}</li>
            <li>Stage · {DEMO.stage}</li>
            <li>Token link · no password for candidate</li>
          </ul>
        </div>
      </aside>

      <section className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              Interview workspace · {DEMO.stage}
            </p>
            <h2 className="font-serif text-xl font-bold text-[var(--ink)]">{DEMO.candidate}</h2>
          </div>
          <Pill variant={linkCreated ? "green" : "neutral"}>
            {linkCreated ? "Link active" : "Draft — not shared"}
          </Pill>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] sm:col-span-2">
            <span className="font-bold text-[var(--ink-soft)]">Title</span>
            <input
              value={draftTitle}
              onChange={(e) => onDraftTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--cyan)]"
            />
          </label>
          <label className="block text-[12px]">
            <span className="font-bold text-[var(--ink-soft)]">Language</span>
            <input
              value={draftLang}
              onChange={(e) => onDraftLang(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--cyan)]"
            />
          </label>
          <label className="block text-[12px]">
            <span className="font-bold text-[var(--ink-soft)]">Time (min)</span>
            <input
              type="number"
              value={draftMins}
              onChange={(e) => onDraftMins(Number(e.target.value) || 30)}
              className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--cyan)]"
            />
          </label>
        </div>

        <label className="mt-3 block text-[12px]">
          <span className="font-bold text-[var(--ink-soft)]">Scenario</span>
          <textarea
            rows={6}
            value={draftScenario}
            onChange={(e) => onDraftScenario(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-[var(--cyan)]"
          />
        </label>

        <label className="mt-3 block text-[12px]">
          <span className="font-bold text-[var(--ink-soft)]">Starter code (shown in candidate editor)</span>
          <textarea
            rows={8}
            value={draftCode}
            onChange={(e) => onDraftCode(e.target.value)}
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-[var(--cream-2)] bg-[#0f1720] px-3 py-2 font-mono text-[12px] leading-relaxed text-[#e2e8f0] outline-none"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" className="!px-4 !py-2.5 text-[13px]" onClick={onSave}>
            {savedFlash ? "Saved to library" : "Save to library"}
          </Button>
          <Button type="button" className="!px-5 !py-2.5 text-[13px]" onClick={onCreateLink}>
            {linkCreated ? "Regenerate token link" : "Generate token link & share"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="!px-4 !py-2.5 text-[13px]"
            disabled={!linkCreated}
            onClick={onCopyLink}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        {linkCreated && (
          <p className="mt-3 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 font-mono text-[12px] text-[var(--ink-soft)]">
            {DEMO.link}
          </p>
        )}
      </section>
    </div>
  );
}

function LivePanel({
  liveStatus,
  events,
  code,
  mmss,
  lastSyncAt,
  title,
  language,
  copied,
  onCopyLink,
  onJumpToCandidate,
}: {
  liveStatus: "waiting" | "active" | "submitted";
  events: ActivityEvent[];
  code: string;
  mmss: string;
  lastSyncAt: string | null;
  title: string;
  language: string;
  copied: boolean;
  onCopyLink: () => void;
  onJumpToCandidate: () => void;
}) {
  const statusPill =
    liveStatus === "submitted" ? (
      <Pill variant="green">Submitted</Pill>
    ) : liveStatus === "active" ? (
      <Pill variant="cyan">Live · {mmss} left</Pill>
    ) : (
      <Pill variant="neutral">Waiting for candidate to open link</Pill>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--ink)]">Live editor mirror</h2>
            <p className="text-[13px] text-[var(--ink-soft)]">
              {title || "Exercise"} · {language}
            </p>
          </div>
          {statusPill}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[var(--ink-soft)]">
          <Pill variant="cyan">SSE / WebSocket sync (planned)</Pill>
          {lastSyncAt ? (
            <span>Last code sync · {lastSyncAt}</span>
          ) : (
            <span>No snapshots yet — open candidate view and type</span>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--cream-2)]">
          <div className="flex items-center justify-between border-b border-[var(--cream-2)] bg-[var(--navy)] px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">
              What candidate is typing now
            </span>
            <span
              className={cn(
                "size-2 rounded-full",
                liveStatus === "active" ? "bg-[var(--green)]" : "bg-white/30",
              )}
            />
          </div>
          <pre className="max-h-[360px] min-h-[220px] overflow-auto bg-[#0f1720] p-4 font-mono text-[11.5px] leading-relaxed text-[#e2e8f0]">
            {code}
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" className="!px-4 !py-2 text-[12px]" onClick={onCopyLink}>
            {copied ? "Copied" : "Copy token link"}
          </Button>
          <Button type="button" variant="outline" className="!px-4 !py-2 text-[12px]" onClick={onJumpToCandidate}>
            Act as candidate (demo)
          </Button>
        </div>

        <p className="mt-3 text-[12px] text-[var(--ink-faint)]">
          If they paste from ChatGPT or leave the tab, you see paste / blur events — not their desktop or webcam.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
        <h3 className="font-serif text-sm font-bold text-[var(--ink)]">Editor activity log</h3>
        <p className="mt-1 text-[12px] text-[var(--ink-faint)]">
          Heartbeats + sync events. Identity comes from the token, not a login.
        </p>

        {events.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--cream-2)] bg-[var(--cream)] px-4 py-8 text-center text-[13px] text-[var(--ink-faint)]">
            Generate a link, then start typing as the candidate to see live sync + events.
          </div>
        ) : (
          <ol className="mt-4 max-h-[460px] space-y-0 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-[var(--cream-2)] py-2.5 last:border-0">
                <span className="w-16 shrink-0 font-mono text-[11px] text-[var(--ink-faint)]">{e.at}</span>
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    e.type === "submitted" && "bg-[var(--green)]",
                    (e.type === "pasted" || e.type === "blurred") && "bg-[var(--orange)]",
                    (e.type === "typing" ||
                      e.type === "code_sync" ||
                      e.type === "opened" ||
                      e.type === "focused") &&
                      "bg-[var(--cyan)]",
                    e.type === "link_created" && "bg-[var(--ink-faint)]",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    {e.type.replace("_", " ")}
                  </p>
                  <p className="text-[13px] text-[var(--ink)]">{e.label}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function ReviewPanel({
  liveStatus,
  events,
  code,
  notes,
  title,
  language,
  scenario,
}: {
  liveStatus: "waiting" | "active" | "submitted";
  events: ActivityEvent[];
  code: string;
  notes: string;
  title: string;
  language: string;
  scenario: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            Final evaluation report · excerpt
          </p>
          <h2 className="font-serif text-xl font-bold text-[var(--ink)]">
            {DEMO.candidate} · {DEMO.stage}
          </h2>
        </div>
        <Pill variant={liveStatus === "submitted" ? "green" : "orange"}>
          {liveStatus === "submitted" ? "Coding exercise included" : "Awaiting submission"}
        </Pill>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-sm">
        <div className="border-b border-[var(--cream-2)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-base font-bold">{title || "Coding exercise"}</h3>
            <Pill variant="neutral">{language}</Pill>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--ink-soft)]">{scenario}</p>
        </div>

        {liveStatus === "submitted" ? (
          <>
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                Candidate submission
              </p>
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-[#0f1720] p-4 font-mono text-[11.5px] leading-relaxed text-[#e2e8f0]">
                {code}
              </pre>
              {notes.trim() && (
                <div className="mt-3 rounded-lg bg-[var(--cream)] px-3 py-2 text-[13px] text-[var(--ink-soft)]">
                  <span className="font-bold text-[var(--ink)]">Candidate notes: </span>
                  {notes}
                </div>
              )}
            </div>
            <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] px-5 py-4 text-[13px] text-[var(--ink-soft)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                Activity summary for PDF
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                <li>Paste events: {events.filter((e) => e.type === "pasted").length}</li>
                <li>Tab blur: {events.filter((e) => e.type === "blurred").length}</li>
                <li>Code sync heartbeats: {events.filter((e) => e.type === "code_sync").length}</li>
                <li>Submitted · {events.find((e) => e.type === "submitted")?.at ?? "—"}</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-faint)]">
            Submit from the candidate token view to populate this block.
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateViews({
  phase,
  title,
  language,
  scenario,
  code,
  notes,
  mmss,
  onBegin,
  onCodeChange,
  onNotesChange,
  onBlur,
  onFocus,
  onSubmit,
}: {
  phase: CandidatePhase;
  title: string;
  language: string;
  scenario: string;
  code: string;
  notes: string;
  mmss: string;
  onBegin: () => void;
  onCodeChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  onSubmit: () => void;
}) {
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-[var(--cream-2)] bg-white p-8 shadow-sm">
          <Pill variant="cyan">Secure link · no login</Pill>
          <h2 className="mt-4 font-serif text-2xl font-bold text-[var(--ink)]">Hi {DEMO.candidate}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">
            This link is unique to you for <strong>{DEMO.role}</strong> · <strong>{DEMO.stage}</strong>. You do not
            need an account — opening it starts tracking for your interviewer.
          </p>
          <ul className="mt-5 space-y-2.5 text-[13px] text-[var(--ink-soft)]">
            <li className="flex gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--cyan)]" />
              Work only in this browser editor so your panel can follow live
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--cyan)]" />
              Code typed here syncs to the interviewer in near real time
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--cyan)]" />
              No camera — we only log editor activity (focus, typing, paste, submit)
            </li>
          </ul>
          <Button type="button" className="mt-7 w-full" onClick={onBegin}>
            Start exercise
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <Pill variant="green">Submitted</Pill>
          <h2 className="mt-4 font-serif text-2xl font-bold">Thank you</h2>
          <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
            Your solution is locked into this round&apos;s evaluation for {DEMO.interviewer}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--cyan-d)]">
            {title || "Coding exercise"}
          </p>
          <h2 className="font-serif text-xl font-bold text-[var(--ink)]">{DEMO.role}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="neutral">{language}</Pill>
          <Pill variant={mmss.startsWith("0:") ? "orange" : "cyan"}>⏱ {mmss}</Pill>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
          <h3 className="font-serif text-sm font-bold text-[var(--ink)]">Scenario</h3>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink-soft)]">{scenario}</p>
          <div className="mt-4">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              Short notes (optional)
            </label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[13px] outline-none focus:border-[var(--cyan)]"
              rows={4}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Trade-offs, assumptions…"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--cream-2)] bg-[var(--navy)] px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">Editor · live sync on</span>
            <span className="text-[11px] text-white/50">Synced to interviewer</span>
          </div>
          <textarea
            className="min-h-[340px] w-full resize-y bg-[#0f1720] p-4 font-mono text-[12.5px] leading-relaxed text-[#e2e8f0] outline-none"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cream-2)] bg-white px-4 py-3">
            <p className="text-[12px] text-[var(--ink-faint)]">Typing here updates the interviewer mirror live.</p>
            <Button type="button" className="!px-5 !py-2.5 text-[13px]" onClick={onSubmit}>
              Submit solution
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
