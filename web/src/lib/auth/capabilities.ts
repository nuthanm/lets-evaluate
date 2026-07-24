import type { MemberRole } from "@/lib/auth/config";

/** Org-wide candidate visibility (read). */
export function canViewAllCandidates(role: MemberRole) {
  return role === "admin" || role === "ta" || role === "ta_lead";
}

/** Hiring performance / recruiter KPI dashboards. */
export function canViewRecruiterPerformance(role: MemberRole) {
  return role === "admin" || role === "ta_lead";
}

export function canAssignInterviewers(role: MemberRole) {
  return role === "admin" || role === "ta";
}

export function canManageSetup(role: MemberRole) {
  return role === "admin";
}

/** Roles that screen, book, and own candidate pipelines. */
export function isRecruiterRole(role: MemberRole) {
  return role === "ta" || role === "ta_lead";
}

export function isTeamLead(role: MemberRole) {
  return role === "admin" || role === "ta";
}

/** Panel roles conduct assigned interview rounds (they have "My assignments"). */
export function isPanelRole(role: MemberRole) {
  return role === "interviewer" || role === "manager" || role === "hr";
}

/**
 * Who may create/edit/delete a candidate.
 * Admins may mutate any; TAs and TA leads may mutate only candidates they own.
 */
export function canMutateCandidate(
  role: MemberRole,
  userId: string,
  createdById: string | null | undefined,
) {
  if (role === "admin") return true;
  if (role === "ta" || role === "ta_lead") {
    return Boolean(createdById) && createdById === userId;
  }
  return false;
}
