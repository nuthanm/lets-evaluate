"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
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

    let copied = copyHtmlLegacy(html);
    if (!copied) {
      if (
        typeof ClipboardItem !== "undefined" &&
        typeof navigator.clipboard.write === "function"
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        copied = true;
      } else {
        await navigator.clipboard.writeText(plain);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyAll() {
    const text = `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="case-card case-fade-in p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">{title}</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            Copy or open in your mail client — placeholders are already replaced.
            No external email service is used.
          </p>
          <p className="mt-1 text-[12px] text-[var(--ink-faint)]">
            Outlook and Gmail links open a plain-text draft. Use Download .eml draft to preserve layout, images, and links.
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
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-[var(--cream-2)] bg-white p-3">
          <div dangerouslySetInnerHTML={{ __html: mail.bodyHtml }} />
        </div>
        {mail.attachments.length > 0 && (
          <div className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-3 text-[13px] text-[var(--ink-soft)]">
            <div className="font-bold text-[var(--ink-faint)]">Attachments / links</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {mail.attachments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={copyFormatted}>
          {copied ? "Copied" : "Copy formatted"}
        </Button>
        <Button type="button" onClick={copyAll}>
          Copy plain text
        </Button>
        <Button type="button" onClick={downloadEml}>
          Download .eml draft
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
