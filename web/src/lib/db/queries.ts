import { db } from "@/lib/db";
import {
  candidates,
  officeLocations,
  projects,
  roles,
  questions,
  screenings,
  interviewAssignments,
  interviewReviews,
  evaluationEvents,
  organizationMembers,
  users,
  pipelineStages,
  candidateStages,
  interviewerAvailability,
  aiAnalysisUsage,
  screeningFeedback,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { MemberRole } from "@/lib/auth/config";

export type StageKind =
  | "screening"
  | "technical"
  | "manager"
  | "hr"
  | "final"
  | "custom";

export type StageTemplateItem = { label: string; kind: StageKind };

/** The organization's out-of-the-box interview process. */
export const DEFAULT_STAGE_TEMPLATE: StageTemplateItem[] = [
  { label: "Screening", kind: "screening" },
  { label: "First level technical", kind: "technical" },
  { label: "Second level technical", kind: "technical" },
  { label: "Manager", kind: "manager" },
];

/** Which member roles may be booked as the assignee for a given stage kind. */
export function rolesForStageKind(kind: StageKind): MemberRole[] {
  if (kind === "manager") return ["manager"];
  // HR rounds are owned by HR panelists only.
  if (kind === "hr") return ["hr"];
  if (kind === "technical") return ["interviewer"];
  return ["interviewer"];
}

export async function getOrgProjects(organizationId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(projects.name);
}

export async function getOrgOfficeLocations(organizationId: string) {
  return db
    .select()
    .from(officeLocations)
    .where(eq(officeLocations.organizationId, organizationId))
    .orderBy(asc(officeLocations.name));
}

export async function getOrgRoles(organizationId: string, projectId?: string) {
  const rows = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId));
  if (!projectId) return rows;
  return rows.filter(
    (r) =>
      r.projectId === projectId ||
      (r.projectIds as string[] | null)?.includes(projectId),
  );
}

export type RoleCandidateStats = {
  total: number;
  selected: number;
  rejected: number;
  hold: number;
  inProgress: number;
};

const emptyRoleStats = (): RoleCandidateStats => ({
  total: 0,
  selected: 0,
  rejected: 0,
  hold: 0,
  inProgress: 0,
});

/**
 * Candidate counts bucketed per role for the openings dashboard.
 * Returns a map keyed by roleId. Candidates with no role are ignored.
 */
export async function getRoleCandidateStats(
  organizationId: string,
): Promise<Record<string, RoleCandidateStats>> {
  const rows = await db
    .select({ roleId: candidates.roleId, status: candidates.status })
    .from(candidates)
    .where(eq(candidates.organizationId, organizationId));

  const byRole: Record<string, RoleCandidateStats> = {};
  for (const row of rows) {
    if (!row.roleId) continue;
    const stats = (byRole[row.roleId] ??= emptyRoleStats());
    stats.total += 1;
    if (row.status === "selected") {
      stats.selected += 1;
    } else if (row.status === "rejected" || row.status === "screened_rejected") {
      stats.rejected += 1;
    } else if (row.status === "hold" || row.status === "screened_hold") {
      stats.hold += 1;
    } else {
      stats.inProgress += 1;
    }
  }
  return byRole;
}

/**
 * Question library rows visible to a user: everything shared with the whole org
 * ("org" visibility) plus the user's own private questions. Optionally filtered
 * by role.
 */
export async function getOrgQuestions(
  organizationId: string,
  roleId?: string,
  userId?: string,
) {
  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.organizationId, organizationId))
    .orderBy(desc(questions.createdAt));

  const visible = rows.filter(
    (q) => q.visibility !== "private" || (userId && q.createdById === userId),
  );

  if (!roleId) return visible;
  return visible.filter(
    (q) =>
      q.roleId === roleId ||
      (q.roleIds as string[] | null)?.includes(roleId),
  );
}

