"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";

type Phase =
  | "loading"
  | "intro"
  | "resume"
  | "writing"
  | "submitted"
  | "expired"
  | "error";

type SessionMeta = {
  candidateName: string;
  roleName: string;
  projectName: string;
  title: string;
  language: string;
  timeLimitMin: number;
  scenario: string;
  starterCode: string;
};

export function CodingClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCode = useRef("");
  const codeRef = useRef("");
  const notesRef = useRef("");
  const secondsRef = useRef(0);
  const phaseRef = useRef<Phase>("loading");

  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    secondsRef.current = secondsLeft;
  }, [secondsLeft]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/coding/${token}`);
    const data = await res.json().catch(() => ({}));
    if (res.status === 410 || data.status === "expired") {
      setPhase("expired");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Invalid link");
      setPhase("error");
      return;
    }
    setMeta({
      candidateName: data.candidateName,
      roleName: data.roleName,
      projectName: data.projectName,
      title: data.title,
      language: data.language,
      timeLimitMin: data.timeLimitMin,
      scenario: data.scenario,
      starterCode: data.starterCode ?? "",
    });
    setCode(data.candidateCode ?? data.starterCode ?? "");
    setNotes(data.candidateNotes ?? "");
    lastCode.current = data.candidateCode ?? data.starterCode ?? "";
    setSecondsLeft(
      typeof data.remainingSeconds === "number"
        ? data.remainingSeconds
        : (data.timeLimitMin ?? 40) * 60,
    );

    if (data.status === "submitted") setPhase("submitted");
    else if (data.status === "in_progress") setPhase("resume");
    else setPhase("intro");
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (phase !== "writing") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  async function post(body: Record<string, unknown>, opts?: { keepalive?: boolean }) {
    const res = await fetch(`/api/coding/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: opts?.keepalive,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    return data;
  }

  const flushSync = useCallback(
    async (
      event: string,
      overrides?: { code?: string; notes?: string; remainingSeconds?: number },
      opts?: { keepalive?: boolean },
    ) => {
      if (phaseRef.current !== "writing" && event !== "blurred") return;
      setSaveState("saving");
      try {
        await post(
          {
            action: "sync",
            code: overrides?.code ?? codeRef.current,
            notes: overrides?.notes ?? notesRef.current,
            remainingSeconds: overrides?.remainingSeconds ?? secondsRef.current,
            event,
          },
          opts,
        );
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    },
    // post uses token from closure; stable enough for heartbeat
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  function queueSync(nextCode: string, nextNotes: string, event: string) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void flushSync(event, { code: nextCode, notes: nextNotes });
    }, 400);
  }

  // Heartbeat: keep interviewer live view fresh even when not typing
  useEffect(() => {
    if (phase !== "writing") return;
    const t = setInterval(() => {
      void flushSync("code_sync");
    }, 3000);
    return () => clearInterval(t);
  }, [phase, flushSync]);

  // Tab leave/return — not textarea blur (notes↔editor would false-trigger)
  useEffect(() => {
    if (phase !== "writing") return;

    function onVisibility() {
      if (document.hidden) {
        void flushSync("blurred", undefined, { keepalive: true });
      } else {
        void flushSync("focused");
      }
    }

    function onPageHide() {
      void flushSync("blurred", undefined, { keepalive: true });
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [phase, flushSync]);

  async function begin(action: "start" | "resume" | "restart") {
    setBusy(true);
    setError(null);
    try {
      const data = await post({ action });
      setCode(data.candidateCode ?? meta?.starterCode ?? "");
      setNotes(data.candidateNotes ?? "");
      lastCode.current = data.candidateCode ?? meta?.starterCode ?? "";
      setSecondsLeft(
        typeof data.remainingSeconds === "number"
          ? data.remainingSeconds
          : (meta?.timeLimitMin ?? 40) * 60,
      );
      setPhase("writing");
      setSaveState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(value: string) {
    const pasted = value.length - lastCode.current.length > 40;
    lastCode.current = value;
    setCode(value);
    queueSync(value, notes, pasted ? "pasted" : "typing");
  }

  function onNotesChange(value: string) {
    setNotes(value);
    queueSync(code, value, "code_sync");
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      await post({
        action: "submit",
        code,
        notes,
        remainingSeconds: secondsLeft,
      });
      setPhase("submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-[14px] text-[var(--ink-soft)]">Loading…</p>
      </div>
    );
  }

  if (phase === "error" || phase === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-red-800">
            {phase === "expired" ? "Link expired" : "Unavailable"}
          </h1>
          <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
            {error ?? "This coding exercise link is no longer valid."}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <Pill variant="green">Submitted</Pill>
          <h1 className="mt-4 font-serif text-2xl font-bold">Thank you</h1>
          <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
            Your solution is saved for this interview round. You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "resume" && meta) {
    const preview = code.trim().slice(0, 180);
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-lg rounded-xl border border-[var(--cream-2)] bg-white p-8 shadow-sm">
          <Pill variant="cyan">Progress saved</Pill>
          <h1 className="mt-4 font-serif text-2xl font-bold">Welcome back, {meta.candidateName}</h1>
          <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
            You already started <strong>{meta.title}</strong>. Your code and remaining time were
            autosaved.
          </p>
          <div className="mt-4 rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-[12px] text-[var(--ink-soft)]">
            <p>
              Time left: <strong>{mmss}</strong>
            </p>
            {preview ? (
              <pre className="mt-2 max-h-24 overflow-hidden font-mono text-[11px] text-[var(--ink)]">
                {preview}
                {code.trim().length > 180 ? "…" : ""}
              </pre>
            ) : null}
          </div>
          {error && <p className="mt-3 text-[13px] text-[var(--orange)]">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" className="w-full" disabled={busy} onClick={() => begin("resume")}>
              {busy ? "Opening…" : "Resume where I left off"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Start new clears your saved code and resets the timer. Continue?",
                  )
                ) {
                  void begin("restart");
                }
              }}
            >
              Start new (reset code & timer)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro" && meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-lg rounded-xl border border-[var(--cream-2)] bg-white p-8 shadow-sm">
          <Pill variant="cyan">Secure link · no login</Pill>
          <h1 className="mt-4 font-serif text-2xl font-bold">Hi {meta.candidateName}</h1>
          <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
            Coding exercise for <strong>{meta.roleName || "this role"}</strong>
            {meta.projectName ? (
              <>
                {" "}
                on <strong>{meta.projectName}</strong>
              </>
            ) : null}
            .
          </p>
          <ul className="mt-5 space-y-2 text-[13px] text-[var(--ink-soft)]">
            <li>· {meta.language} · about {meta.timeLimitMin} minutes</li>
            <li>· Progress autosaves — refresh safely, then Resume</li>
            <li>· Work in this browser editor so your interviewer can follow live</li>
            <li>· No camera — only editor activity is logged</li>
          </ul>
          {error && <p className="mt-3 text-[13px] text-[var(--orange)]">{error}</p>}
          <Button
            type="button"
            className="mt-6 w-full"
            disabled={busy}
            onClick={() => begin("start")}
          >
            {busy ? "Starting…" : "Start exercise"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--cyan-d)]">
              {meta?.title}
            </p>
            <h1 className="font-serif text-xl font-bold">{meta?.roleName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Pill variant="neutral">{meta?.language}</Pill>
            <Pill
              variant={
                saveState === "saving" ? "orange" : saveState === "saved" ? "green" : "neutral"
              }
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Autosave"}
            </Pill>
            <Pill variant={secondsLeft < 60 ? "orange" : "cyan"}>⏱ {mmss}</Pill>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
            <h2 className="font-serif text-sm font-bold">Scenario</h2>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {meta?.scenario}
            </p>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              Short notes (optional)
            </label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[13px] outline-none focus:border-[var(--cyan)]"
              rows={4}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Trade-offs, assumptions…"
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--cream-2)] bg-[var(--navy)] px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">
                Editor · live sync on
              </span>
              <span className="text-[11px] text-white/50">Autosave every few seconds</span>
            </div>
            <textarea
              className="min-h-[360px] w-full resize-y bg-[#0f1720] p-4 font-mono text-[12.5px] leading-relaxed text-[#e2e8f0] outline-none"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cream-2)] px-4 py-3">
              <p className={cn("text-[12px] text-[var(--ink-faint)]")}>
                Refresh is safe — use Resume when you return.
              </p>
              <Button type="button" className="!px-5 !py-2.5 text-[13px]" disabled={busy} onClick={submit}>
                {busy ? "Submitting…" : "Submit solution"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
