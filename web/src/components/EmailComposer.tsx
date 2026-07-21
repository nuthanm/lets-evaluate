"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RenderedMail } from "@/lib/email";

function toCrlf(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function safeFilename(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return cleaned || "email-draft";
}

function buildEmlDraft(mail: RenderedMail) {
  const boundary = `----=_LetsEvaluate_${Date.now().toString(36)}`;
  const to = sanitizeHeader(mail.to || "");
  const subject = sanitizeHeader(mail.subject || "");
  const plain = toCrlf(mail.body || "");
  const html = `<meta charset="utf-8" />${mail.bodyHtml || ""}`;

  const lines = [
    to ? `To: ${to}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    toCrlf(html),
    `--${boundary}--`,
    "",
  ].filter((line) => line !== "");

  return toCrlf(lines.join("\n"));
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <rect x="5" y="5" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5 4.5V3.8A1.8 1.8 0 0 0 3.2 2H2.8A1.2 1.2 0 0 0 1.6 3.2v6.6A1.2 1.2 0 0 0 2.8 11h1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path
        d="M3 7l3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path
        d="M7 2v7M4.5 6.5 7 9l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 11h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ToolbarButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-[var(--green-soft)] text-[var(--green)]"
          : "text-[var(--ink-faint)] hover:bg-[var(--cream)] hover:text-[var(--ink)]",
      )}
    >
      {children}
    </button>
  );
}

function OpenMailLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-2)] bg-white px-3.5 py-2 text-[12px] font-semibold text-[var(--ink)] no-underline transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan-d)]"
    >
      {label}
      <span aria-hidden className="text-[var(--ink-faint)]">
        ↗
      </span>
    </a>
  );
}

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
  const [copied, setCopied] = useState<"formatted" | "plain" | null>(null);

  if (!mails.length) return null;
  const mail = mails[active] ?? mails[0];

  const to = mail.to?.trim() ?? "";
  const enc = (s: string) => encodeURIComponent(s ?? "");
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

  function flashCopied(mode: "formatted" | "plain") {
    setCopied(mode);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyHtmlLegacy(html: string) {
    if (typeof document === "undefined") return false;
    const container = document.createElement("div");
    container.setAttribute("contenteditable", "true");
    container.style.position = "fixed";
    container.style.pointerEvents = "none";
    container.style.opacity = "0";
    container.style.left = "-9999px";
    container.innerHTML = html;
    document.body.appendChild(container);

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const ok = document.execCommand("copy");
    selection?.removeAllRanges();
    document.body.removeChild(container);
    return ok;
  }

  async function copyFormatted() {
    const html = `<meta charset="utf-8" />${mail.bodyHtml}`;
    const plain = mail.body;

    let copiedOk = copyHtmlLegacy(html);
    if (!copiedOk) {
      if (
        typeof ClipboardItem !== "undefined" &&
        typeof navigator.clipboard.write === "function"
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        copiedOk = true;
      } else {
        await navigator.clipboard.writeText(plain);
      }
    }

    flashCopied("formatted");
  }

  async function copyPlain() {
    const text = `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.body}`;
    await navigator.clipboard.writeText(text);
    flashCopied("plain");
  }

  function downloadEml() {
    const eml = buildEmlDraft(mail);
    const blob = new Blob([eml], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(mail.subject)}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="case-card case-fade-in overflow-hidden p-0">
      <div className="border-b border-[var(--cream-2)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">{title}</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
              Review the draft, copy manually if needed, or open in your mail client.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--ink)]"
            >
              Dismiss
            </button>
          )}
        </div>

        {mails.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mails.map((m, i) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-bold capitalize transition-colors",
                  i === active
                    ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                    : "border-[var(--cream-2)] text-[var(--ink-soft)] hover:border-[var(--cyan)]/40",
                )}
              >
                {m.slug.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-px border-b border-[var(--cream-2)] bg-[var(--cream-2)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="bg-[var(--cream)] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            To
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[var(--ink)]">
            {mail.to || (
              <span className="font-medium text-[var(--orange)]">No recipient on file</span>
            )}
          </div>
        </div>
        <div className="bg-[var(--cream)] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Subject
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[var(--ink)]">{mail.subject}</div>
        </div>
      </div>

      <div className="relative bg-white">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--cream-2)] bg-white/95 p-0.5 shadow-sm backdrop-blur-sm">
          <ToolbarButton
            title={copied === "formatted" ? "Copied formatted email" : "Copy formatted email"}
            onClick={() => void copyFormatted()}
            active={copied === "formatted"}
          >
            {copied === "formatted" ? <CheckIcon /> : <CopyIcon />}
          </ToolbarButton>
          <ToolbarButton
            title={copied === "plain" ? "Copied plain text" : "Copy plain text"}
            onClick={() => void copyPlain()}
            active={copied === "plain"}
          >
            {copied === "plain" ? (
              <CheckIcon />
            ) : (
              <span className="text-[10px] font-bold tracking-tight">Aa</span>
            )}
          </ToolbarButton>
          <div className="mx-0.5 h-5 w-px bg-[var(--cream-2)]" aria-hidden />
          <ToolbarButton title="Download .eml draft" onClick={downloadEml}>
            <DownloadIcon />
          </ToolbarButton>
        </div>

        <div className="max-h-[28rem] overflow-auto px-4 pb-4 pt-14">
          <div dangerouslySetInnerHTML={{ __html: mail.bodyHtml }} />
        </div>
      </div>

      {mail.attachments.length > 0 && (
        <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] px-5 py-3 text-[13px] text-[var(--ink-soft)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            Attachments / links
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {mail.attachments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] px-5 py-4">
        <p className="text-[11px] text-[var(--ink-faint)]">
          Web compose opens plain text. Use the download icon above to keep HTML layout and images.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {outlookUrl && <OpenMailLink href={outlookUrl} label="Open in Outlook" external />}
          {gmailUrl && <OpenMailLink href={gmailUrl} label="Open in Gmail" external />}
          {mail.mailto && <OpenMailLink href={mail.mailto} label="Desktop mail app" />}
        </div>
        {!to && (
          <p className="mt-3 text-xs text-[var(--orange)]">
            No recipient email on file — copy the draft and send it manually.
          </p>
        )}
      </div>
    </div>
  );
}