export async function getCandidatesForUser(
  organizationId: string,
  userId: string,
  role: MemberRole,
) {
  if (role === "admin") {
    return db
      .select()
      .from(candidates)
      .where(eq(candidates.organizationId, organizationId))
      .orderBy(desc(candidates.updatedAt));
  }

  if (role === "ta") {
    return db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.organizationId, organizationId),
          eq(candidates.createdById, userId),
        ),
      )
      .orderBy(desc(candidates.updatedAt));
  }

  const assignedIds = await db
    .select({ candidateId: candidateStages.candidateId })
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        eq(candidateStages.assignedToId, userId),
      ),
    );

  const ids = [...new Set(assignedIds.map((a) => a.candidateId))];
  if (!ids.length) return [];

  return db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.organizationId, organizationId),
        inArray(candidates.id, ids),
      ),
    )
    .orderBy(desc(candidates.updatedAt));
}

export type CandidateGridRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  projectId: string | null;
  roleId: string | null;
  projectName: string | null;
  roleName: string | null;
  roleLevel: string | null;
  resumeFilename: string | null;
  hasResume: boolean;
  techScore: number | null;
  screeningDecision: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Candidate rows enriched with project / role names and screening score for the
 * recruiter grid. Applies the same RBAC scoping as getCandidatesForUser:
 * admins see the whole org, TAs see their own candidates, interviewers see assigned.
 */
