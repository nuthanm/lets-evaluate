import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/helpers";
import { getPipelineKanbanData } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const data = await getPipelineKanbanData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  return NextResponse.json(data);
}
