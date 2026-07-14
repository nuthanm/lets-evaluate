import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { getOrgQuestions } from "@/lib/db/queries";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get("roleId") ?? undefined;
  const rows = await getOrgQuestions(
    session.user.organizationId,
    roleId,
    session.user.id,
  );
  return NextResponse.json(rows);
}

const schema = z.object({
  questionText: z.string().min(1),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  roleId: z.string().optional(),
  code: z.string().optional(),
  // "org" = share with everyone, "private" = only me.
  visibility: z.enum(["org", "private"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  // Anyone in the org may contribute to the library; visibility controls sharing.
  const forbidden = requireApiRole(session.user.role, [
    "admin",
    "ta",
    "interviewer",
    "manager",
    "hr",
  ]);
  if (forbidden) return forbidden;

  const body = schema.parse(await req.json());
  const id = uuid();
  await db.insert(questions).values({
    id,
    organizationId: session.user.organizationId,
    questionText: body.questionText,
    category: body.category ?? "Technical",
    difficulty: body.difficulty ?? "Medium",
    roleId: body.roleId,
    roleIds: body.roleId ? [body.roleId] : [],
    code: body.code ?? "",
    visibility: body.visibility ?? "org",
    createdById: session.user.id,
  });
  revalidatePath("/library");
  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id required", 400);

  const [existing] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.id, id),
        eq(questions.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);
  if (!existing) return apiError("Not found", 404);

  // Admins can remove any question; others only their own.
  if (session.user.role !== "admin" && existing.createdById !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  await db.delete(questions).where(eq(questions.id, id));
  revalidatePath("/library");
  return NextResponse.json({ ok: true });
}
