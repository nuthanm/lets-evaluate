"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldTextarea } from "@/components/FormField";
import { MAIL_PLACEHOLDERS } from "@/lib/email/defaults";

type Template = {
  slug: string;
  name: string;
  audience: string;
  description: string;
  header: string;
  subject: string;
  body: string;
  footer: string;
  tagline: string;
  attachments: string[];
};

function renderPreviewHtml(template: {
  header: string;
  body: string;
  footer: string;
  tagline: string;
  attachments: string[];
}) {
  const textBlock = (value: string, size: number, color: string, extra = "") =>
    value
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(
        (block) =>
          `<p style="margin:0 0 14px;font-size:${size}px;line-height:1.7;color:${color};white-space:pre-wrap;${extra}">${block
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;")
            .replaceAll("\n", "<br />")}</p>`,
      )
      .join("");

  const attachments = template.attachments
    .map((item) => item.trim())
    .filter(Boolean)
    .map(
      (item) =>
        `<li style="margin:0 0 8px;">${item
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}</li>`,
    )
    .join("");

  return [
    '<div style="background:#f4efe4;padding:20px;font-family:Segoe UI,Arial,sans-serif;">',
    '<div style="margin:0 auto;max-width:680px;overflow:hidden;border:1px solid #e5d9bf;border-radius:22px;background:#ffffff;box-shadow:0 18px 40px rgba(34,49,58,0.08);">',
    template.header
      ? `<div style="background:linear-gradient(135deg,#12343b,#1f5a63);padding:24px 28px;color:#ffffff;"><div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.72;margin:0 0 8px;">Header</div><div style="font-size:24px;font-weight:700;line-height:1.35;white-space:pre-wrap;">${template.header
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\n", "<br />")}</div></div>`
      : "",
    `<div style="padding:28px 28px 12px;">${textBlock(template.body, 14, "#22313a")}</div>`,
    template.tagline
      ? `<div style="padding:0 28px 20px;color:#45626a;font-size:13px;font-style:italic;line-height:1.6;">${template.tagline
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\n", "<br />")}</div>`
      : "",
    attachments
      ? `<div style="padding:0 28px 18px;"><div style="margin:0 0 10px;color:#52636b;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Attachments / links</div><ul style="margin:0;padding-left:18px;color:#22313a;font-size:14px;line-height:1.6;">${attachments}</ul></div>`
      : "",
    template.footer
      ? `<div style="border-top:1px solid #efe5cf;background:#fbf8f1;padding:22px 28px;">${textBlock(template.footer, 14, "#22313a")}</div>`
      : "",
    "</div>",
    "</div>",
  ].join("");
}

export function MailTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [active, setActive] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [header, setHeader] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [tagline, setTagline] = useState("");
  const [attachmentsText, setAttachmentsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mail-templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        if (d.templates?.[0]) {
          select(d.templates[0] as Template);
        }
      })
      .catch(() => {});
  }, []);

  function select(t: Template) {
    setActive(t.slug);
    setName(t.name);
    setDescription(t.description);
    setHeader(t.header ?? "");
    setSubject(t.subject);
    setBody(t.body);
    setFooter(t.footer ?? "");
    setTagline(t.tagline ?? "");
    setAttachmentsText((t.attachments ?? []).join("\n"));
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: active,
        name,
        description,
        header,
        subject,
        body,
        footer,
        tagline,
        attachments: attachmentsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setTemplates((currentTemplates) =>
        currentTemplates.map((template) =>
          template.slug === active
            ? {
                ...template,
                name,
                description,
                header,
                subject,
                body,
                footer,
                tagline,
                attachments: attachmentsText
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
            : template,
        ),
      );
    }
    setMsg(res.ok ? "Saved" : "Could not save");
  }

  const current = templates.find((t) => t.slug === active);
  const previewHtml = renderPreviewHtml({
    header,
    body,
    footer,
    tagline,
    attachments: attachmentsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,420px)]">
      <aside className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => select(t)}
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-[13px] ${
              active === t.slug
                ? "border-[var(--cyan)] bg-[var(--cyan-soft)]"
                : "border-[var(--cream-2)] bg-white"
            }`}
          >
            <div className="font-bold">{t.name}</div>
            <div className="text-[11px] capitalize text-[var(--ink-faint)]">
              {t.audience}
            </div>
          </button>
        ))}
      </aside>

      <CaseCard className="p-5">
        {current && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Template name</FieldLabel>
                <FieldInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <FieldLabel>Audience</FieldLabel>
                <div className="mt-1 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] px-3 py-2 text-[13px] capitalize text-[var(--ink-soft)]">
                  {current.audience}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <FieldLabel>Description</FieldLabel>
              <FieldTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Header</FieldLabel>
              <FieldTextarea
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Subject</FieldLabel>
              <FieldInput
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Body</FieldLabel>
              <FieldTextarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="mt-1 font-mono text-[13px]"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Tagline</FieldLabel>
              <FieldTextarea
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Footer</FieldLabel>
              <FieldTextarea
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Attachments / links</FieldLabel>
              <FieldTextarea
                value={attachmentsText}
                onChange={(e) => setAttachmentsText(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                One line per attachment, link, checklist item, or legal note.
              </p>
            </div>
            <div className="mt-4 rounded-xl bg-[var(--cream)] p-3 text-[11px] text-[var(--ink-soft)]">
              <strong>Placeholders:</strong> {MAIL_PLACEHOLDERS.join(", ")}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={save} disabled={saving || !active}>
                {saving ? "Saving…" : "Save template"}
              </Button>
              {msg && (
                <span className="text-[13px] text-[var(--ink-soft)]">{msg}</span>
              )}
            </div>
          </>
        )}
      </CaseCard>

      <CaseCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Live preview</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
              This shows the structured layout that users can copy into Outlook or Gmail.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-[24px] border border-[var(--cream-2)] bg-white p-2">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </CaseCard>
    </div>
  );
}
