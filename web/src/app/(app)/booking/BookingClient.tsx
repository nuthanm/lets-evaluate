"use client";

import Link from "next/link";
import { CaseCard } from "@/components/CabinetPage";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { ButtonLink } from "@/components/Button";

type Candidate = {
  id: string;
  name: string;
  email: string;
  status: string;
  roleName: string | null;
  roleClosed: boolean;
  techMatchScore: number | null;
  recommendation: string | null;
  summary: string | null;
};

type Interviewer = { id: string; name: string; email: string };

type Upcoming = {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewer: string;
  status: string;
  dueAt: string | null;
  handoffNote: string;
};

export function BookingClient({
  candidates,
  upcoming,
}: {
  candidates: Candidate[];
  interviewers: Interviewer[];
  upcoming: Upcoming[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Ready to schedule ({candidates.length})
        </h2>
        {candidates.length === 0 ? (
          <CaseCard className="p-6 text-sm text-[var(--ink-faint)]">
            No candidates are ready for booking yet. Candidates appear here once TA
            screening marks them as{" "}
            <span className="font-semibold">ready for interview</span>, or when
            rescheduling an assigned round.
          </CaseCard>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => (
              <li key={c.id}>
                <CaseCard className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <FaceAvatar name={c.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[var(--ink)]">
                        {c.name}
                      </strong>
                      <span className="block truncate text-xs text-[var(--ink-faint)]">
                        {c.email || "No email on file"}
                      </span>
                    </div>
                    {c.techMatchScore !== null && (
                      <Pill
                        variant={
                          c.techMatchScore >= 70
                            ? "green"
                            : c.techMatchScore >= 40
                              ? "orange"
                              : "neutral"
                        }
                      >
                        {c.techMatchScore}% match
                      </Pill>
                    )}
                    {c.roleClosed && <Pill variant="orange">Opening closed</Pill>}
                    {c.status === "assigned" && (
                      <Pill variant="neutral">Reschedule</Pill>
                    )}
                  </div>

                  {c.summary && (
                    <p className="mt-3 line-clamp-2 text-[13px] text-[var(--ink-soft)]">
                      {c.summary}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/evaluate/${c.id}`}
                      className="rounded-lg border border-[var(--cream-2)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--ink)] no-underline transition-colors hover:border-[var(--cyan)]"
                    >
                      View evaluation report
                    </Link>
                    <ButtonLink
                      href={`/booking/${c.id}`}
                      className="px-4 py-2 text-[12px]"
                    >
                      {c.status === "assigned"
                        ? "Reschedule slot →"
                        : "Assign interviewer & book →"}
                    </ButtonLink>
                  </div>
                </CaseCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          Upcoming interviews ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <CaseCard className="p-6 text-sm text-[var(--ink-faint)]">
            No booked interviews yet.
          </CaseCard>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((u) => (
              <li key={u.id}>
                <Link href={`/booking/${u.candidateId}`} className="block no-underline">
                  <CaseCard className="p-4 transition-colors hover:border-[var(--cyan)]">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[var(--ink)]">
                        {u.candidateName}
                      </strong>
                      <Pill variant="cyan" className="capitalize">
                        {u.status.replace(/_/g, " ")}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-faint)]">
                      with {u.interviewer}
                    </p>
                    {u.dueAt && (
                      <p className="mt-1 text-xs font-semibold text-[var(--cyan-d)]">
                        {new Date(u.dueAt).toLocaleString()}
                      </p>
                    )}
                    {u.handoffNote && (
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--ink-soft)]">
                        {u.handoffNote}
                      </p>
                    )}
                  </CaseCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
