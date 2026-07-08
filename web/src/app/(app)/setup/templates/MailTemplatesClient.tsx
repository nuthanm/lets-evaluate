"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldTextarea } from "@/components/FormField";
import { MAIL_PLACEHOLDERS } from "@/lib/email";

type Template = {
  slug: string;
  name: string;
  audience: string;
  description: string;
  subject: string;
  body: string;
};

export function MailTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [active, setActive] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
    setSubject(t.subject);
    setBody(t.body);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/mail-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: active, subject, body }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved" : "Could not save");
  }

  const current = templates.find((t) => t.slug === active);

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
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
            <h2 className="font-serif text-xl font-bold">{current.name}</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
              {current.description}
            </p>
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
    </div>
  );
}
