import { requireSession } from "@/lib/auth/rbac";
import {
  canViewRecruiterPerformance,
  isPanelRole,
} from "@/lib/auth/capabilities";
import {
  getActivityFeed,
  getAiUsageStats,
  getAuditLog,
  getCandidatesForUser,
  getInterviewerCounts,
  getInterviewerHistory,
  getInterviewerLoad,
  getInterviewers,
  getOrgProjects,
  getOrgRoles,
  getOrgTeamCounts,
  getRecruiterPerformance,
  getRoleCandidateStats,
  getStageAssignmentsForUser,
} from "@/lib/db/queries";
import { listBulkJobs } from "@/lib/db/repositories/bulk-job-repository";
import { getCachedUserStats, getCachedStageBookings } from "@/lib/db/cache";
import {
  InterviewerDashboard,
  TeamDashboard,
} from "@/components/dashboard/RoleDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { TaLeadDashboard } from "@/components/dashboard/TaLeadDashboard";
import { buildRecruiterTasks } from "@/lib/recruiter/tasks";

function buildPipelineFunnel(candidates: { status: string }[]) {
  return {
    screening: candidates.filter((c) =>
      ["draft", "screening"].includes(c.status),
    ).length,
    readyToBook: candidates.filter((c) => c.status === "ready_for_interview")
      .length,
    inInterview: candidates.filter((c) =>
      ["assigned", "interview_in_progress"].includes(c.status),
    ).length,
    selected: candidates.filter((c) => c.status === "selected").length,
    rejected: candidates.filter((c) =>
      ["rejected", "screened_rejected"].includes(c.status),
    ).length,
    onHold: candidates.filter((c) =>
      ["hold", "screened_hold"].includes(c.status),
    ).length,
  };
}

