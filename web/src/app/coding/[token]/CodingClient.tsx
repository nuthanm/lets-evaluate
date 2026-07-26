"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/utils";

type Phase = "loading" | "intro" | "writing" | "submitted" | "expired" | "error";

export function CodingClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    candidateName: string;
    roleName: string;
    projectName: string;
    title: string;
    language: string;
    timeLimitMin: number;
    scenario: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCode = useRef("");

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
    });
    setCode(data.candidateCode ?? data.starterCode ?? "");
    setNotes(data.candidateNotes ?? "");
    lastCode.current = data.candidateCode ?? data.starterCode ?? "";
    setSecondsLeft((data.timeLimitMin ?? 40) * 60);
    if (data.status === "submitted") setPhase("submitted");
    else if (data.status === "in_progress") setPhase("writing");
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

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/coding/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    return data;
  }

  function queueSync(nextCode: string, nextNotes: string, event: string) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void post({
        action: "sync",
        code: nextCode,
        notes: nextNotes,
        event,
      }).catch(() => undefined);
    }, 450);
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await post({ action: "start" });
      setPhase("writing");
      if (meta) setSecondsLeft(meta.timeLimitMin * 60);
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
      await post({ action: "submit", code, notes });
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
            <li>· Work in this browser editor so your interviewer can follow live</li>
            <li>· No camera — only editor activity is logged</li>
            <li>· Submit once when finished</li>
          </ul>
          {error && <p className="mt-3 text-[13px] text-[var(--orange)]">{error}</p>}
          <Button type="button" className="mt-6 w-full" disabled={busy} onClick={start}>
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
              <span className="text-[11px] text-white/50">Synced to interviewer</span>
            </div>
            <textarea
              className="min-h-[360px] w-full resize-y bg-[#0f1720] p-4 font-mono text-[12.5px] leading-relaxed text-[#e2e8f0] outline-none"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onFocus={() => void post({ action: "sync", code, notes, event: "focused" }).catch(() => undefined)}
              onBlur={() => void post({ action: "sync", code, notes, event: "blurred" }).catch(() => undefined)}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cream-2)] px-4 py-3">
              <p className={cn("text-[12px] text-[var(--ink-faint)]")}>
                Typing here updates the interviewer in near real time.
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
