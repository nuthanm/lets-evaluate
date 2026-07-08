import { db } from "@/lib/db";
import { mailTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import {
  DEFAULT_MAIL_TEMPLATES,
  type MailTemplateSlug,
} from "./defaults";
import {
  buildMailto,
  renderTemplateText,
  type MailVars,
  type RenderedMail,
} from "./placeholders";

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
      subject: t.subject,
      body: t.body,
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
    subject: fallback.subject,
    body: fallback.body,
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
  const tpl = await getMailTemplateBySlug(organizationId, slug);
  if (!tpl) return null;

  const subject = renderTemplateText(tpl.subject, vars);
  const body = renderTemplateText(tpl.body, vars);
  const to = resolveRecipient(slug, tpl.audience, vars);

  return {
    slug,
    to,
    subject,
    body,
    mailto: buildMailto(to, subject, body),
  };
}

export async function prepareMails(
  organizationId: string,
  specs: { slug: MailTemplateSlug | string; vars: MailVars }[],
) {
  const results: RenderedMail[] = [];
  for (const spec of specs) {
    const mail = await prepareMail(organizationId, spec.slug, spec.vars);
    if (mail) results.push(mail);
  }
  return results;
}

export { buildIcsEvent } from "./ics";
