import { db } from "@/lib/db";
import { mailTemplates, organizationMailAssets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getBrand } from "@/lib/brand";
import {
  DEFAULT_MAIL_TEMPLATES,
  type MailTemplateSlug,
} from "./defaults";
import {
  buildMailto,
  type MailAssets,
  renderStructuredMail,
  renderTemplateText,
  type MailVars,
  type RenderedMail,
} from "./placeholders";

async function getOrgMailAssets(organizationId: string): Promise<MailAssets | undefined> {
  const [assets] = await db
    .select({
      logoAssetKey: organizationMailAssets.logoAssetKey,
      headerImageAssetKey: organizationMailAssets.headerImageAssetKey,
      footerImageAssetKey: organizationMailAssets.footerImageAssetKey,
      applyScope: organizationMailAssets.applyScope,
      templateSlugs: organizationMailAssets.templateSlugs,
    })
    .from(organizationMailAssets)
    .where(eq(organizationMailAssets.organizationId, organizationId))
    .limit(1);

  if (!assets) return undefined;

  const appUrl = getBrand().appUrl.trim().replace(/\/$/, "");
  const keyToUrl = (key: string | null | undefined) => {
    const normalized = key?.trim() ?? "";
    if (!normalized.startsWith("Assets/")) return "";
    const path = normalized.split("/").map(encodeURIComponent).join("/");
    if (appUrl) return `${appUrl}/api/public/assets/${path}`;
    return `/api/public/assets/${path}`;
  };

  const selectedSlugs = Array.isArray(assets.templateSlugs)
    ? assets.templateSlugs
    : [];

  return {
    logoUrl: keyToUrl(assets.logoAssetKey),
    headerImageUrl: keyToUrl(assets.headerImageAssetKey),
    footerImageUrl: keyToUrl(assets.footerImageAssetKey),
    applyScope: assets.applyScope,
    templateSlugs: selectedSlugs,
  };
}

async function prepareMailWithAssets(
  organizationId: string,
  slug: MailTemplateSlug | string,
  vars: MailVars,
  assets?: MailAssets,
): Promise<RenderedMail | null> {
  const tpl = await getMailTemplateBySlug(organizationId, slug);
  if (!tpl) return null;

  const subject = renderTemplateText(tpl.subject, vars);
  const shouldApplyAssets =
    (assets?.applyScope ?? "all") === "all" ||
    Boolean(assets?.templateSlugs?.includes(slug));
  const rendered = renderStructuredMail({
    header: tpl.header,
    body: tpl.body,
    footer: tpl.footer,
    tagline: tpl.tagline,
    attachments: tpl.attachments ?? [],
    assets: shouldApplyAssets ? assets : undefined,
    vars,
  });
  const to = resolveRecipient(slug, tpl.audience, vars);

  return {
    slug,
    to,
    subject,
    body: rendered.plainText,
    bodyHtml: rendered.html,
    attachments: rendered.attachments,
    mailto: buildMailto(to, subject, rendered.plainText),
  };
}

export async function ensureMailTemplates(organizationId: string) {
  const existing = await db
    .select({ slug: mailTemplates.slug })
    .from(mailTemplates)
    .where(eq(mailTemplates.organizationId, organizationId));

  const have = new Set(existing.map((r) => r.slug));
  const missing = DEFAULT_MAIL_TEMPLATES.filter((t) => !have.has(t.slug));
  if (!missing.length) return;

  await db.insert(mailTemplates).values(
    missing.map((t) => ({
      id: uuid(),
      organizationId,
      slug: t.slug,
      name: t.name,
      audience: t.audience,
      description: t.description,
      header: t.header,
      subject: t.subject,
      body: t.body,
      footer: t.footer,
      tagline: t.tagline,
      attachments: t.attachments,
    })),
  );
}

export async function getOrgMailTemplates(organizationId: string) {
  await ensureMailTemplates(organizationId);
  return db
    .select()
    .from(mailTemplates)
    .where(eq(mailTemplates.organizationId, organizationId))
    .orderBy(mailTemplates.slug);
}

export async function getMailTemplateBySlug(
  organizationId: string,
  slug: MailTemplateSlug | string,
) {
  await ensureMailTemplates(organizationId);
  const [row] = await db
    .select()
    .from(mailTemplates)
    .where(
      and(
        eq(mailTemplates.organizationId, organizationId),
        eq(mailTemplates.slug, slug),
      ),
    )
    .limit(1);
  if (row) return row;
  const fallback = DEFAULT_MAIL_TEMPLATES.find((t) => t.slug === slug);
  if (!fallback) return null;
  return {
    id: "",
    organizationId,
    slug: fallback.slug,
    name: fallback.name,
    audience: fallback.audience,
    description: fallback.description,
    header: fallback.header,
    subject: fallback.subject,
    body: fallback.body,
    footer: fallback.footer,
    tagline: fallback.tagline,
    attachments: fallback.attachments,
    updatedAt: new Date(),
  };
}

function resolveRecipient(
  slug: string,
  audience: string,
  vars: MailVars,
): string {
  if (audience === "interviewer" || slug.startsWith("interviewer_")) {
    return vars.interviewerEmail ?? "";
  }
  if (audience === "candidate" || slug.startsWith("candidate_")) {
    return vars.candidateEmail ?? "";
  }
  return vars.interviewerEmail ?? vars.candidateEmail ?? "";
}

/** Render a template with placeholders — no external email service. */
export async function prepareMail(
  organizationId: string,
  slug: MailTemplateSlug | string,
  vars: MailVars,
): Promise<RenderedMail | null> {
  const assets = await getOrgMailAssets(organizationId);
  return prepareMailWithAssets(organizationId, slug, vars, assets);
}

export async function prepareMails(
  organizationId: string,
  specs: { slug: MailTemplateSlug | string; vars: MailVars }[],
) {
  const assets = await getOrgMailAssets(organizationId);
  const results: RenderedMail[] = [];
  for (const spec of specs) {
    const mail = await prepareMailWithAssets(
      organizationId,
      spec.slug,
      spec.vars,
      assets,
    );
    if (mail) results.push(mail);
  }
  return results;
}

export { buildIcsEvent } from "./ics";
