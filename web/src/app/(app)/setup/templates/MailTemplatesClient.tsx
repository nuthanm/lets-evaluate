"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldTextarea } from "@/components/FormField";
import { MAIL_PLACEHOLDERS } from "@/lib/email/defaults";

type Template = {
  slug: string;
  name: string;
  audience: "candidate" | "interviewer" | "internal";
  description: string;
  header: string;
  subject: string;
  body: string;
  footer: string;
  tagline: string;
  attachments: string[];
  isDefault?: boolean;
};

type MailAssetItem = {
  key: string;
  name: string;
  url: string;
};

type MailAssetConfig = {
  logoAssetKey: string;
  headerImageAssetKey: string;
  footerImageAssetKey: string;
  applyScope: "all" | "specific";
  templateSlugs: string[];
};

function renderPreviewHtml(template: {
  header: string;
  body: string;
  footer: string;
  tagline: string;
  attachments: string[];
  logoUrl?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
}) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const textBlock = (value: string, size: number, color: string, extra = "") =>
    value
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(
        (block) =>
          `<p style="margin:0 0 14px;font-size:${size}px;line-height:1.7;color:${color};white-space:pre-wrap;${extra}">${escape(
            block,
          ).replaceAll("\n", "<br />")}</p>`,
      )
      .join("");

  const attachments = template.attachments
    .map((item) => item.trim())
    .filter(Boolean)
    .map(
      (item) =>
        `<li style="margin:0 0 8px;">${escape(item)}</li>`,
    )
    .join("");

  const bodyContent = template.body;
  const showHeaderText = Boolean(template.header && !template.headerImageUrl);
  const showHeaderPanel = Boolean(showHeaderText);
  const hideFooterText = Boolean(template.footerImageUrl);

  return [
    '<div style="background:#f4efe4;padding:20px;font-family:Segoe UI,Arial,sans-serif;">',
    '<div style="margin:0 auto;max-width:680px;overflow:hidden;border:1px solid #e5d9bf;border-radius:22px;background:#ffffff;box-shadow:0 18px 40px rgba(34,49,58,0.08);">',
    showHeaderPanel
      ? `<div style="background:linear-gradient(135deg,#12343b,#1f5a63);padding:20px 28px;color:#ffffff;">${showHeaderText ? `<div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.72;margin:0 0 8px;">Header</div><div style="font-size:24px;font-weight:700;line-height:1.35;white-space:pre-wrap;">${escape(template.header).replaceAll("\n", "<br />")}</div>` : ""}</div>`
      : "",
    template.headerImageUrl
      ? `<div style="background:#ffffff;"><img src="${escape(template.headerImageUrl)}" alt="Header image" style="display:block;width:100%;max-width:100%;height:auto;border:0;" /></div>`
      : "",
    `<div style="padding:28px 28px 12px;">${textBlock(bodyContent, 14, "#22313a")}</div>`,
    template.tagline
      ? `<div style="padding:0 28px 20px;color:#45626a;font-size:13px;font-style:italic;line-height:1.6;">${escape(
          template.tagline,
        ).replaceAll("\n", "<br />")}</div>`
      : "",
    attachments
      ? `<div style="padding:0 28px 18px;"><div style="margin:0 0 10px;color:#52636b;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Attachments / links</div><ul style="margin:0;padding-left:18px;color:#22313a;font-size:14px;line-height:1.6;">${attachments}</ul></div>`
      : "",
    template.footerImageUrl
      ? `<div style="border-top:1px solid #efe5cf;background:#fbf8f1;"><img src="${escape(template.footerImageUrl)}" alt="Footer image" style="display:block;width:100%;max-width:100%;height:auto;border:0;" /></div>`
      : "",
    template.footer && !hideFooterText
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
  const [audience, setAudience] = useState<Template["audience"]>("candidate");
  const [description, setDescription] = useState("");
  const [header, setHeader] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [tagline, setTagline] = useState("");
  const [attachmentsText, setAttachmentsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cleaningLegacy, setCleaningLegacy] = useState(false);
  const [cleaningHeader, setCleaningHeader] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [assetConfig, setAssetConfig] = useState<MailAssetConfig>({
    logoAssetKey: "",
    headerImageAssetKey: "",
    footerImageAssetKey: "",
    applyScope: "all",
    templateSlugs: [],
  });
  const [assetUrlsByKey, setAssetUrlsByKey] = useState<Record<string, string>>({});

  async function loadTemplates(preferredSlug?: string) {
    const [templatesRes, assetsRes] = await Promise.all([
      fetch("/api/mail-templates"),
      fetch("/api/mail-assets"),
    ]);

    if (assetsRes.ok) {
      const assetsPayload = (await assetsRes.json()) as {
        config?: MailAssetConfig;
        assets?: MailAssetItem[];
      };
      if (assetsPayload.config) {
        setAssetConfig({
          logoAssetKey: assetsPayload.config.logoAssetKey ?? "",
          headerImageAssetKey: assetsPayload.config.headerImageAssetKey ?? "",
          footerImageAssetKey: assetsPayload.config.footerImageAssetKey ?? "",
          applyScope:
            assetsPayload.config.applyScope === "specific" ? "specific" : "all",
          templateSlugs: assetsPayload.config.templateSlugs ?? [],
        });
      }
      const urlMap = Object.fromEntries(
        (assetsPayload.assets ?? []).map((asset) => [asset.key, asset.url]),
      );
      setAssetUrlsByKey(urlMap);
    }

    if (!templatesRes.ok) return;
    const d = await templatesRes.json();
    const nextTemplates = (d.templates ?? []) as Template[];
    setTemplates(nextTemplates);

    const selectedSlug =
      preferredSlug && nextTemplates.some((t) => t.slug === preferredSlug)
        ? preferredSlug
        : active && nextTemplates.some((t) => t.slug === active)
          ? active
          : nextTemplates[0]?.slug;

    if (selectedSlug) {
      const selectedTemplate = nextTemplates.find((t) => t.slug === selectedSlug);
      if (selectedTemplate) select(selectedTemplate);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadTemplates();
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(t: Template) {
    setActive(t.slug);
    setName(t.name);
    setAudience(t.audience);
    setDescription(t.description);
    setHeader(t.header ?? "");
    setSubject(t.subject);
    setBody(t.body);
    setFooter(t.footer ?? "");
    setTagline(t.tagline ?? "");
    setAttachmentsText((t.attachments ?? []).join("\n"));
    setConfirmDelete(false);
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
        audience,
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
                audience,
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

  async function createTemplate() {
    setCreating(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New dynamic template",
        audience: "candidate",
        description: "",
        header: "{{org_name}}",
        subject: "Update from {{org_name}}",
        body: "Hi {{candidate_name}},\n\nAdd your message here.",
        footer: "",
        tagline: "",
        attachments: [],
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.ok) {
      await loadTemplates(payload.slug);
      setMsg("Template created");
      return;
    }
    setMsg(payload.error ?? "Could not create template");
  }

  async function syncTemplates() {
    setSyncing(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-defaults" }),
    });
    setSyncing(false);
    if (res.ok) {
      await loadTemplates(active);
      setMsg("Default templates synchronized");
      return;
    }
    setMsg("Could not sync default templates");
  }

  async function cleanupLegacyFooterText() {
    setCleaningLegacy(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cleanup-legacy-footer" }),
    });
    const payload = (await res.json().catch(() => ({}))) as { updated?: number; error?: string };
    setCleaningLegacy(false);
    if (!res.ok) {
      setMsg(payload.error ?? "Could not clean legacy footer text");
      return;
    }
    await loadTemplates(active);
    setMsg(`Cleaned legacy footer text in ${payload.updated ?? 0} template(s)`);
  }

  async function cleanupLegacyHeaderText() {
    setCleaningHeader(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cleanup-legacy-header" }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      updated?: number;
      error?: string;
    };
    setCleaningHeader(false);
    if (!res.ok) {
      setMsg(payload.error ?? "Could not clean legacy header text");
      return;
    }
    await loadTemplates(active);
    setMsg(`Removed legacy header text from ${payload.updated ?? 0} template(s)`);
  }

  async function deleteTemplate() {
    if (!current || current.isDefault || !confirmDelete) return;
    setDeleting(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: current.slug }),
    });
    setDeleting(false);
    if (res.ok) {
      setConfirmDelete(false);
      const remaining = templates.filter((template) => template.slug !== current.slug);
      setTemplates(remaining);
      if (remaining[0]) {
        select(remaining[0]);
      }
      setMsg("Template deleted");
      return;
    }
    setConfirmDelete(false);
    const payload = await res.json().catch(() => ({}));
    setMsg(payload.error ?? "Could not delete template");
  }

  const current = templates.find((t) => t.slug === active);
  const useAssetsForPreview =
    assetConfig.applyScope === "all" ||
    (active ? assetConfig.templateSlugs.includes(active) : false);
  const previewHtml = renderPreviewHtml({
    header,
    body,
    footer,
    tagline,
    attachments: attachmentsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    logoUrl: useAssetsForPreview
      ? assetUrlsByKey[assetConfig.logoAssetKey] ?? ""
      : "",
    headerImageUrl: useAssetsForPreview
      ? assetUrlsByKey[assetConfig.headerImageAssetKey] ?? ""
      : "",
    footerImageUrl: useAssetsForPreview
      ? assetUrlsByKey[assetConfig.footerImageAssetKey] ?? ""
      : "",
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,420px)]">
      <aside className="space-y-2">
        <Button
          onClick={createTemplate}
          disabled={creating}
          className="w-full justify-center"
        >
          {creating ? "Creating..." : "+ New template"}
        </Button>
        <Button
          type="button"
          onClick={syncTemplates}
          disabled={syncing}
          className="w-full justify-center"
        >
          {syncing ? "Syncing..." : "Sync standard templates"}
        </Button>
        <Button
          type="button"
          onClick={cleanupLegacyFooterText}
          disabled={cleaningLegacy}
          className="w-full justify-center"
        >
          {cleaningLegacy ? "Cleaning..." : "Clean legacy footer text"}
        </Button>
        <Button
          type="button"
          onClick={cleanupLegacyHeaderText}
          disabled={cleaningHeader}
          className="w-full justify-center"
        >
          {cleaningHeader ? "Cleaning..." : "Clean legacy header text"}
        </Button>
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
              {t.isDefault ? " • standard" : " • custom"}
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
                <select
                  value={audience}
                  onChange={(event) =>
                    setAudience(event.target.value as Template["audience"])
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--cream-2)] bg-white px-3 py-2 text-[13px] capitalize text-[var(--ink-soft)]"
                >
                  <option value="candidate">Candidate</option>
                  <option value="interviewer">Interviewer</option>
                  <option value="internal">Internal</option>
                </select>
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
              <Button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={!current || current.isDefault || deleting}
              >
                {deleting ? "Deleting..." : "Delete custom template"}
              </Button>
              {msg && (
                <span className="text-[13px] text-[var(--ink-soft)]">{msg}</span>
              )}
            </div>
            {current.isDefault && (
              <p className="mt-2 text-[12px] text-[var(--ink-faint)]">
                Standard templates cannot be deleted. You can edit them or run sync to restore the original standard style.
              </p>
            )}
            {confirmDelete && !current.isDefault && (
              <div className="mt-3 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3">
                <p className="text-[12px] text-[var(--ink-soft)]">
                  Delete template <strong>{current.name}</strong>? This cannot be undone.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={deleteTemplate}
                    disabled={deleting}
                    className="px-4 py-2"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
