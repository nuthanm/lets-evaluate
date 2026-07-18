import { requireRole } from "@/lib/auth/rbac";
import {
  ensureCandidateStages,
  getAssignableUsers,
  getCandidateDetail,
  getInterviewerLoad,
  getStageBookings,
  rolesForStageKind,
  type StageKind,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { interviewerAvailability, projects, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CabinetPage, CaseCard } from "@/components/CabinetPage";
import { ScheduleClient } from "./ScheduleClient";

type Params = { params: Promise<{ id: string }> };

export default async function SchedulePage({ params }: Params) {
  const session = await requireRole(["admin", "ta"]);
  const { id } = await params;

  await ensureCandidateStages(session.user.organizationId, id);
  const detail = await getCandidateDetail(session.user.organizationId, id);
  if (!detail) notFound();

  const [roleRow] = detail.candidate.roleId
    ? await db.select().from(roles).where(eq(roles.id, detail.candidate.roleId)).limit(1)
    : [null];
  const [projectRow] = detail.candidate.projectId
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.id, detail.candidate.projectId))
        .limit(1)
    : [null];

  const activeStage = detail.stages.find(
    (s) =>
      s.stage.status === "active" &&
      s.stage.kind !== "screening" &&
      s.stage.kind !== "final",
  );

  if (!activeStage) {
    return (
      <CabinetPage
        title="Assign interviewer"
        subtitle={detail.candidate.name}
      >
        <CaseCard className="p-6 text-sm text-[var(--ink-faint)]">
          There is no interview round awaiting scheduling for this candidate right
          now. Complete TA screening first, or wait for the current round&apos;s
          decision.
          <div className="mt-3">
            <Link
              href={`/evaluate/${id}`}
              className="font-semibold text-[var(--cyan-d)] hover:underline"
            >
              Back to candidate →
            </Link>
          </div>
        </CaseCard>
      </CabinetPage>
    );
  }

  const kind = activeStage.stage.kind as StageKind;
  const [assignable, bookings, load, availRows] = await Promise.all([
    getAssignableUsers(session.user.organizationId, kind),
    getStageBookings(session.user.organizationId),
    getInterviewerLoad(session.user.organizationId),
    db
      .select()
      .from(interviewerAvailability)
      .where(eq(interviewerAvailability.organizationId, session.user.organizationId)),
  ]);

  const availability: Record<
    string,
    { dayOfWeek: number; startMinute: number; endMinute: number }[]
  > = {};
  for (const row of availRows) {
    (availability[row.userId] ??= []).push({
      dayOfWeek: row.dayOfWeek,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    });
  }

  const events = bookings
    .filter((b) => b.dueAt && b.assigneeId && b.status === "active")
    .map((b) => ({
      id: b.id,
      interviewerId: b.assigneeId as string,
      candidateId: b.candidateId,
      candidateName: b.candidateName,
      status: b.status,
      dueAt: typeof b.dueAt === 'string' ? b.dueAt : (b.dueAt as Date).toISOString(),
    }));

  return (
    <CabinetPage
      title="Assign interviewer"
      subtitle={`${activeStage.stage.label} round for ${detail.candidate.name}`}
    >
      <ScheduleClient
        candidate={{
          id: detail.candidate.id,
          name: detail.candidate.name,
          role: roleRow?.name ?? "Role",
          projectName: projectRow?.name ?? undefined,
          status: detail.candidate.status,
        }}
        stage={{ label: activeStage.stage.label, kind, roles: rolesForStageKind(kind) }}
        interviewers={assignable.map((i) => ({
          id: i.id,
          name: i.name,
          email: i.email,
          role: i.role,
          pendingCount: load[i.id] ?? 0,
        }))}
        events={events}
        availability={availability}
        existing={
          activeStage.stage.assignedToId
            ? {
                interviewerId: activeStage.stage.assignedToId,
                dueAt: activeStage.stage.dueAt
                  ? activeStage.stage.dueAt.toISOString()
                  : null,
                handoffNote: activeStage.stage.handoffNote ?? "",
              }
            : null
        }
      />
    </CabinetPage>
  );
}
