import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates, candidateStages, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { logEvent } from "@/lib/events";
import {
  ensureCandidateStages,
  getCandidateStages,
  rolesForStageKind,
  type StageKind,
} from "@/lib/db/queries";

const assignSchema = z.object({
  assignedToId: z.string().min(1),
  handoffNote: z.string().optional(),
  dueAt: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Book (or reschedule) the candidate's current active interview stage. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id: candidateId } = await params;
  const body = assignSchema.parse(await req.json());

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
  if (!candidate) return apiError("Not found", 404);
  if (!["ready_for_interview", "assigned"].includes(candidate.status)) {
    return apiError("Candidate must pass TA screening first", 400);
  }

  await ensureCandidateStages(
    session.user.organizationId,
    candidateId,
    candidate.projectId,
  );
  const stages = await getCandidateStages(candidateId, session.user.organizationId);
  const active = stages.find((s) => s.stage.status === "active");
  if (!active) return apiError("No active interview stage to book", 400);
  if (["screening", "final"].includes(active.stage.kind)) {
    return apiError("The current stage is not an interview round", 400);
  }

  // The assignee's role must match the stage kind (manager round → manager, etc).
  const allowed = rolesForStageKind(active.stage.kind as StageKind);
  const [member] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, session.user.organizationId),
        eq(organizationMembers.userId, body.assignedToId),
      ),
    )
    .limit(1);
  if (!member || !allowed.includes(member.role)) {
    return apiError(
      `This stage must be assigned to a ${allowed.join(" / ")} user`,
      400,
    );
  }

  await db
    .update(candidateStages)
    .set({
      assignedToId: body.assignedToId,
      assignedById: session.user.id,
      handoffNote: body.handoffNote ?? active.stage.handoffNote ?? "",
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(candidateStages.id, active.stage.id));

  await db
    .update(candidates)
    .set({ status: "assigned", updatedAt: new Date() })
    .where(eq(candidates.id, candidateId));

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "candidate",
    entityId: candidateId,
    action: "interview.assigned",
    payload: {
      stage: active.stage.label,
      assignedToId: body.assignedToId,
      dueAt: body.dueAt ?? null,
    },
  });

  return NextResponse.json({ stageId: active.stage.id });
}