export async function getCandidatesGridForUser(
  organizationId: string,
  userId: string,
  role: MemberRole,
): Promise<CandidateGridRow[]> {
  const columns = {
    id: candidates.id,
    name: candidates.name,
    email: candidates.email,
    status: candidates.status,
    projectId: candidates.projectId,
    roleId: candidates.roleId,
    projectName: projects.name,
    roleName: roles.name,
    roleLevel: roles.level,
    resumeFilename: candidates.resumeFilename,
    resumeStorageKey: candidates.resumeStorageKey,
    metrics: screenings.metrics,
    screeningDecision: screenings.decision,
    createdAt: candidates.createdAt,
    updatedAt: candidates.updatedAt,
  };

  let condition = eq(candidates.organizationId, organizationId);

  if (role === "ta") {
    condition = and(condition, eq(candidates.createdById, userId))!;
  } else if (role !== "admin") {
    const assignedIds = await db
      .select({ candidateId: candidateStages.candidateId })
      .from(candidateStages)
      .where(
        and(
          eq(candidateStages.organizationId, organizationId),
          eq(candidateStages.assignedToId, userId),
        ),
      );
    const ids = [...new Set(assignedIds.map((a) => a.candidateId))];
    if (!ids.length) return [];
    condition = and(condition, inArray(candidates.id, ids))!;
  }

  const rows = await db
    .select(columns)
    .from(candidates)
    .leftJoin(projects, eq(candidates.projectId, projects.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .leftJoin(screenings, eq(screenings.candidateId, candidates.id))
    .where(condition)
    .orderBy(desc(candidates.updatedAt));

  return rows.map((r) => {
    const rawScore = (r.metrics as Record<string, unknown> | null)
      ?.tech_match_score;
    const techScore =
      typeof rawScore === "number" && Number.isFinite(rawScore)
        ? Math.round(rawScore)
        : null;
    return {
      id: r.id,
      name: r.name,
      email: r.email ?? "",
      status: r.status,
      projectId: r.projectId,
      roleId: r.roleId,
      projectName: r.projectName ?? null,
      roleName: r.roleName ?? null,
      roleLevel: r.roleLevel ?? null,
      resumeFilename: r.resumeFilename ?? null,
      hasResume: Boolean(r.resumeStorageKey),
      techScore,
      screeningDecision: r.screeningDecision ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export type ArchivedCandidateRow = CandidateGridRow & {
  stages: Array<{
    id: string;
    label: string;
    kind: string;
    status: string;
    position: number;
    decision: string | null;
    reportKey: string | null;
    reportFilename: string | null;
    assignedToId: string | null;
    decidedById: string | null;
    decidedAt: string | null;
    assigneeName: string | null;
  }>;
};

/**
 * Archived candidates the current user is allowed to see, with all their
 * interview stages attached. Uses stage-based scoping for interviewers so
 * candidates whose stages were assigned directly (without a booking record)
 * are always visible.
 */
export async function getArchivedCandidatesWithStages(
  organizationId: string,
  userId: string,
  role: MemberRole,
): Promise<ArchivedCandidateRow[]> {
  const ARCHIVED_STATUSES = [
    // terminal verdicts
    "selected", "rejected", "hold", "screened_rejected",
    // all rounds done, awaiting final confirmation
    "interview_complete",
    // actively moving through interview rounds
    "ready_for_interview", "assigned", "interview_in_progress",
  ];

  // Determine the candidate IDs visible to this user.
  // • admin  → all candidates in the org (candidateIds = null)
  // • ta     → candidates they created
  // • others → candidates where they appear in candidateStages
  //            (assignedToId OR decidedById — more reliable than interviewAssignments)
  let candidateIds: string[] | null = null;

  if (role === "ta") {
    const rows = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.organizationId, organizationId),
          eq(candidates.createdById, userId),
        ),
      );
    candidateIds = rows.map((r) => r.id);
  } else if (role !== "admin") {
    const stageRows = await db
      .select({ candidateId: candidateStages.candidateId })
      .from(candidateStages)
      .where(
        and(
          eq(candidateStages.organizationId, organizationId),
          or(
            eq(candidateStages.assignedToId, userId),
            eq(candidateStages.decidedById, userId),
          ),
        ),
      );
    candidateIds = [...new Set(stageRows.map((r) => r.candidateId))];
  }

  if (candidateIds !== null && !candidateIds.length) return [];

  const baseWhere = eq(candidates.organizationId, organizationId);
  const scopedWhere =
    candidateIds === null
      ? baseWhere
      : and(baseWhere, inArray(candidates.id, candidateIds));

  const candidateRows = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      status: candidates.status,
      projectId: candidates.projectId,
      roleId: candidates.roleId,
      projectName: projects.name,
      roleName: roles.name,
      roleLevel: roles.level,
      resumeFilename: candidates.resumeFilename,
      resumeStorageKey: candidates.resumeStorageKey,
      metrics: screenings.metrics,
      screeningDecision: screenings.decision,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
    })
    .from(candidates)
    .leftJoin(projects, eq(candidates.projectId, projects.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .leftJoin(screenings, eq(screenings.candidateId, candidates.id))
    .where(scopedWhere)
    .orderBy(desc(candidates.updatedAt));

  const archived = candidateRows.filter((r) =>
    ARCHIVED_STATUSES.includes(r.status),
  );
  if (!archived.length) return [];

  const ids = archived.map((r) => r.id);
  const stageRows = await db
    .select({
      id: candidateStages.id,
      candidateId: candidateStages.candidateId,
      label: candidateStages.label,
      kind: candidateStages.kind,
      status: candidateStages.status,
      position: candidateStages.position,
      decision: candidateStages.decision,
      reportKey: candidateStages.reportKey,
      reportFilename: candidateStages.reportFilename,
      assignedToId: candidateStages.assignedToId,
      decidedById: candidateStages.decidedById,
      decidedAt: candidateStages.decidedAt,
      assigneeName: users.name,
    })
    .from(candidateStages)
    .leftJoin(users, eq(candidateStages.assignedToId, users.id))
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        inArray(candidateStages.candidateId, ids),
      ),
    )
    .orderBy(asc(candidateStages.position));

  const byCandidate = new Map<string, typeof stageRows>();
  for (const s of stageRows) {
    if (!byCandidate.has(s.candidateId)) byCandidate.set(s.candidateId, []);
    byCandidate.get(s.candidateId)!.push(s);
  }

  return archived.map((r) => {
    const rawScore = (r.metrics as Record<string, unknown> | null)
      ?.tech_match_score;
    const techScore =
      typeof rawScore === "number" && Number.isFinite(rawScore)
        ? Math.round(rawScore)
        : null;
    return {
      id: r.id,
      name: r.name,
      email: r.email ?? "",
      status: r.status,
      projectId: r.projectId,
      roleId: r.roleId,
      projectName: r.projectName ?? null,
      roleName: r.roleName ?? null,
      roleLevel: r.roleLevel ?? null,
      resumeFilename: r.resumeFilename ?? null,
      hasResume: Boolean(r.resumeStorageKey),
      techScore,
      screeningDecision: r.screeningDecision ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      stages: (byCandidate.get(r.id) ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        status: s.status,
        position: s.position,
        decision: s.decision ?? null,
        reportKey: s.reportKey ?? null,
        reportFilename: s.reportFilename ?? null,
        assignedToId: s.assignedToId ?? null,
        decidedById: s.decidedById ?? null,
        decidedAt: s.decidedAt?.toISOString() ?? null,
        assigneeName: s.assigneeName ?? null,
      })),
    };
  });
}

