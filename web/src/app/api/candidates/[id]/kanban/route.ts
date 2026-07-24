import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { canMutateCandidate } from "@/lib/auth/capabilities";
import { db } from "@/lib/db";
import { candidateStages, candidates } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { logEvent } from "@/lib/events";

const moveSchema = z.object({
  columnKey: z.string().min(1),
});

const DECIDED = new Set(["selected", "rejected", "hold", "screened_rejected"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const { id: candidateId } = await params;
  const { columnKey } = moveSchema.parse(await req.json());

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.id, candidateId),
        eq(candidates.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!candidate) return apiError("Candidate not found", 404);
  if (
    !canMutateCandidate(
      session.user.role,
      session.user.id,
      candidate.createdById,
    )
  ) {
    return apiError(
      "You can view this candidate but only the owning recruiter (or an admin) can move stages.",
      403,
    );
  }
  if (DECIDED.has(candidate.status)) {
    return apiError("Cannot move a decided candidate", 400);
  }

  if (columnKey === "decided") {
    return apiError("Use the evaluate flow to record a final decision", 400);
  }

  const stageMatch = /^stage-(\d+)$/.exec(columnKey);
  if (!stageMatch) return apiError("Invalid column", 400);
  const targetIndex = Number(stageMatch[1]);

  const stages = await db
    .select()
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.candidateId, candidateId),
        eq(candidateStages.organizationId, session.user.organizationId),
      ),
    )
    .orderBy(asc(candidateStages.position));

  const target = stages[targetIndex];
  if (!target) return apiError("Stage not found for this column", 400);

  const passedBeforeTarget = stages
    .slice(0, targetIndex)
    .every((s) => s.status === "passed" || s.status === "skipped");

  if (targetIndex > 0 && !passedBeforeTarget && session.user.role !== "admin") {
    return apiError("Complete earlier stages before moving forward", 400);
  }

  await db.transaction(async (tx) => {
    for (const stage of stages) {
      let status = stage.status;
      if (stage.position < target.position) {
        status = stage.status === "pending" ? "passed" : stage.status;
      } else if (stage.id === target.id) {
        status = "active";
      } else if (stage.position > target.position) {
        status = "pending";
      }
      if (status !== stage.status) {
        await tx
          .update(candidateStages)
          .set({ status, updatedAt: new Date() })
          .where(eq(candidateStages.id, stage.id));
      }
    }
  });

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "candidate",
    entityId: candidateId,
    action: "kanban.stage_moved",
    payload: { columnKey, stageLabel: target.label },
  });

  return NextResponse.json({ ok: true, columnKey });
}
