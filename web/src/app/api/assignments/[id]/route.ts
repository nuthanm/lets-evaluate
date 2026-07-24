import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  candidates,
  candidateStages,
  organizationMembers,
  projects,
  roles,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { canMutateCandidate } from "@/lib/auth/capabilities";
import { logEvent } from "@/lib/events";
import {
  ensureCandidateStages,
  getCandidateStages,
  rolesForStageKind,
  type StageKind,
} from "@/lib/db/queries";
import { assertRoleOpen } from "@/lib/db/opening-guard";
import { prepareMails } from "@/lib/email";
import { buildMailVars } from "@/lib/email/vars";

function stageMailSlugs(kind: StageKind) {
  if (kind === "technical") {
    return {
      interviewer: "interviewer_technical_assigned",
      candidate: "candidate_technical_round",
    } as const;
  }
  if (kind === "manager") {
    return {
      interviewer: "interviewer_manager_assigned",
      candidate: "candidate_manager_round",
    } as const;
  }
  if (kind === "hr") {
    return {
      interviewer: "interviewer_hr_assigned",
      candidate: "candidate_hr_round",
    } as const;
  }
  return {
    interviewer: "interviewer_assigned",
    candidate: "candidate_scheduled",
  } as const;
}

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
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
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
  if (
    !canMutateCandidate(
      session.user.role,
      session.user.id,
      candidate.createdById,
    )
  ) {
    return apiError(
      "You can view this candidate but only the owning recruiter (or an admin) can schedule interviews.",
      403,
    );
  }
  const openingErr = await assertRoleOpen(candidate.roleId);
  if (openingErr) return apiError(openingErr, 400);
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
  if (!active) return apiError("No active interview stage to schedule", 400);
  if (["screening", "final"].includes(active.stage.kind)) {
    return apiError("The current stage is not an interview round", 400);
  }

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

  const dueAt = body.dueAt ? new Date(body.dueAt) : null;
  const slaDueAt = dueAt
    ? new Date(dueAt.getTime() + 48 * 60 * 60 * 1000)
    : null;

  await db
    .update(candidateStages)
    .set({
      assignedToId: body.assignedToId,
      assignedById: session.user.id,
      handoffNote: body.handoffNote ?? active.stage.handoffNote ?? "",
      dueAt,
      slaDueAt,
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

  const [assignee] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, body.assignedToId))
    .limit(1);
  const [roleRow] = candidate.roleId
    ? await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, candidate.roleId))
        .limit(1)
    : [null];
  const [projectRow] = candidate.projectId
    ? await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, candidate.projectId))
        .limit(1)
    : [null];

  const interviewDate = dueAt
    ? dueAt.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBD";

  const baseVars = buildMailVars({
    candidate,
    roleName: roleRow?.name ?? "Role",
    projectName: projectRow?.name ?? "Project",
    taName: session.user.name ?? undefined,
    interviewDate,
    interviewStage: active.stage.label,
    interviewer: assignee ?? undefined,
    handoffNote: body.handoffNote ?? "",
  });
  const mailSlugs = stageMailSlugs(active.stage.kind as StageKind);

  const mails = await prepareMails(session.user.organizationId, [
    { slug: mailSlugs.interviewer, vars: baseVars },
    { slug: mailSlugs.candidate, vars: baseVars },
  ]);

  return NextResponse.json({
    stageId: active.stage.id,
    mails,
    icsUrl: `/api/stages/${active.stage.id}/ics`,
  });
}