export async function getCandidateDetail(
  organizationId: string,
  candidateId: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.id, candidateId),
        eq(candidates.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!candidate) return null;

  // These four queries are independent of each other — run them in
  // parallel instead of awaiting one round-trip at a time.
  const [[screening], [review], assignments, stages] = await Promise.all([
    db
      .select()
      .from(screenings)
      .where(eq(screenings.candidateId, candidateId))
      .limit(1),
    db
      .select()
      .from(interviewReviews)
      .where(eq(interviewReviews.candidateId, candidateId))
      .limit(1),
    db
      .select({
        assignment: interviewAssignments,
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(interviewAssignments)
      .innerJoin(users, eq(interviewAssignments.assignedToId, users.id))
      .where(eq(interviewAssignments.candidateId, candidateId)),
    getCandidateStages(candidateId, organizationId),
  ]);

  return { candidate, screening, review, assignments, stages };
}

export async function getActivityFeed(
  organizationId: string,
  actorId?: string | null,
  limit = 20,
) {
  return db
    .select({
      event: evaluationEvents,
      actorName: users.name,
    })
    .from(evaluationEvents)
    .leftJoin(users, eq(evaluationEvents.actorId, users.id))
    .where(
      and(
        eq(evaluationEvents.organizationId, organizationId),
        actorId ? eq(evaluationEvents.actorId, actorId) : undefined,
      ),
    )
    .orderBy(desc(evaluationEvents.createdAt))
    .limit(limit);
}

export async function getInterviewers(organizationId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
      lastActiveAt: organizationMembers.lastActiveAt,
      deletedAt: organizationMembers.deletedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt),
        inArray(organizationMembers.role, ["interviewer", "manager", "hr"]),
      ),
    );
}

/**
 * All interview bookings for the org, flattened for the scheduling calendar.
 * Includes who is interviewing, for which candidate, when, and the state.
 */
export async function getInterviewerBookings(organizationId: string) {
  return db
    .select({
      id: interviewAssignments.id,
      interviewerId: interviewAssignments.assignedToId,
      interviewerName: users.name,
      candidateId: interviewAssignments.candidateId,
      candidateName: candidates.name,
      status: interviewAssignments.status,
      dueAt: interviewAssignments.dueAt,
    })
    .from(interviewAssignments)
    .innerJoin(users, eq(interviewAssignments.assignedToId, users.id))
    .innerJoin(candidates, eq(interviewAssignments.candidateId, candidates.id))
    .where(eq(interviewAssignments.organizationId, organizationId))
    .orderBy(desc(interviewAssignments.dueAt));
}

