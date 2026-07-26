"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";

type Exercise = {
  id: string;
  title: string;
  language: string;
  timeLimitMin: number;
  scenario: string;
  starterCode: string;
};

type SessionView = {
  id: string;
  token: string;
  link: string;
  title: string;
  language: string;
  timeLimitMin: number;
  scenario: string;
  starterCode: string;
  candidateCode: string;
  candidateNotes: string;
  status: string;
  updatedAt: string;
};

type EventView = {
  id: string;
  type: string;
  at: string;
};

type Mode = "library" | "ai" | "blank";

export function CodingExercisePanel({
  stageId,
  roleName,
  projectName,
}: {
  stageId: string;
  roleName: string;
  projectName?: string;
}) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<Mode>("library");
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [session, setSession] = useState<SessionView | null>(null);
  const [events, setEvents] = useState<EventView[]>([]);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [timeLimitMin, setTimeLimitMin] = useState(40);
  const [scenario, setScenario] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState(
    "Practical concurrency or API design problem suitable for 35–45 minutes",
  );
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"setup" | "live">("setup");
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStatusRef = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/stages/${stageId}/coding`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setLiveError("Could not refresh live session");
        return;
      }
      const data = await res.json();
      const next = (data.session ?? null) as SessionView | null;
      setSession(next);
      sessionIdRef.current = next?.id ?? null;
      sessionStatusRef.current = next?.status ?? null;
      setEvents(
        (data.events ?? []).map((e: { id: string; type: string; at: string }) => ({
          id: e.id,
          type: e.type,
          at: e.at,
        })),
      );
      setLastRefreshAt(new Date().toLocaleTimeString());
      setLiveError(null);
    } catch {
      setLiveError("Live refresh failed — retrying…");
    }
  }, [stageId]);

  const loadLibrary = useCallback(async () => {
    const res = await fetch("/api/coding-exercises");
    if (!res.ok) return;
    const rows = (await res.json()) as Exercise[];
    setLibrary(rows);
  }, []);

  useEffect(() => {
    void loadLibrary();
    void refreshSession();
  }, [loadLibrary, refreshSession]);

  // Auto-poll while Live tab is open (do not depend on session object identity)
  useEffect(() => {
    if (tab !== "live") return;
    void refreshSession();
    const t = setInterval(() => {
      if (sessionStatusRef.current === "submitted") return;
      void refreshSession();
    }, 1500);
    return () => clearInterval(t);
  }, [tab, refreshSession]);

  function applyExercise(ex: Exercise) {
    setExerciseId(ex.id);
    setTitle(ex.title);
    setLanguage(ex.language);
    setTimeLimitMin(ex.timeLimitMin);
    setScenario(ex.scenario);
    setStarterCode(ex.starterCode);
  }

  async function generateAi() {
    setAiBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/coding-exercises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          roleName,
          projectName,
          language,
          timeLimitMin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");
      setExerciseId(null);
      setTitle(data.title);
      setLanguage(data.language);
      setTimeLimitMin(data.timeLimitMin);
      setScenario(data.scenario);
      setStarterCode(data.starterCode);
      setMessage("AI draft ready — edit if needed, then generate link or save to library.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveLibrary() {
    if (!title.trim() || !scenario.trim()) {
      setMessage("Title and scenario are required to save.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/coding-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          language,
          timeLimitMin,
          scenario,
          starterCode,
          visibility: "org",
          tags: ["saved"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setExerciseId(data.id);
      await loadLibrary();
      setMessage("Saved to coding exercise library.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function createLink() {
    if (!title.trim() || !scenario.trim()) {
      setMessage("Title and scenario are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stages/${stageId}/coding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          exerciseId
            ? { exerciseId }
            : { title, language, timeLimitMin, scenario, starterCode },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create link");
      setSession(data.session);
      sessionIdRef.current = data.session?.id ?? null;
      sessionStatusRef.current = data.session?.status ?? null;
      setTab("live");
      setMessage("Token link created — copy and share with the candidate.");
      await refreshSession();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create link");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!session?.link) return;
    await navigator.clipboard.writeText(session.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cyan)]/25 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-[var(--cyan-soft)] px-4 py-3 text-left"
      >
        <div>
          <p className="font-serif text-sm font-bold text-[var(--ink)]">Coding exercise</p>
          <p className="text-[12px] text-[var(--ink-soft)]">
            Token link · live editor track · no candidate login
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <Pill
              variant={
                session.status === "submitted"
                  ? "green"
                  : session.status === "in_progress"
                    ? "cyan"
                    : "neutral"
              }
            >
              {session.status.replace("_", " ")}
            </Pill>
          )}
          <span className="text-[12px] font-bold text-[var(--cyan-d)]">{open ? "Hide" : "Show"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-4 p-4">
          <div className="flex gap-1 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-0.5">
            {(
              [
                ["setup", "Setup & share"],
                ["live", "Live track"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-bold",
                  tab === id ? "bg-[var(--ink)] text-white" : "text-[var(--ink-soft)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {message && (
            <p className="rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-[12px] text-[var(--ink-soft)]">
              {message}
            </p>
          )}

          {tab === "setup" ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["library", "Load saved"],
                    ["ai", "Generate with AI"],
                    ["blank", "Create new"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMode(id);
                      if (id === "blank") {
                        setExerciseId(null);
                        setTitle("");
                        setScenario("");
                        setStarterCode("// Starter code\n");
                      }
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[12px] font-bold",
                      mode === id
                        ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                        : "border-[var(--cream-2)] text-[var(--ink-soft)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "library" && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--cream-2)] p-2">
                  {library.length === 0 ? (
                    <p className="px-2 py-3 text-[12px] text-[var(--ink-faint)]">
                      No saved exercises yet — generate with AI or create new, then save.
                    </p>
                  ) : (
                    library.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => applyExercise(ex)}
                        className={cn(
                          "w-full rounded-md px-2 py-2 text-left text-[12px]",
                          exerciseId === ex.id
                            ? "bg-[var(--cyan-soft)] font-bold"
                            : "hover:bg-[var(--cream)]",
                        )}
                      >
                        {ex.title}
                        <span className="ml-2 text-[var(--ink-faint)]">
                          {ex.language} · {ex.timeLimitMin}m
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {mode === "ai" && (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[13px]"
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="What should we test?"
                  />
                  <Button
                    type="button"
                    className="!px-4 !py-2 text-[12px]"
                    disabled={aiBusy || !aiPrompt.trim()}
                    onClick={generateAi}
                  >
                    {aiBusy ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] sm:col-span-2">
                  <span className="font-bold text-[var(--ink-soft)]">Title</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px]"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setExerciseId(null);
                    }}
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="font-bold text-[var(--ink-soft)]">Language</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px]"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setExerciseId(null);
                    }}
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="font-bold text-[var(--ink-soft)]">Minutes</span>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px]"
                    value={timeLimitMin}
                    onChange={(e) => {
                      setTimeLimitMin(Number(e.target.value) || 40);
                      setExerciseId(null);
                    }}
                  />
                </label>
              </div>

              <label className="block text-[12px]">
                <span className="font-bold text-[var(--ink-soft)]">Scenario</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[var(--cream-2)] px-3 py-2 text-[13px]"
                  rows={5}
                  value={scenario}
                  onChange={(e) => {
                    setScenario(e.target.value);
                    setExerciseId(null);
                  }}
                />
              </label>

              <label className="block text-[12px]">
                <span className="font-bold text-[var(--ink-soft)]">Starter code</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[var(--cream-2)] bg-[#0f1720] px-3 py-2 font-mono text-[12px] text-[#e2e8f0]"
                  rows={7}
                  value={starterCode}
                  spellCheck={false}
                  onChange={(e) => {
                    setStarterCode(e.target.value);
                    setExerciseId(null);
                  }}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-4 !py-2 text-[12px]"
                  disabled={busy}
                  onClick={saveLibrary}
                >
                  Save to library
                </Button>
                <Button
                  type="button"
                  className="!px-4 !py-2 text-[12px]"
                  disabled={busy}
                  onClick={createLink}
                >
                  {busy ? "Creating…" : session ? "Regenerate link" : "Generate token link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="!px-4 !py-2 text-[12px]"
                  disabled={!session?.link}
                  onClick={copyLink}
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>

              {session?.link && (
                <p className="break-all rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 font-mono text-[11px] text-[var(--ink-soft)]">
                  {session.link}
                </p>
              )}
            </>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-[var(--ink)]">Live editor mirror</p>
                  <div className="flex items-center gap-2">
                    {lastRefreshAt && (
                      <span className="text-[10px] text-[var(--ink-faint)]">
                        Updated {lastRefreshAt}
                      </span>
                    )}
                    <Pill variant={session?.status === "in_progress" ? "cyan" : "neutral"}>
                      Auto · 1.5s
                    </Pill>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1.5 text-[11px]"
                      onClick={() => void refreshSession()}
                    >
                      Refresh now
                    </Button>
                  </div>
                </div>
                {liveError && (
                  <p className="mb-2 text-[12px] text-[var(--orange)]">{liveError}</p>
                )}
                {!session ? (
                  <p className="rounded-lg border border-dashed border-[var(--cream-2)] px-3 py-8 text-center text-[12px] text-[var(--ink-faint)]">
                    Generate a token link first, then watch the candidate type here.
                  </p>
                ) : (
                  <pre className="max-h-80 overflow-auto rounded-lg bg-[#0f1720] p-3 font-mono text-[11px] leading-relaxed text-[#e2e8f0]">
                    {session.candidateCode || session.starterCode}
                  </pre>
                )}
                {session?.candidateNotes?.trim() ? (
                  <p className="mt-2 rounded-lg bg-[var(--cream)] px-3 py-2 text-[12px] text-[var(--ink-soft)]">
                    <strong>Notes:</strong> {session.candidateNotes}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="mb-2 text-[12px] font-bold text-[var(--ink)]">Activity log</p>
                {events.length === 0 ? (
                  <p className="text-[12px] text-[var(--ink-faint)]">No events yet.</p>
                ) : (
                  <ol className="max-h-80 space-y-2 overflow-y-auto">
                    {events.map((e) => (
                      <li key={e.id} className="border-b border-[var(--cream-2)] pb-2 text-[12px]">
                        <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                          {new Date(e.at).toLocaleTimeString()}
                        </span>
                        <span className="ml-2 font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                          {e.type.replace("_", " ")}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
