import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  getAvailabilityForUser,
  saveAvailabilityForUser,
} from "@/lib/db/queries";

const windowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(24 * 60 - 1),
  endMinute: z.number().int().min(1).max(24 * 60),
});

const bodySchema = z.object({
  userId: z.string().optional(),
  windows: z.array(windowSchema),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session.user.id;
  if (userId !== session.user.id && session.user.role !== "admin") {
    return apiError("Forbidden", 403);
  }

  const windows = await getAvailabilityForUser(
    session.user.organizationId,
    userId,
  );
  return NextResponse.json(windows);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const body = bodySchema.parse(await req.json());
  const userId = body.userId ?? session.user.id;
  if (userId !== session.user.id) {
    const forbidden = requireApiRole(session.user.role, ["admin"]);
    if (forbidden) return forbidden;
  }

  await saveAvailabilityForUser(
    session.user.organizationId,
    userId,
    body.windows,
  );
  return NextResponse.json({ ok: true });
}
