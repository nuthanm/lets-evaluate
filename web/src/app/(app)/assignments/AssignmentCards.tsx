"use client";

import { useState } from "react";
import Link from "next/link";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { CaseCard } from "@/components/CabinetPage";

function urgencyFor(dueAt: string | null, now: number): "overdue" | "soon" | "none" {
  if (!dueAt) return "none";
  const due = new Date(dueAt).getTime();
  if (due < now) return "overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "soon";
  return "none";
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
  // Passed down from the server component so the client render stays pure
  // (no Date.now() call during render).
  now: number;
}) {
  // Track which assignment IDs have been clicked (overdue badge hides on click)
  const [clicked, setClicked] = useState<Set<string>>(new Set());
  const [opening, setOpening] = useState<string | null>(null);

  function handleOpen(stageId: string) {
    setClicked((prev) => new Set(prev).add(stageId));
    setOpening(stageId);
  }

  return (
    <ul className="space-y-3">
      {rows.length === 0 ? (
        <li>
          <div className="case-card flex items-center gap-4 p-6">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-xl">
              ✓
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">Your queue is clear</p>
              <p className="mt-0.5 text-sm text-[var(--ink-faint)]">
                Interview assignments will appear here when a recruiter books you.
              </p>
            </div>
          </div>
        </li>
      ) : (
        rows.map(({ stage, candidate, roleName, projectName }) => {
          const urgency = urgencyFor(stage.dueAt, now);
          const wasClicked = clicked.has(stage.id);
          const isOpening = opening === stage.id;

          return (
            <li key={stage.id}>
              <Link
                href={`/evaluate/${candidate.id}`}
                className="block no-underline"
                onClick={() => handleOpen(stage.id)}
              >
                <CaseCard
                  hover
                  className={`overflow-hidden transition-all ${
                    urgency === "overdue" && !wasClicked
                      ? "border-[var(--orange)]/30 hover:border-[var(--orange)]"
                      : "hover:border-[var(--cyan)]/40 hover:shadow-sm"
                  }`}
                >
                  {urgency === "overdue" && !wasClicked && (
                    <div className="h-1 w-full bg-[var(--orange)]" />
                  )}
                  {urgency === "soon" && (
                    <div className="h-1 w-full bg-[var(--cyan)]" />
                  )}
                  <div className="flex items-center gap-4 p-4">
                    <FaceAvatar name={candidate.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[var(--ink)]">{candidate.name}</strong>
                        {roleName && (
                          <span className="text-xs text-[var(--ink-faint)]">
                            - {roleName}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--cyan-d)]">
                          {stage.label}
                        </span>
                        {projectName && (
                          <span className="text-[11px] text-[var(--ink-faint)]">
                            - {projectName}
                          </span>
                        )}
                      </div>
                      {stage.dueAt && (
                        <p
                          className={`mt-0.5 text-[11px] font-semibold ${
                            urgency === "overdue" && !wasClicked
                              ? "text-[var(--orange)]"
                              : urgency === "soon"
                                ? "text-[var(--cyan-d)]"
                                : "text-[var(--ink-faint)]"
                          }`}
                        >
                          Due:{" "}
                          {new Date(stage.dueAt).toLocaleString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {stage.handoffNote && (
                        <p className="mt-1 truncate rounded bg-[var(--cream)] px-2 py-0.5 text-[11px] italic text-[var(--ink-soft)]">
                          {stage.handoffNote}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {/* Overdue badge — hidden once clicked */}
                      {!wasClicked && urgency === "overdue" && (
                        <Pill variant="orange">
                          ⚠ Overdue
                          {(() => {
                            const days = Math.floor(
                              (now - new Date(stage.dueAt!).getTime()) /
                                86400000,
                            );
                            return days > 0 ? ` · ${days}d ago` : "";
                          })()}
                        </Pill>
                      )}
                      {!wasClicked && urgency === "soon" && (
                        <Pill variant="cyan">
                          Due in{" "}
                          {Math.max(
                            1,
                            Math.round(
                              (new Date(stage.dueAt!).getTime() - now) /
                                3600000,
                            ),
                          )}
                          h
                        </Pill>
                      )}
                      {!wasClicked && urgency === "none" && (
                        <Pill variant="neutral">Pending</Pill>
                      )}
                      {/* Open button with clear visual feedback */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all duration-150 ${
                          isOpening
                            ? "border-[var(--cyan)] bg-[var(--cyan)] text-white shadow-[var(--cyan)]/20"
                            : wasClicked
                              ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)]"
                              : "border-[var(--cyan)] bg-white text-[var(--cyan-d)] hover:bg-[var(--cyan)] hover:text-white active:scale-95"
                        }`}
                      >
                        {isOpening ? (
                          <>
                            <svg
                              className="animate-spin size-3"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <circle
                                cx="8"
                                cy="8"
                                r="6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeOpacity=".3"
                              />
                              <path
                                d="M8 2a6 6 0 0 1 6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            Opening…
                          </>
                        ) : wasClicked ? (
                          <>
                            <svg className="size-3" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Opened
                          </>
                        ) : (
                          <>
                            Open
                            <svg className="size-3" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </CaseCard>
              </Link>
            </li>
          );
        })
      )}
    </ul>
  );
}
