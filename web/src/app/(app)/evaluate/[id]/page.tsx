import { requireSession } from "@/lib/auth/rbac";
import { canMutateCandidate, isRecruiterRole } from "@/lib/auth/capabilities";
import { getCandidateDetail, ensureCandidateStages, getCandidateStages } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { EvaluateClient } from "./EvaluateClient";
import { NewCandidateClient } from "./NewCandidateClient";
import { CabinetPage } from "@/components/CabinetPage";
import { db } from "@/lib/db";
import { candidates, projects, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ResumeMetrics } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

export default async function EvaluatePage({ params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  if (id === "new") {
    return (
      <CabinetPage
        title="New case file"
        subtitle="Upload a resume and start TA screening"
        bodyClassName="case-fade-in"
      >
        <NewCandidateClient />
      </CabinetPage>
    );
  }

  const detail = await getCandidateDetail(session.user.organizationId, id);
  if (!detail) notFound();

  // ensureCandidateStages only needs to check/insert stage rows; the role
  // and project lookups are independent of it, so run them all together
  // instead of one after another.
  const [, [roleRow], [projectRow]] = await Promise.all([
    ensureCandidateStages(
      session.user.organizationId,
      id,
      detail.candidate.projectId,
    ),
    detail.candidate.roleId
      ? db.select().from(roles).where(eq(roles.id, detail.candidate.roleId)).limit(1)
      : Promise.resolve([null]),
    detail.candidate.projectId
      ? db.select().from(projects).where(eq(projects.id, detail.candidate.projectId)).limit(1)
      : Promise.resolve([null]),
  ]);

  // detail.stages was fetched before ensureCandidateStages ran, so it's only
  // stale the very first time a candidate's stages are materialized.
  const stagesRows =
    detail.stages.length > 0
      ? detail.stages
      : await getCandidateStages(id, session.user.organizationId);

  const ownsCandidate = canMutateCandidate(
    session.user.role,
    session.user.id,
    detail.candidate.createdById,
  );

  const canScreen =
    (session.user.role === "admin" ||
      (isRecruiterRole(session.user.role) && ownsCandidate)) &&
    !["selected", "rejected", "interview_complete"].includes(
      detail.candidate.status,
    );

  const stages = stagesRows.map((s) => ({
    id: s.stage.id,
    label: s.stage.label,
    kind: s.stage.kind,
    position: s.stage.position,
    status: s.stage.status,
    assigneeName: s.assigneeName ?? null,
    dueAt: s.stage.dueAt ? s.stage.dueAt.toISOString() : null,
    decision: s.stage.decision ?? null,
    comments: s.stage.comments ?? null,
    hasReport: Boolean(s.stage.reportKey),
    handoffNote: s.stage.handoffNote ?? null,
  }));

  const myActiveStageId =
    stagesRows.find(
      (s) =>
        s.stage.assignedToId === session.user.id && s.stage.status === "active",
    )?.stage.id ?? null;

  if (
    myActiveStageId &&
    detail.candidate.status === "assigned"
  ) {
    await db
      .update(candidates)
      .set({ status: "interview_in_progress", updatedAt: new Date() })
      .where(eq(candidates.id, id));
    detail.candidate.status = "interview_in_progress";
  }

  // roleRow already carries the role's status, so there's no need for a
  // second query (getRoleOpeningStatus) just to answer "is it open?".
  const roleOpen = !detail.candidate.roleId || !roleRow || roleRow.status === "open";

  const canFinalize =
    (session.user.role === "admin" ||
      (isRecruiterRole(session.user.role) && ownsCandidate)) &&
    detail.candidate.status === "interview_complete";

  return (
    <EvaluateClient
      candidateId={id}
      candidateName={detail.candidate.name}
      role={roleRow?.name ?? "Role"}
      projectName={projectRow?.name ?? undefined}
      resumeFilename={detail.candidate.resumeFilename ?? undefined}
      hasResume={Boolean(
        detail.candidate.resumeText?.trim() ||
          detail.candidate.resumeStorageKey,
      )}
      hasStoredResume={Boolean(detail.candidate.resumeStorageKey)}
      canScreen={canScreen && !detail.review}
      initialMetrics={
        (detail.screening?.metrics as Partial<ResumeMetrics> | undefined) ??
        undefined
      }
      screeningComments={detail.screening?.comments ?? undefined}
      stages={stages}
      candidateStatus={detail.candidate.status}
      candidateEmail={detail.candidate.email ?? undefined}
      canFinalize={canFinalize}
      myActiveStageId={myActiveStageId}
      viewerRole={session.user.role}
      roleOpen={roleOpen}
      initialQuestions={
        detail.screening
          ? {
              standard: (detail.screening.standardQuestions as unknown[]) ?? [],
              resume: (detail.screening.resumeQuestions as unknown[]) ?? [],
            }
          : undefined
      }
    />
  );
}
