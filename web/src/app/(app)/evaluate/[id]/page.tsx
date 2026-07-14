import { requireSession } from "@/lib/auth/rbac";
import { getCandidateDetail, ensureCandidateStages, getCandidateStages } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { EvaluateClient } from "./EvaluateClient";
import { NewCandidateClient } from "./NewCandidateClient";
import { CabinetPage } from "@/components/CabinetPage";
import { db } from "@/lib/db";
import { projects, roles } from "@/lib/db/schema";
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

  await ensureCandidateStages(
    session.user.organizationId,
    id,
    detail.candidate.projectId,
  );
  const stagesRows = await getCandidateStages(id, session.user.organizationId);

  const [roleRow] = detail.candidate.roleId
    ? await db
        .select()
        .from(roles)
        .where(eq(roles.id, detail.candidate.roleId))
        .limit(1)
    : [null];

  const [projectRow] = detail.candidate.projectId
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.id, detail.candidate.projectId))
        .limit(1)
    : [null];

  const canScreen =
    (session.user.role === "admin" || session.user.role === "ta") &&
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
  }));

  const myActiveStageId =
    stagesRows.find(
      (s) =>
        s.stage.assignedToId === session.user.id && s.stage.status === "active",
    )?.stage.id ?? null;

  const canFinalize =
    (session.user.role === "admin" || session.user.role === "ta") &&
    detail.candidate.status === "interview_complete";

  return (
    <EvaluateClient
      candidateId={id}
      candidateName={detail.candidate.name}
      role={roleRow?.name ?? "Role"}
      projectName={projectRow?.name ?? undefined}
      resumeFilename={detail.candidate.resumeFilename ?? undefined}
      resumeText={detail.candidate.resumeText ?? undefined}
      hasResume={Boolean(
        detail.candidate.resumeText?.trim() ||
          detail.candidate.resumeStorageKey,
      )}
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
      userRole={session.user.role}
    />
  );
}
