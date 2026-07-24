import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { MemberRole } from "@/lib/auth/config";

export {
  canViewAllCandidates,
  canViewRecruiterPerformance,
  canAssignInterviewers,
  canManageSetup,
  canMutateCandidate,
  isRecruiterRole,
  isTeamLead,
  isPanelRole,
} from "@/lib/auth/capabilities";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowed: MemberRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/people");
  }
  return session;
}
