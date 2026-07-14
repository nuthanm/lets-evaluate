import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { grantSessionRetry } from "@/lib/application/screening/handle-violation";
import { getSessionById } from "@/lib/db/repositories/bulk-job-repository";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const screeningSession = await getSessionById(id);
  if (!screeningSession) return apiError("Not found", 404);
  if (screeningSession.organizationId !== session.user.organizationId) {
    return apiError("Forbidden", 403);
  }

  try {
    const result = await grantSessionRetry(id, session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Retry failed", 400);
  }
}
