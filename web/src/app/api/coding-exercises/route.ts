import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { codingExercises } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { listCodingExercises } from "@/lib/application/coding/coding-queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const rows = await listCodingExercises(
    session.user.organizationId,
    session.user.id,
  );
  return NextResponse.json(rows);
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.string().min(1).max(60).optional(),
  timeLimitMin: z.number().int().min(10).max(120).optional(),
  scenario: z.string().min(1).max(12_000),
  starterCode: z.string().max(40_000).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["org", "private"]).optional(),
  roleId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, [
    "admin",
    "ta",
    "ta_lead",
    "interviewer",
    "manager",
    "hr",
  ]);
  if (forbidden) return forbidden;

  const body = createSchema.parse(await req.json());
  const id = uuid();
  await db.insert(codingExercises).values({
    id,
    organizationId: session.user.organizationId,
    title: body.title.trim(),
    language: body.language?.trim() || "TypeScript",
    timeLimitMin: body.timeLimitMin ?? 40,
    scenario: body.scenario.trim(),
    starterCode: body.starterCode ?? "",
    tags: body.tags ?? [],
    visibility: body.visibility ?? "org",
    roleId: body.roleId,
    createdById: session.user.id,
  });
  const [row] = await db
    .select()
    .from(codingExercises)
    .where(eq(codingExercises.id, id))
    .limit(1);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return apiError("id required");

  const [row] = await db
    .select()
    .from(codingExercises)
    .where(
      and(
        eq(codingExercises.id, id),
        eq(codingExercises.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);
  if (!row) return apiError("Not found", 404);

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && row.createdById !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  await db.delete(codingExercises).where(eq(codingExercises.id, id));
  return NextResponse.json({ ok: true });
}
