import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidateStages, candidates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError } from "@/lib/api/helpers";
import { buildIcsEvent } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

/** Download a calendar invite (.ics) for a booked stage — no third-party calendar API. */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id: stageId } = await params;
  const [row] = await db
    .select({
      stage: candidateStages,
      candidateName: candidates.name,
    })
    .from(candidateStages)
    .innerJoin(candidates, eq(candidateStages.candidateId, candidates.id))
    .where(
      and(
        eq(candidateStages.id, stageId),
        eq(candidateStages.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!row?.stage.dueAt) return apiError("No scheduled time for this stage", 404);

  const ics = buildIcsEvent({
    uid: `lets-evaluate-${stageId}@local`,
    title: `${row.stage.label}: ${row.candidateName}`,
    description: `Interview round — ${row.stage.label}`,
    start: new Date(row.stage.dueAt),
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${stageId}.ics"`,
    },
  });
}
