import { requireSession } from "@/lib/auth/rbac";
import { isPanelRole } from "@/lib/auth/capabilities";
import {
  getActivityFeed,
  getCandidatesForUser,
  getInterviewerCounts,
  getInterviewerHistory,
  getStageAssignmentsForUser,
  getStageBookings,
  getUserStats,
} from "@/lib/db/queries";
import {
  InterviewerDashboard,
  TeamDashboard,
} from "@/components/dashboard/RoleDashboard";
import { buildRecruiterTasks } from "@/lib/recruiter/tasks";

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
      />
    );
  }

  const [candidates, stats, feed, bookings] = await Promise.all([
    getCandidatesForUser(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    ),
    getUserStats(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    ),
    getActivityFeed(
      session.user.organizationId,
      session.user.role === "admin" ? null : session.user.id,
      8,
    ),
    getStageBookings(session.user.organizationId),
  ]);

  // TAs only see interviews for candidates they own; admins see the whole org.
  const ownedIds = new Set(candidates.map((c) => c.id));
  const scheduled = bookings
    .filter(
      (b) =>
        b.dueAt &&
        b.assigneeId &&
        b.status === "active" &&
        (session.user.role === "admin" || ownedIds.has(b.candidateId)),
    )
    .map((b) => ({
      id: b.id,
      candidateId: b.candidateId,
      candidateName: b.candidateName,
      interviewerName: `${b.assigneeName ?? "—"} · ${b.label}`,
      status: b.status,
      dueAt: (b.dueAt as Date).toISOString(),
    }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const todayTasks = buildRecruiterTasks(
    candidates.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      updatedAt: c.updatedAt,
    })),
    bookings
      .filter(
        (b) =>
          session.user.role === "admin" || ownedIds.has(b.candidateId),
      )
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
      candidates={candidates}
      stats={stats}
      feed={feed}
      today={today}
      scheduled={scheduled}
      todayTasks={todayTasks}
    />
  );
}
