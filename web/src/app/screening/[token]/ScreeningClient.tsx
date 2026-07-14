"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  question: string;
  category: string;
  code?: string;
};

const IDLE_MS = 60_000;

export function ScreeningClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<"loading" | "intro" | "interview" | "done" | "disqualified">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ candidateName: string; roleName: string; projectName: string } | null>(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabWarned = useRef(false);

  const reportViolation = useCallback(
    async (type: "tab_switch" | "idle") => {
      const res = await fetch(`/api/screening/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "violation", type }),
      });
      const data = await res.json();
      setStrikeCount(data.strikeCount ?? 0);
      setWarning(data.message ?? null);
      if (data.disqualified) setPhase("disqualified");
    },
    [token],
  );

  useEffect(() => {
    fetch(`/api/screening/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.disqualified || data.status === "disqualified") {
          setPhase("disqualified");
          return;
        }
        if (data.status === "submitted" || data.status === "completed") {
          setPhase("done");
          return;
        }
        setMeta({
          candidateName: data.candidateName,
          roleName: data.roleName,
          projectName: data.projectName,
        });
        setStrikeCount(data.strikeCount ?? 0);
        setPhase("intro");
      });
  }, [token]);

  useEffect(() => {
    if (phase !== "interview") return;

    function onVisibility() {
      if (document.hidden) {
        void reportViolation("tab_switch");
      }
    }

    function resetIdle() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        void reportViolation("idle");
      }, IDLE_MS);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    resetIdle();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [phase, reportViolation]);

  async function startInterview() {
    const res = await fetch(`/api/screening/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = await res.json();
    if (data.disqualified) {
      setPhase("disqualified");
      return;
    }
    setQuestions(data.questions ?? []);
    setPhase("interview");
  }

  async function saveAnswer() {
    const q = questions[current];
    if (!q) return;
    await fetch(`/api/screening/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", questionId: q.id, answer }),
    });
    setAnswer("");
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      await fetch(`/api/screening/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      setPhase("done");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-[14px] text-[var(--ink-soft)]">Loading…</p>
      </div>
    );
  }

  if (phase === "disqualified") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-red-800">Session ended</h1>
          <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
            {warning ?? "This screening session was ended due to proctoring violations."}
          </p>
          <p className="mt-4 text-[13px] text-[var(--ink-faint)]">
            Your recruiter has been notified and may grant you another attempt.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-bold">Thank you!</h1>
          <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
            Your responses have been submitted. Our team will review your screening and be in touch.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-lg rounded-xl border border-[var(--cream-2)] bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-bold">AI Screening Interview</h1>
          <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
            Hi {meta?.candidateName}, welcome to your screening for{" "}
            <strong>{meta?.roleName}</strong> on <strong>{meta?.projectName}</strong>.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[13px] text-[var(--ink-soft)]">
            <li>Answer each question thoughtfully — one question at a time.</li>
            <li>Stay on this tab. Switching away may end your session.</li>
            <li>Remain active — extended inactivity triggers warnings.</li>
            <li>Estimated time: 30–45 minutes.</li>
          </ul>
          <Button type="button" className="mt-6 w-full" onClick={startInterview}>
            Begin screening
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="min-h-screen bg-[var(--cream)] p-6">
      <div className="mx-auto max-w-2xl">
        {warning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            {warning}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between text-[12px] text-[var(--ink-faint)]">
          <span>
            Question {current + 1} of {questions.length}
          </span>
          <span>Strikes: {strikeCount} / 2</span>
        </div>

        <div className="rounded-xl border border-[var(--cream-2)] bg-white p-6 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--cyan-d)]">
            {q?.category}
          </span>
          <h2 className="mt-2 font-serif text-xl font-bold">{q?.question}</h2>
          {q?.code && (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-[12px] text-gray-100">
              {q.code}
            </pre>
          )}
          <textarea
            className="mt-4 w-full rounded-lg border border-[var(--cream-2)] p-3 text-[14px]"
            rows={6}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here…"
          />
          <Button
            type="button"
            className="mt-4"
            disabled={!answer.trim()}
            onClick={saveAnswer}
          >
            {current + 1 < questions.length ? "Next question" : "Submit interview"}
          </Button>
        </div>
      </div>
    </div>
  );
}
