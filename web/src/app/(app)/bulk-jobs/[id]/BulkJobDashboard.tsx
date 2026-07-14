"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { EmailComposer } from "@/components/EmailComposer";
import { cn } from "@/lib/utils";
import type { RenderedMail } from "@/lib/email";

type JobItem = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  currentStep: string;
  status: string;
  error: string;
  candidateId: string | null;
};

type Job = {
  id: string;
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
};

const STEP_COLORS: Record<string, string> = {
  gray: "bg-gray-200 text-gray-800",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
};

function itemColor(step: string, status: string): string {
  if (status === "failed" || status === "disqualified") return STEP_COLORS.red;
  if (status === "retry_pending") return STEP_COLORS.purple;
  if (status === "completed" || step === "completed") return STEP_COLORS.green;
  if (["analyzing", "generating_questions", "evaluating", "applying_verdict"].includes(step))
    return STEP_COLORS.blue;
  if (["preparing_email", "awaiting_email", "awaiting_interview"].includes(step))
    return STEP_COLORS.amber;
  return STEP_COLORS.gray;
}

export function BulkJobDashboard({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [mail, setMail] = useState<RenderedMail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/bulk-jobs/${jobId}`);
    if (!res.ok) return;
    const data = await res.json();
    setJob(data.job);
    setItems(data.items);
    setEmailConfigured(data.emailConfigured);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    refresh();
    let poll: ReturnType<typeof setInterval> | null = null;
    const es = new EventSource(`/api/bulk-jobs/${jobId}/stream`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "progress") {
          setJob(data.job);
          setItems(data.items);
          setLoading(false);
        }
        if (data.type === "done") es.close();
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      if (!poll) poll = setInterval(refresh, 3000);
    };
    return () => {
      es.close();
      if (poll) clearInterval(poll);
    };
  }, [jobId, refresh]);

  async function retryFailed() {
    await fetch(`/api/bulk-jobs/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry_failed" }),
    });
    refresh();
  }

  async function markEmailSent(itemId: string) {
    await fetch(`/api/bulk-jobs/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_email_sent", itemId }),
    });
    refresh();
  }

  async function prepareEmail(item: JobItem) {
    if (!item.candidateId) return;
    const res = await fetch("/api/mail/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "ai_screening_invite",
        candidateId: item.candidateId,
      }),
    });
    const data = await res.json();
    if (data.mail) setMail(data.mail);
  }

  if (loading && !job) {
    return <p className="text-[13px] text-[var(--ink-soft)]">Loading job…</p>;
  }

  return (
    <div className="space-y-6">
      {!emailConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Email provider not configured — prepare and send screening invites manually
          using Outlook or copy.
        </div>
      )}

      {job && (
        <CaseCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold">Bulk job progress</h2>
              <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
                {job.completedCount} / {job.totalCount} completed
                {job.failedCount > 0 && ` · ${job.failedCount} failed`}
              </p>
            </div>
            <div className="flex gap-2">
              {job.failedCount > 0 && (
                <Button type="button" variant="outline" onClick={retryFailed}>
                  Retry failed
                </Button>
              )}
              <Link href="/candidates/import">
                <Button type="button" variant="outline">
                  New import
                </Button>
              </Link>
            </div>
          </div>
        </CaseCard>
      )}

      <CaseCard className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--cream-2)] bg-[var(--cream)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Step</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--cream-2)]">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.candidateName}</div>
                  <div className="text-[12px] text-[var(--ink-faint)]">{item.candidateEmail}</div>
                  {item.error && (
                    <div className="mt-1 text-[11px] text-red-600">{item.error}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      itemColor(item.currentStep, item.status),
                    )}
                  >
                    {item.currentStep.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize">{item.status.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {item.currentStep === "awaiting_email" && (
                      <>
                        <Button type="button" variant="outline" onClick={() => prepareEmail(item)}>
                          Prepare email
                        </Button>
                        <Button type="button" onClick={() => markEmailSent(item.id)}>
                          Mark sent
                        </Button>
                      </>
                    )}
                    {item.candidateId && (
                      <Link
                        href={`/evaluate/${item.candidateId}`}
                        className="text-[12px] font-semibold text-[var(--cyan-d)] hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CaseCard>

      {mail && <EmailComposer mails={[mail]} title="Screening invite" onClose={() => setMail(null)} />}
    </div>
  );
}
