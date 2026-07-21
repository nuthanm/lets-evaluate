"use client";

import { useEffect, useState } from "react";
import { formatAuditAction } from "@/lib/audit/format-action";
import { cn } from "@/lib/utils";

type TimelineEntry = {
  id: string;
  at: string;
  actorName: string | null;
  action: string;
  label: string;
  payload: Record<string, unknown>;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CandidateTimeline({ candidateId }: { candidateId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/candidates/${candidateId}/timeline`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load timeline");
        if (!cancelled) setEntries(data.entries ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load timeline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="case-card p-6 text-sm text-[var(--ink-faint)]">
        Loading timeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="case-card border-[var(--orange)] p-4 text-sm text-[var(--orange)]">
        {error}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="case-card p-6 text-sm text-[var(--ink-faint)]">
        No activity recorded yet for this candidate.
      </div>
    );
  }

  return (
    <section className="case-card overflow-hidden p-0">
      <div className="border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3">
        <h2 className="font-serif text-lg font-bold">Activity timeline</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
          Chronological audit of screening, assignments, decisions, and mail.
        </p>
      </div>
      <ul className="divide-y divide-[var(--cream-2)]">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative flex gap-3 px-4 py-3">
            <div className="flex flex-col items-center pt-1">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  index === 0 ? "bg-[var(--cyan)]" : "bg-[var(--cream-2)]",
                )}
              />
              {index < entries.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-[var(--cream-2)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <strong className="text-[13px] text-[var(--ink)]">
                  {entry.actorName ?? "System"}
                </strong>
                <time className="text-[11px] text-[var(--ink-faint)]">
                  {formatWhen(entry.at)}
                </time>
              </div>
              <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
                {entry.label ||
                  formatAuditAction(entry.action, entry.payload)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
