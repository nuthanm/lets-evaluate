"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import type { RenderedMail } from "@/lib/email";

export function EmailComposer({
  mails,
  title = "Prepared email",
  onClose,
}: {
  mails: RenderedMail[];
  title?: string;
  onClose?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!mails.length) return null;
  const mail = mails[active] ?? mails[0];

  const to = mail.to?.trim() ?? "";
  const enc = (s: string) => encodeURIComponent(s ?? "");
  // Web compose deep-links so users without a configured desktop mail client
  // (the common case where mailto: silently does nothing) can still open a
  // ready-to-send draft in Outlook on the web or Gmail.
  const outlookUrl = to
    ? `https://outlook.office.com/mail/deeplink/compose?to=${enc(to)}&subject=${enc(
        mail.subject,
      )}&body=${enc(mail.body)}`
    : "";
  const gmailUrl = to
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(
        mail.subject,
      )}&body=${enc(mail.body)}`
    : "";

  async function copyAll() {
    const text = `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="case-card case-fade-in p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">{title}</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            Copy or open in your mail client — placeholders are already replaced.
            No external email service is used.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold text-[var(--ink-faint)] hover:text-[var(--ink)]"
          >
            Dismiss
          </button>
        )}
      </div>

      {mails.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {mails.map((m, i) => (
            <button
              key={m.slug}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                i === active
                  ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                  : "border-[var(--cream-2)] text-[var(--ink-soft)]"
              }`}
            >
              {m.slug.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-[13px]">
          <span className="font-bold text-[var(--ink-faint)]">To: </span>
          {mail.to || (
            <span className="text-[var(--orange)]">No recipient email on file</span>
          )}
        </div>
        <div className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-[13px]">
          <span className="font-bold text-[var(--ink-faint)]">Subject: </span>
          {mail.subject}
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--cream-2)] bg-white p-4 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          {mail.body}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={copyAll}>
          {copied ? "Copied" : "Copy to clipboard"}
        </Button>
        {outlookUrl && (
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl border border-[var(--cream-2)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] no-underline transition-colors hover:border-[var(--cyan)]"
          >
            Open in Outlook (web) →
          </a>
        )}
        {gmailUrl && (
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl border border-[var(--cream-2)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] no-underline transition-colors hover:border-[var(--cyan)]"
          >
            Open in Gmail →
          </a>
        )}
        {mail.mailto && (
          <a
            href={mail.mailto}
            className="inline-flex items-center rounded-xl border border-[var(--cream-2)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] no-underline transition-colors hover:border-[var(--cyan)]"
          >
            Open in desktop app →
          </a>
        )}
      </div>
      {!to && (
        <p className="mt-2 text-xs text-[var(--orange)]">
          No recipient email on file — copy the text and send it manually.
        </p>
      )}
    </div>
  );
}
