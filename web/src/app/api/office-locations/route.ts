import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { officeLocations } from "@/lib/db/schema";
import { getOrgOfficeLocations } from "@/lib/db/queries";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const rows = await getOrgOfficeLocations(session.user.organizationId);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = schema.parse(await req.json());
  const id = uuid();

  await db.insert(officeLocations).values({
    id,
    organizationId: session.user.organizationId,
    name: body.name,
  });

  return NextResponse.json({ id });
}