export async function getBookableCandidates(organizationId: string) {
  return db
    .select({
      candidate: candidates,
      metrics: screenings.metrics,
      decision: screenings.decision,
      roleStatus: roles.status,
      roleName: roles.name,
    })
    .from(candidates)
    .leftJoin(screenings, eq(screenings.candidateId, candidates.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .where(
      and(
        eq(candidates.organizationId, organizationId),
        inArray(candidates.status, ["ready_for_interview", "assigned"]),
      ),
    )
    .orderBy(desc(candidates.updatedAt));
}

export async function getOrgAssignments(organizationId: string) {
  return db
    .select({
      assignment: interviewAssignments,
      candidate: candidates,
      assigneeName: users.name,
      assigneeId: users.id,
    })
    .from(interviewAssignments)
    .innerJoin(candidates, eq(interviewAssignments.candidateId, candidates.id))
    .innerJoin(users, eq(interviewAssignments.assignedToId, users.id))
    .where(eq(interviewAssignments.organizationId, organizationId))
    .orderBy(desc(interviewAssignments.createdAt));
}

export async function getUserStats(
  organizationId: string,
  userId: string,
  role: MemberRole,
) {
  const base = eq(candidates.organizationId, organizationId);
  const all = await db.select().from(candidates).where(base);

  const mine = all.filter((c) => c.createdById === userId);
  const scoped = role === "admin" ? all : mine;
  const terminal = (list: typeof all, status: string) =>
    list.filter((c) => c.status === status).length;

  return {
    total: scoped.length,
    selected: terminal(scoped, "selected"),
    rejected: terminal(scoped, "rejected"),
    hold: terminal(scoped, "hold"),
    inProgress: scoped.filter((c) =>
      ["screening", "assigned", "interview_in_progress", "ready_for_interview"].includes(
        c.status,
      ),
    ).length,
  };
}

export async function getAssignmentsForUser(
  organizationId: string,
  userId: string,
) {
  return db
    .select({
      assignment: interviewAssignments,
      candidate: candidates,
    })
    .from(interviewAssignments)
    .innerJoin(candidates, eq(interviewAssignments.candidateId, candidates.id))
    .where(
      and(
        eq(interviewAssignments.organizationId, organizationId),
        eq(interviewAssignments.assignedToId, userId),
      ),
    )
    .orderBy(desc(interviewAssignments.createdAt));
}

/* ─────────────────────── Configurable interview pipeline ─────────────────────── */

/**
 * The stage template that applies to a project: its own override rows if it has
 * any, otherwise the org general default, otherwise the built-in default.
 */
export async function getEffectiveStageTemplate(
  organizationId: string,
  projectId?: string | null,
): Promise<StageTemplateItem[]> {
  if (projectId) {
    const projectRows = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.organizationId, organizationId),
          eq(pipelineStages.projectId, projectId),
        ),
      )
      .orderBy(asc(pipelineStages.position));
    if (projectRows.length) {
      return projectRows.map((r) => ({ label: r.label, kind: r.kind }));
    }
  }

  const generalRows = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organizationId),
        isNull(pipelineStages.projectId),
      ),
    )
    .orderBy(asc(pipelineStages.position));
  if (generalRows.length) {
    return generalRows.map((r) => ({ label: r.label, kind: r.kind }));
  }

  return DEFAULT_STAGE_TEMPLATE;
}

/** Raw stage rows for a scope (general when projectId is null). */
export async function getPipelineStageRows(
  organizationId: string,
  projectId: string | null,
) {
  return db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organizationId),
        projectId
          ? eq(pipelineStages.projectId, projectId)
          : isNull(pipelineStages.projectId),
      ),
    )
    .orderBy(asc(pipelineStages.position));
}

/** Replace the configured stages for a scope with a new ordered list. */
export async function savePipelineStages(
  organizationId: string,
  projectId: string | null,
  stages: StageTemplateItem[],
) {
  await db
    .delete(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organizationId),
        projectId
          ? eq(pipelineStages.projectId, projectId)
          : isNull(pipelineStages.projectId),
      ),
    );
  if (!stages.length) return;
  await db.insert(pipelineStages).values(
    stages.map((s, i) => ({
      id: uuid(),
      organizationId,
      projectId,
      label: s.label,
      kind: s.kind,
      position: i,
    })),
  );
}

/**
 * Materialize a candidate's stage rows from their project's flow if they don't
 * already exist. The first stage (screening) starts active.
 */
export async function ensureCandidateStages(
  organizationId: string,
  candidateId: string,
  projectId?: string | null,
) {
  const [existing] = await db
    .select({ id: candidateStages.id })
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.candidateId, candidateId),
        eq(candidateStages.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (existing) return;

  const template = await getEffectiveStageTemplate(organizationId, projectId);
  await db.insert(candidateStages).values(
    template.map((s, i) => ({
      id: uuid(),
      organizationId,
      candidateId,
      label: s.label,
      kind: s.kind,
      position: i,
      status: (i === 0 ? "active" : "pending") as
        | "active"
        | "pending",
    })),
  );
}

