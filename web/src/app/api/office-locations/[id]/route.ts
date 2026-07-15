import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { officeLocations } from "@/lib/db/schema";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = updateSchema.parse(await req.json());
  const { id } = await params;

  await db
    .update(officeLocations)
    .set({ name: body.name, updatedAt: new Date() })
    .where(
      and(
        eq(officeLocations.id, id),
        eq(officeLocations.organizationId, session.user.organizationId),
      ),
    );

  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;

  await db
    .delete(officeLocations)
    .where(
      and(
        eq(officeLocations.id, id),
        eq(officeLocations.organizationId, session.user.organizationId),
      ),
    );

  return NextResponse.json({ ok: true });
}
