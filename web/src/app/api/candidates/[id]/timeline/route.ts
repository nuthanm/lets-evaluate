import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/helpers";
import { getCandidateTimeline } from "@/lib/db/queries";
import { formatAuditAction } from "@/lib/audit/format-action";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id: candidateId } = await params;
  const rows = await getCandidateTimeline(
    session.user.organizationId,
    candidateId,
  );

  return NextResponse.json({
    entries: rows.map((row) => ({
      id: row.id,
      at: row.at,
      actorName: row.actorName,
      action: row.action,
      label: formatAuditAction(row.action, row.payload),
      payload: row.payload,
    })),
  });
}