export async function getCandidateStages(candidateId: string, organizationId?: string) {
  return db
    .select({
      stage: candidateStages,
      assigneeName: users.name,
      assigneeEmail: users.email,
    })
    .from(candidateStages)
    .leftJoin(users, eq(candidateStages.assignedToId, users.id))
    .where(
      organizationId
        ? and(
            eq(candidateStages.candidateId, candidateId),
            eq(candidateStages.organizationId, organizationId),
          )
        : eq(candidateStages.candidateId, candidateId),
    )
    .orderBy(asc(candidateStages.position));
}

/** Users that may be assigned to a stage of the given kind. */
export async function getAssignableUsers(
  organizationId: string,
  kind: StageKind,
) {
  const allowed = rolesForStageKind(kind);
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt),
        inArray(organizationMembers.role, allowed),
      ),
    )
    .orderBy(asc(users.name));
}

/** All scheduled/active stage bookings for the calendar and dashboards. */
export async function getStageBookings(organizationId: string) {
  return db
    .select({
      id: candidateStages.id,
      candidateId: candidateStages.candidateId,
      candidateName: candidates.name,
      label: candidateStages.label,
      kind: candidateStages.kind,
      status: candidateStages.status,
      dueAt: candidateStages.dueAt,
      slaDueAt: candidateStages.slaDueAt,
      assigneeId: candidateStages.assignedToId,
      assigneeName: users.name,
    })
    .from(candidateStages)
    .innerJoin(candidates, eq(candidateStages.candidateId, candidates.id))
    .leftJoin(users, eq(candidateStages.assignedToId, users.id))
    .where(eq(candidateStages.organizationId, organizationId))
    .orderBy(desc(candidateStages.dueAt));
}

/**
 * Rounds a panel member has decided (their interview history / exports),
 * newest first, enriched with candidate and role/project names.
 */
export async function getInterviewerHistory(
  organizationId: string,
  userId: string,
) {
  return db
    .select({
      stageId: candidateStages.id,
      label: candidateStages.label,
      kind: candidateStages.kind,
      decision: candidateStages.decision,
      decidedAt: candidateStages.decidedAt,
      comments: candidateStages.comments,
      reportKey: candidateStages.reportKey,
      reportFilename: candidateStages.reportFilename,
      candidateId: candidateStages.candidateId,
      candidateName: candidates.name,
      roleName: roles.name,
      projectName: projects.name,
    })
    .from(candidateStages)
    .innerJoin(candidates, eq(candidateStages.candidateId, candidates.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .leftJoin(projects, eq(candidates.projectId, projects.id))
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        eq(candidateStages.decidedById, userId),
      ),
    )
    .orderBy(desc(candidateStages.decidedAt));
}

export type PeriodCounts = {
  today: number;
  month: number;
  quarter: number;
  year: number;
  total: number;
};

/** How many interviews a panel member has completed across time windows. */
export async function getInterviewerCounts(
  organizationId: string,
  userId: string,
): Promise<PeriodCounts> {
  const rows = await db
    .select({ decidedAt: candidateStages.decidedAt })
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        eq(candidateStages.decidedById, userId),
      ),
    );

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfQuarter = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
  );
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const counts: PeriodCounts = {
    today: 0,
    month: 0,
    quarter: 0,
    year: 0,
    total: 0,
  };
  for (const r of rows) {
    if (!r.decidedAt) continue;
    const d = new Date(r.decidedAt);
    counts.total += 1;
    if (d >= startOfYear) counts.year += 1;
    if (d >= startOfQuarter) counts.quarter += 1;
    if (d >= startOfMonth) counts.month += 1;
    if (d >= startOfDay) counts.today += 1;
  }
  return counts;
}

/** Active stages assigned to a specific panel member (their queue). */
export async function getStageAssignmentsForUser(
  organizationId: string,
  userId: string,
) {
  return db
    .select({
      stage: candidateStages,
      candidate: candidates,
      roleName: roles.name,
      projectName: projects.name,
    })
    .from(candidateStages)
    .innerJoin(candidates, eq(candidateStages.candidateId, candidates.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .leftJoin(projects, eq(candidates.projectId, projects.id))
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        eq(candidateStages.assignedToId, userId),
      ),
    )
    .orderBy(asc(candidateStages.dueAt));
}

