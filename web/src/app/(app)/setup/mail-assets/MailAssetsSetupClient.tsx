"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldLabel } from "@/components/FormField";

type AssetItem = {
  key: string;
  name: string;
  url: string;
};

type TemplateItem = {
  slug: string;
  name: string;
};

type ApiPayload = {
  config: {
    logoAssetKey: string;
    headerImageAssetKey: string;
    footerImageAssetKey: string;
    applyScope: "all" | "specific";
    templateSlugs: string[];
  };
  assets: AssetItem[];
  templates: TemplateItem[];
};

export function MailAssetsSetupClient() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [logoAssetKey, setLogoAssetKey] = useState("");
  const [headerImageAssetKey, setHeaderImageAssetKey] = useState("");
  const [footerImageAssetKey, setFooterImageAssetKey] = useState("");
  const [applyScope, setApplyScope] = useState<"all" | "specific">("all");
  const [templateSlugs, setTemplateSlugs] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/mail-assets", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as ApiPayload;
    setAssets(payload.assets ?? []);
    setTemplates(payload.templates ?? []);
    setLogoAssetKey(payload.config?.logoAssetKey ?? "");
    setHeaderImageAssetKey(payload.config?.headerImageAssetKey ?? "");
    setFooterImageAssetKey(payload.config?.footerImageAssetKey ?? "");
    setApplyScope(payload.config?.applyScope === "specific" ? "specific" : "all");
    setTemplateSlugs(payload.config?.templateSlugs ?? []);
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, AssetItem>();
    for (const item of assets) map.set(item.key, item);
    return map;
  }, [assets]);

  const logoPreview = byKey.get(logoAssetKey)?.url ?? "";
  const headerPreview = byKey.get(headerImageAssetKey)?.url ?? "";
  const footerPreview = byKey.get(footerImageAssetKey)?.url ?? "";

  async function upload() {
    if (!uploadFile) return;
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    form.set("file", uploadFile);

    const res = await fetch("/api/mail-assets", {
      method: "POST",
      body: form,
    });
    setUploading(false);

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(err.error ?? "Upload failed");
      return;
    }

    const payload = (await res.json()) as {
      asset?: AssetItem;
    };

    if (payload.asset) {
      setAssets((current) => {
        const next = [payload.asset!, ...current.filter((item) => item.key !== payload.asset!.key)];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setMsg(`Uploaded ${payload.asset.name}`);
      setUploadFile(null);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/mail-assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoAssetKey,
        headerImageAssetKey,
        footerImageAssetKey,
        applyScope,
        templateSlugs: applyScope === "specific" ? templateSlugs : [],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(err.error ?? "Could not save mail assets");
      return;
    }
    setMsg("Mail asset configuration saved");
  }

  async function removeAsset(key: string) {
    setDeletingKey(key);
    setMsg(null);
    const res = await fetch("/api/mail-assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setDeletingKey(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(err.error ?? "Failed to delete asset");
      return;
    }

    setAssets((current) => current.filter((asset) => asset.key !== key));
    if (logoAssetKey === key) setLogoAssetKey("");
    if (headerImageAssetKey === key) setHeaderImageAssetKey("");
    if (footerImageAssetKey === key) setFooterImageAssetKey("");
    setMsg("Asset removed");
  }

  async function cleanupUnselectedAssets() {
    const keep = new Set([
      logoAssetKey,
      headerImageAssetKey,
      footerImageAssetKey,
    ]);
    const targets = assets.filter((asset) => !keep.has(asset.key));
    if (!targets.length) {
      setMsg("No old assets to clean");
      return;
    }

    setCleaning(true);
    setMsg(null);
    let deleted = 0;

    for (const asset of targets) {
      const res = await fetch("/api/mail-assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: asset.key }),
      });
      if (res.ok) deleted += 1;
    }

    setCleaning(false);
    await load();
    setMsg(`Cleaned ${deleted} old asset(s)`);
  }

  function toggleTemplate(slug: string) {
    setTemplateSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-5">
        <CaseCard className="p-5">
          <h2 className="font-serif text-xl font-bold">Upload image assets</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
            Upload logo, header, and footer images to the Assets/ folder in your configured Cloudflare R2 bucket.
          </p>

          <div className="mt-4">
            <FieldLabel>Choose image</FieldLabel>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-xl border border-[var(--cream-2)] bg-white px-3 py-2 text-[13px]"
            />
          </div>

          {uploadFile && (
            <p className="mt-2 text-[12px] text-[var(--ink-soft)]">
              Ready: {uploadFile.name}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={upload} disabled={uploading || !uploadFile}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[12px] text-[var(--ink-soft)]">
            <div className="font-bold text-[var(--ink)]">Starter files in project</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><a className="underline" href="/assets/mail/logo-sample.svg" target="_blank" rel="noopener noreferrer">logo-sample.svg</a></li>
              <li><a className="underline" href="/assets/mail/header-sample.svg" target="_blank" rel="noopener noreferrer">header-sample.svg</a></li>
              <li><a className="underline" href="/assets/mail/footer-sample.svg" target="_blank" rel="noopener noreferrer">footer-sample.svg</a></li>
            </ul>
          </div>
        </CaseCard>

        <CaseCard className="p-5">
          <h2 className="font-serif text-xl font-bold">Apply scope</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
            Choose whether selected assets apply to all templates or only specific templates.
          </p>

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="applyScope"
                checked={applyScope === "all"}
                onChange={() => setApplyScope("all")}
              />
              Apply to all email templates
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="applyScope"
                checked={applyScope === "specific"}
                onChange={() => setApplyScope("specific")}
              />
              Apply to specific templates
            </label>
          </div>

          {applyScope === "specific" && (
            <div className="mt-3 max-h-56 space-y-1 overflow-auto rounded-xl border border-[var(--cream-2)] bg-white p-3">
              {templates.length === 0 ? (
                <p className="text-[12px] text-[var(--ink-faint)]">No templates found.</p>
              ) : (
                templates.map((template) => (
                  <label key={template.slug} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={templateSlugs.includes(template.slug)}
                      onChange={() => toggleTemplate(template.slug)}
                    />
                    {template.name}
                    <span className="text-[11px] text-[var(--ink-faint)]">({template.slug})</span>
                  </label>
                ))
              )}
            </div>
          )}

          <div className="mt-4">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? "Saving..." : "Save configuration"}
            </Button>
          </div>

          {msg && <p className="mt-3 text-[13px] text-[var(--ink-soft)]">{msg}</p>}
        </CaseCard>
      </div>

      <div className="space-y-5">
        <CaseCard className="p-5">
          <h2 className="font-serif text-xl font-bold">Select assets by name</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
            Dropdown values come from files uploaded to the Assets/ folder.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Logo</FieldLabel>
              <select
                value={logoAssetKey}
                onChange={(event) => setLogoAssetKey(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--cream-2)] bg-white px-3 py-2 text-[13px]"
              >
                <option value="">None</option>
                {assets.map((asset) => (
                  <option key={asset.key} value={asset.key}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Header image</FieldLabel>
              <select
                value={headerImageAssetKey}
                onChange={(event) => setHeaderImageAssetKey(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--cream-2)] bg-white px-3 py-2 text-[13px]"
              >
                <option value="">None</option>
                {assets.map((asset) => (
                  <option key={asset.key} value={asset.key}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Footer image</FieldLabel>
              <select
                value={footerImageAssetKey}
                onChange={(event) => setFooterImageAssetKey(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--cream-2)] bg-white px-3 py-2 text-[13px]"
              >
                <option value="">None</option>
                {assets.map((asset) => (
                  <option key={asset.key} value={asset.key}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={cleanupUnselectedAssets}
              disabled={cleaning}
            >
              {cleaning ? "Cleaning..." : "Clean old unselected assets"}
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3">
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
              Uploaded assets
            </div>
            <div className="mt-2 max-h-56 space-y-2 overflow-auto">
              {assets.length === 0 ? (
                <p className="text-[12px] text-[var(--ink-faint)]">No assets uploaded yet.</p>
              ) : (
                assets.map((asset) => (
                  <div
                    key={asset.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cream-2)] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{asset.name}</p>
                      <p className="truncate text-[11px] text-[var(--ink-faint)]">{asset.key}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeAsset(asset.key)}
                      disabled={deletingKey === asset.key}
                      className="px-3 py-1.5 text-[12px] text-[#c0392b] hover:text-[#c0392b]"
                    >
                      {deletingKey === asset.key ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CaseCard>

        <CaseCard className="p-5">
          <h2 className="font-serif text-xl font-bold">Live asset preview</h2>
          <div className="mt-4 space-y-4 rounded-xl border border-[var(--cream-2)] bg-white p-4">
            <PreviewBlock label="Logo" url={logoPreview} compact />
            <PreviewBlock label="Header image" url={headerPreview} />
            <PreviewBlock label="Footer image" url={footerPreview} />
          </div>
        </CaseCard>
      </div>
    </div>
  );
}

function PreviewBlock({
  label,
  url,
  compact,
}: {
  label: string;
  url: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ink-faint)]">{label}</div>
      <div className="mt-2 grid place-items-center rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3">
        {url ? (
          <>
            <Image
              src={url}
              alt={label}
              width={2200}
              height={1200}
              unoptimized
              className={`block w-full rounded-md object-contain ${compact ? "max-h-[90px]" : "max-h-none"}`}
              style={{ height: "auto" }}
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-[12px] font-semibold text-[var(--cyan-d)] underline"
            >
              Open full image
            </a>
          </>
        ) : (
          <span className="text-[12px] text-[var(--ink-faint)]">No image selected</span>
        )}
      </div>
    </div>
  );
}
