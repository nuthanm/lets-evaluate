import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobDescriptionPrompts } from "@/lib/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const promptSchema = z.object({
  name: z.string().trim().min(2).max(80),
  template: z.string().trim().min(20).max(4000),
});

const updateSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  template: z.string().trim().min(20).max(4000),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const rows = await db
    .select({
      id: jobDescriptionPrompts.id,
      name: jobDescriptionPrompts.name,
      template: jobDescriptionPrompts.template,
      createdAt: jobDescriptionPrompts.createdAt,
      updatedAt: jobDescriptionPrompts.updatedAt,
    })
    .from(jobDescriptionPrompts)
    .where(eq(jobDescriptionPrompts.organizationId, session.user.organizationId))
    .orderBy(desc(jobDescriptionPrompts.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const body = promptSchema.parse(await req.json());

  const existing = await db
    .select({ name: jobDescriptionPrompts.name })
    .from(jobDescriptionPrompts)
    .where(eq(jobDescriptionPrompts.organizationId, session.user.organizationId));

  const duplicate = existing.find(
    (row) => row.name && body.name.toLowerCase() === row.name.toLowerCase(),
  );
  if (duplicate) return apiError("Prompt name already exists", 409);

  const id = uuid();
  await db.insert(jobDescriptionPrompts).values({
    id,
    organizationId: session.user.organizationId,
    name: body.name,
    template: body.template,
    createdById: session.user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const body = updateSchema.parse(await req.json());

  const [target] = await db
    .select({ id: jobDescriptionPrompts.id })
    .from(jobDescriptionPrompts)
    .where(
      and(
        eq(jobDescriptionPrompts.id, body.id),
        eq(jobDescriptionPrompts.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!target) return apiError("Prompt not found", 404);

  const [duplicate] = await db
    .select({ id: jobDescriptionPrompts.id })
    .from(jobDescriptionPrompts)
    .where(
      and(
        eq(jobDescriptionPrompts.organizationId, session.user.organizationId),
        eq(jobDescriptionPrompts.name, body.name),
        ne(jobDescriptionPrompts.id, body.id),
      ),
    )
    .limit(1);

  if (duplicate) return apiError("Prompt name already exists", 409);

  await db
    .update(jobDescriptionPrompts)
    .set({
      name: body.name,
      template: body.template,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobDescriptionPrompts.id, body.id),
        eq(jobDescriptionPrompts.organizationId, session.user.organizationId),
      ),
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const body = deleteSchema.parse(await req.json());

  await db
    .delete(jobDescriptionPrompts)
    .where(
      and(
        eq(jobDescriptionPrompts.id, body.id),
        eq(jobDescriptionPrompts.organizationId, session.user.organizationId),
      ),
    );

  return NextResponse.json({ ok: true });
}