/** Pending active stages per assignee (panel load). */
export async function getInterviewerLoad(organizationId: string) {
  const rows = await db
    .select({
      userId: candidateStages.assignedToId,
      status: candidateStages.status,
    })
    .from(candidateStages)
    .where(
      and(
        eq(candidateStages.organizationId, organizationId),
        eq(candidateStages.status, "active"),
      ),
    );

  const load: Record<string, number> = {};
  for (const r of rows) {
    if (!r.userId) continue;
    load[r.userId] = (load[r.userId] ?? 0) + 1;
  }
  return load;
}

export async function getAvailabilityForUser(
  organizationId: string,
  userId: string,
) {
  return db
    .select()
    .from(interviewerAvailability)
    .where(
      and(
        eq(interviewerAvailability.organizationId, organizationId),
        eq(interviewerAvailability.userId, userId),
      ),
    )
    .orderBy(
      interviewerAvailability.dayOfWeek,
      interviewerAvailability.startMinute,
    );
}

export async function saveAvailabilityForUser(
  organizationId: string,
  userId: string,
  windows: { dayOfWeek: number; startMinute: number; endMinute: number }[],
) {
  await db
    .delete(interviewerAvailability)
    .where(
      and(
        eq(interviewerAvailability.organizationId, organizationId),
        eq(interviewerAvailability.userId, userId),
      ),
    );
  if (!windows.length) return;
  await db.insert(interviewerAvailability).values(
    windows.map((w) => ({
      id: uuid(),
      organizationId,
      userId,
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
  );
}

export async function getAuditLog(
  organizationId: string,
  limit = 100,
  offset = 0,
) {
  return db
    .select({
      event: evaluationEvents,
      actorName: users.name,
      entityName: candidates.name,
    })
    .from(evaluationEvents)
    .leftJoin(users, eq(evaluationEvents.actorId, users.id))
    .leftJoin(
      candidates,
      and(
        eq(evaluationEvents.entityType, "candidate"),
        eq(evaluationEvents.entityId, candidates.id),
      ),
    )
    .where(eq(evaluationEvents.organizationId, organizationId))
    .orderBy(desc(evaluationEvents.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Active org members grouped by role (excludes soft-deleted). */
export async function getOrgTeamCounts(organizationId: string) {
  const rows = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt),
      ),
    );

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.role] = (counts[row.role] ?? 0) + 1;
  }
  return counts;
}

/** AI screening usage and feedback metrics for the last 30 days. */
export async function getAiUsageStats(organizationId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usageRows = await db
    .select()
    .from(aiAnalysisUsage)
    .where(
      and(
        eq(aiAnalysisUsage.organizationId, organizationId),
        gte(aiAnalysisUsage.createdAt, since),
      ),
    );

  let totalAnalyses = 0;
  let reusedAnalyses = 0;
  let estimatedCostUsd = 0;
  for (const row of usageRows) {
    totalAnalyses += 1;
    if (row.reusedAnalysis) reusedAnalyses += 1;
    estimatedCostUsd += Number(row.estimatedCostUsd || "0") || 0;
  }

  const feedbackRows = await db
    .select()
    .from(screeningFeedback)
    .where(eq(screeningFeedback.organizationId, organizationId));

  let comparableRows = 0;
  let recommendationAgreed = 0;
  for (const row of feedbackRows) {
    const model = (row.modelRecommendation || "").toLowerCase();
    const recruiter = (row.recruiterDecision || "").toLowerCase();
    if (model && recruiter) {
      comparableRows += 1;
      if (model === recruiter) recommendationAgreed += 1;
    }
  }

  return {
    totalAnalyses,
    cacheHitRatePct: totalAnalyses
      ? Math.round((reusedAnalyses / totalAnalyses) * 10000) / 100
      : 0,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
    recommendationAgreementPct: comparableRows
      ? Math.round((recommendationAgreed / comparableRows) * 10000) / 100
      : 0,
  };
}