export default async function PeoplePage() {
  const session = await requireSession();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isPanelRole(session.user.role)) {
    const [rows, counts, history] = await Promise.all([
      getStageAssignmentsForUser(session.user.organizationId, session.user.id),
      getInterviewerCounts(session.user.organizationId, session.user.id),
      getInterviewerHistory(session.user.organizationId, session.user.id),
    ]);
    const assignments = rows.map((r) => ({
      id: r.stage.id,
      status: r.stage.status,
      label: r.stage.label,
      dueAt: r.stage.dueAt ? r.stage.dueAt.toISOString() : null,
      handoffNote: r.stage.handoffNote,
      roleName: r.roleName ?? null,
      projectName: r.projectName ?? null,
      candidate: { id: r.candidate.id, name: r.candidate.name },
    }));
    const historyRows = history.map((h) => ({
      stageId: h.stageId,
      label: h.label,
      decision: h.decision,
      decidedAt: h.decidedAt ? h.decidedAt.toISOString() : null,
      candidateId: h.candidateId,
      candidateName: h.candidateName,
      roleName: h.roleName ?? null,
      hasReport: Boolean(h.reportKey),
    }));
    return (
      <InterviewerDashboard
        assignments={assignments}
        counts={counts}
        history={historyRows}
        today={today}
        userRole={session.user.role}
      />
    );
  }

  if (session.user.role === "admin") {
    const orgId = session.user.organizationId;
    const [
      candidates,
      stats,
      bookings,
      orgProjects,
      orgRoles,
      roleStats,
      teamCountsRaw,
      interviewersRaw,
      interviewerLoad,
      auditRaw,
      bulkJobsRaw,
      aiStats,
    ] = await Promise.all([
      getCandidatesForUser(orgId, session.user.id, "admin"),
      getCachedUserStats(orgId, session.user.id, "admin"),
      getCachedStageBookings(orgId),
      getOrgProjects(orgId),
      getOrgRoles(orgId),
      getRoleCandidateStats(orgId),
      getOrgTeamCounts(orgId),
      getInterviewers(orgId),
      getInterviewerLoad(orgId),
      getAuditLog(orgId, 5),
      listBulkJobs(orgId, 5),
      getAiUsageStats(orgId),
    ]);

    const setupRequired = orgProjects.length === 0 || orgRoles.length === 0;
    const projectMap = Object.fromEntries(orgProjects.map((p) => [p.id, p.name]));
    const now = Date.now();

    const scheduled = bookings
      .filter(
        (b) =>
          b.dueAt &&
          b.assigneeId &&
          b.status === "active" &&
          new Date(b.dueAt).getTime() >= now,
      )
      .map((b) => ({
        id: b.id,
        candidateId: b.candidateId,
        candidateName: b.candidateName,
        interviewerName: `${b.assigneeName ?? "—"} · ${b.label}`,
        dueAt:
          typeof b.dueAt === "string"
            ? b.dueAt
            : (b.dueAt as Date).toISOString(),
      }))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

    const overdueCount = bookings.filter((b) => {
      if (b.status !== "active") return false;
      const due = b.slaDueAt ?? b.dueAt;
      if (!due) return false;
      return new Date(due).getTime() < now;
    }).length;

    return (
      <AdminDashboard
        today={today}
        stats={stats}
        funnel={buildPipelineFunnel(candidates)}
        openings={orgRoles.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status as "open" | "closed",
          projectName: r.projectId ? (projectMap[r.projectId] ?? null) : null,
        }))}
        roleStats={roleStats}
        teamCounts={{
          admin: teamCountsRaw.admin ?? 0,
          ta: teamCountsRaw.ta ?? 0,
          ta_lead: teamCountsRaw.ta_lead ?? 0,
          interviewer: teamCountsRaw.interviewer ?? 0,
          manager: teamCountsRaw.manager ?? 0,
          hr: teamCountsRaw.hr ?? 0,
        }}
        interviewers={interviewersRaw.map((iv) => ({
          id: iv.id,
          name: iv.name,
          role: iv.role,
          pending: interviewerLoad[iv.id] ?? 0,
        }))}
        overdueCount={overdueCount}
        scheduled={scheduled}
        auditRows={auditRaw.map(({ event, actorName, entityName }) => ({
          id: event.id,
          actorName: actorName ?? null,
          action: event.action,
          payload: (event.payload ?? {}) as Record<string, unknown>,
          entityName: entityName ?? null,
          createdAt: event.createdAt.toISOString(),
        }))}
        aiStats={aiStats}
        bulkJobs={bulkJobsRaw.map((j) => ({
          id: j.id,
          status: j.status,
          totalCount: j.totalCount,
          completedCount: j.completedCount,
          failedCount: j.failedCount,
          createdAt: j.createdAt.toISOString(),
        }))}
        setupRequired={setupRequired}
        projectCount={orgProjects.length}
      />
    );
  }

  if (canViewRecruiterPerformance(session.user.role)) {
    const orgId = session.user.organizationId;
    const [candidates, recruiters, teamCounts] = await Promise.all([
      getCandidatesForUser(orgId, session.user.id, session.user.role),
      getRecruiterPerformance(orgId),
      getOrgTeamCounts(orgId),
    ]);

    return (
      <TaLeadDashboard
        today={today}
        funnel={buildPipelineFunnel(candidates)}
        recruiters={recruiters}
        recruiterCount={(teamCounts.ta ?? 0) + (teamCounts.ta_lead ?? 0)}
      />
    );
  }

  const candidatesPromise = getCandidatesForUser(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  ).catch(() => []);

  const [candidates, stats, feed, bookings, orgProjects, orgRoles] =
    await Promise.all([
      candidatesPromise,
      getCachedUserStats(
        session.user.organizationId,
        session.user.id,
        session.user.role,
      ),
      getActivityFeed(session.user.organizationId, session.user.id, 8),
      getCachedStageBookings(session.user.organizationId),
      getOrgProjects(session.user.organizationId),
      getOrgRoles(session.user.organizationId),
    ]);

  const setupRequired = orgProjects.length === 0 || orgRoles.length === 0;

  // Personal work queue stays on owned candidates even though the org list is shared.
  const owned = candidates.filter((c) => c.createdById === session.user.id);
  const ownedIds = new Set(owned.map((c) => c.id));
  const scheduled = bookings
    .filter(
      (b) =>
        b.dueAt &&
        b.assigneeId &&
        b.status === "active" &&
        ownedIds.has(b.candidateId),
    )
    .map((b) => ({
      id: b.id,
      candidateId: b.candidateId,
      candidateName: b.candidateName,
      interviewerName: `${b.assigneeName ?? "—"} · ${b.label}`,
      status: b.status,
      dueAt:
        typeof b.dueAt === "string"
          ? b.dueAt
          : (b.dueAt as Date).toISOString(),
    }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const todayTasks = buildRecruiterTasks(
    owned.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      updatedAt: c.updatedAt,
    })),
    bookings
      .filter((b) => ownedIds.has(b.candidateId))
      .map((b) => ({
        candidateId: b.candidateId,
        dueAt: b.dueAt,
        slaDueAt: b.slaDueAt,
        label: b.label,
        status: b.status,
      })),
  );

  return (
    <TeamDashboard
      role={session.user.role}
      candidates={owned}
      stats={stats}
      feed={feed}
      today={today}
      scheduled={scheduled}
      todayTasks={todayTasks}
      setupRequired={setupRequired}
    />
  );
}
