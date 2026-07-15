import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  DEFAULT_MAIL_TEMPLATES,
  ensureMailTemplates,
  getOrgMailTemplates,
  MAIL_PLACEHOLDERS,
} from "@/lib/email";

const DEFAULT_TEMPLATE_SLUGS = new Set<string>(DEFAULT_MAIL_TEMPLATES.map((t) => t.slug));

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const templates = await getOrgMailTemplates(session.user.organizationId);
  return NextResponse.json({
    templates: templates.map((t) => ({
      ...t,
      isDefault: DEFAULT_TEMPLATE_SLUGS.has(t.slug),
    })),
    placeholders: MAIL_PLACEHOLDERS,
    defaultTemplateSlugs: [...DEFAULT_TEMPLATE_SLUGS],
  });
}

const updateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
  audience: z.enum(["candidate", "interviewer", "internal"]).optional(),
  header: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  footer: z.string().optional(),
  tagline: z.string().optional(),
  attachments: z.array(z.string().min(1)).optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = updateSchema.parse(await req.json());
  await ensureMailTemplates(session.user.organizationId);

  await db
    .update(mailTemplates)
    .set({
      header: body.header ?? "",
      subject: body.subject,
      body: body.body,
      footer: body.footer ?? "",
      tagline: body.tagline ?? "",
      attachments: body.attachments ?? [],
      ...(body.name ? { name: body.name } : {}),
      ...(body.audience ? { audience: body.audience } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mailTemplates.organizationId, session.user.organizationId),
        eq(mailTemplates.slug, body.slug),
      ),
    );

  return NextResponse.json({ ok: true });
}

const createSchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1),
  audience: z.enum(["candidate", "interviewer", "internal"]),
  description: z.string().optional(),
  header: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  footer: z.string().optional(),
  tagline: z.string().optional(),
  attachments: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = createSchema.parse(await req.json());
  await ensureMailTemplates(session.user.organizationId);

  const existing = await db
    .select({ slug: mailTemplates.slug })
    .from(mailTemplates)
    .where(eq(mailTemplates.organizationId, session.user.organizationId));
  const existingSlugs = new Set(existing.map((row) => row.slug));

  const baseSlug = toSlug(body.slug ?? body.name) || "template";
  let slug = baseSlug;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}_${suffix}`;
    suffix += 1;
  }

  await db.insert(mailTemplates).values({
    id: crypto.randomUUID(),
    organizationId: session.user.organizationId,
    slug,
    name: body.name.trim(),
    audience: body.audience,
    description: body.description?.trim() ?? "",
    header: body.header ?? "",
    subject: body.subject,
    body: body.body,
    footer: body.footer ?? "",
    tagline: body.tagline ?? "",
    attachments: body.attachments ?? [],
    updatedAt: new Date(),
  });

  return NextResponse.json({ ok: true, slug });
}

const syncSchema = z.object({
  action: z.enum([
    "sync-defaults",
    "cleanup-legacy-footer",
    "cleanup-legacy-header",
  ]),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = syncSchema.parse(await req.json());

  if (body.action === "cleanup-legacy-footer") {
    const legacy = "Thank you,\n{{ta_name}}\n{{org_name}} Talent team";
    const replacement = "Regards,\n{{org_name}} Talent Team";

    const rows = await db
      .select({
        slug: mailTemplates.slug,
        body: mailTemplates.body,
        footer: mailTemplates.footer,
      })
      .from(mailTemplates)
      .where(eq(mailTemplates.organizationId, session.user.organizationId));

    let updated = 0;
    await Promise.all(
      rows.map(async (row) => {
        const nextBody = row.body.replaceAll(legacy, replacement);
        const nextFooter = row.footer.replaceAll(legacy, replacement);
        if (nextBody === row.body && nextFooter === row.footer) return;

        updated += 1;
        await db
          .update(mailTemplates)
          .set({
            body: nextBody,
            footer: nextFooter,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mailTemplates.organizationId, session.user.organizationId),
              eq(mailTemplates.slug, row.slug),
            ),
          );
      }),
    );

    return NextResponse.json({ ok: true, updated });
  }

  if (body.action === "cleanup-legacy-header") {
    const legacyHeaders = new Set([
      "{{org_name}}\nHiring update for {{role}}",
      "{{org_name}}\nInterview panel coordination",
    ]);

    const rows = await db
      .select({
        slug: mailTemplates.slug,
        header: mailTemplates.header,
      })
      .from(mailTemplates)
      .where(eq(mailTemplates.organizationId, session.user.organizationId));

    let updated = 0;
    await Promise.all(
      rows.map(async (row) => {
        const trimmed = row.header.trim();
        if (!legacyHeaders.has(trimmed)) return;

        updated += 1;
        await db
          .update(mailTemplates)
          .set({
            header: "",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mailTemplates.organizationId, session.user.organizationId),
              eq(mailTemplates.slug, row.slug),
            ),
          );
      }),
    );

    return NextResponse.json({ ok: true, updated });
  }

  await ensureMailTemplates(session.user.organizationId);

  await Promise.all(
    DEFAULT_MAIL_TEMPLATES.map((template) =>
      db
        .update(mailTemplates)
        .set({
          name: template.name,
          audience: template.audience,
          description: template.description,
          header: template.header,
          subject: template.subject,
          body: template.body,
          footer: template.footer,
          tagline: template.tagline,
          attachments: template.attachments,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mailTemplates.organizationId, session.user.organizationId),
            eq(mailTemplates.slug, template.slug),
          ),
        ),
    ),
  );

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  slug: z.string().min(1),
});

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = deleteSchema.parse(await req.json());
  if (DEFAULT_TEMPLATE_SLUGS.has(body.slug)) {
    return apiError("Default templates cannot be deleted", 400);
  }

  await db
    .delete(mailTemplates)
    .where(
      and(
        eq(mailTemplates.organizationId, session.user.organizationId),
        eq(mailTemplates.slug, body.slug),
      ),
    );

  return NextResponse.json({ ok: true });
}
