"use client";

import { useState } from "react";
import Link from "next/link";
import { FaceAvatar } from "@/components/FaceAvatar";
import { cn } from "@/lib/utils";

function urgencyFor(dueAt: string | null, now: number): "overdue" | "soon" | "none" {
  if (!dueAt) return "none";
  const due = new Date(dueAt).getTime();
  if (due < now) return "overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "soon";
  return "none";
}

function formatDueLabel(dueAt: string, now: number, urgency: "overdue" | "soon" | "none") {
  const due = new Date(dueAt);
  const formatted = due.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (urgency === "overdue") {
    const days = Math.floor((now - due.getTime()) / 86400000);
    return days > 0 ? `${formatted} · ${days}d overdue` : `${formatted} · overdue`;
  }
  if (urgency === "soon") {
    const hrs = Math.max(1, Math.round((due.getTime() - now) / 3600000));
    return `${formatted} · in ${hrs}h`;
  }
  return formatted;
}

export type AssignmentRow = {
  stage: {
    id: string;
    label: string;
    status: string;
    dueAt: string | null;
    handoffNote: string | null;
  };
  candidate: {
    id: string;
    name: string;
  };
  roleName: string | null;
  projectName: string | null;
};

export function AssignmentCards({
  rows,
  now,
}: {
  rows: AssignmentRow[];
  now: number;
}) {
  const [opening, setOpening] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="case-card flex items-center gap-4 p-6">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-xl text-[var(--green)]">
          ✓
        </div>
        <div>
          <p className="font-serif text-lg font-bold text-[var(--ink)]">All caught up</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            New interview assignments will show up here when a recruiter schedules you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map(({ stage, candidate, roleName, projectName }, index) => {
        const urgency = urgencyFor(stage.dueAt, now);
        const isOpening = opening === stage.id;
        const context = [roleName, projectName].filter(Boolean).join(" · ");
        const featured = index === 0 && rows.length === 1;

        return (
          <li key={stage.id}>
            <Link
              href={`/evaluate/${candidate.id}`}
              className="block no-underline"
              onClick={() => setOpening(stage.id)}
            >
              <article
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-white transition-all",
                  featured
                    ? "border-[var(--cyan)]/35 shadow-sm hover:shadow-md"
                    : "border-[var(--cream-2)] hover:border-[var(--cyan)]/40 hover:shadow-sm",
                  urgency === "overdue" && "border-[var(--orange)]/35",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    urgency === "overdue"
                      ? "bg-[var(--orange)]"
                      : urgency === "soon"
                        ? "bg-[var(--cyan)]"
                        : "bg-[var(--cream-2)] group-hover:bg-[var(--cyan)]",
                  )}
                  aria-hidden
                />

                <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <FaceAvatar name={candidate.name} size={featured ? "lg" : "md"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={cn(
                            "font-serif font-bold text-[var(--ink)]",
                            featured ? "text-xl" : "text-lg",
                          )}
                        >
                          {candidate.name}
                        </h3>
                        {urgency === "overdue" && (
                          <span className="rounded-full bg-[var(--orange-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--orange)]">
                            Overdue
                          </span>
                        )}
                        {urgency === "soon" && (
                          <span className="rounded-full bg-[var(--cyan-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--cyan-d)]">
                            Due soon
                          </span>
                        )}
                      </div>

                      {context && (
                        <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{context}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[var(--navy)] px-2.5 py-1 text-[11px] font-bold text-white">
                          {stage.label}
                        </span>
                        {stage.dueAt && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[12px] font-semibold",
                              urgency === "overdue"
                                ? "text-[var(--orange)]"
                                : urgency === "soon"
                                  ? "text-[var(--cyan-d)]"
                                  : "text-[var(--ink-faint)]",
                            )}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M6 3.5V6l1.8 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                            {formatDueLabel(stage.dueAt, now, urgency)}
                          </span>
                        )}
                      </div>

                      {stage.handoffNote && (
                        <div className="mt-3 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                            Note from recruiter
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                            {stage.handoffNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 sm:pt-1">
                    <span
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all sm:w-auto",
                        isOpening
                          ? "bg-[var(--cyan)] text-white"
                          : featured
                            ? "bg-[var(--cyan)] text-white group-hover:bg-[var(--navy)]"
                            : "border border-[var(--cyan)] bg-white text-[var(--cyan-d)] group-hover:bg-[var(--cyan)] group-hover:text-white",
                      )}
                    >
                      {isOpening ? (
                        <>
                          <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity=".3" />
                            <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Opening…
                        </>
                      ) : (
                        <>
                          Start interview
                          <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
