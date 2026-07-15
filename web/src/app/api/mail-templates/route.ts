import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  ensureMailTemplates,
  getOrgMailTemplates,
  MAIL_PLACEHOLDERS,
} from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const templates = await getOrgMailTemplates(session.user.organizationId);
  return NextResponse.json({ templates, placeholders: MAIL_PLACEHOLDERS });
}

const updateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
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
