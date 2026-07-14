import { CabinetShell } from "@/components/CabinetShell";
import { requireSession } from "@/lib/auth/rbac";
import { isPanelRole } from "@/lib/auth/capabilities";
import { getCandidatesForUser } from "@/lib/db/queries";
import { getNavPendingCounts } from "@/lib/recruiter/tasks";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  let navBadges: { candidates?: number; booking?: number } | undefined;
  if (!isPanelRole(session.user.role)) {
    const candidates = await getCandidatesForUser(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    );
    navBadges = getNavPendingCounts(candidates);
  }
  return (
    <CabinetShell
      userName={session.user.name}
      userRole={session.user.role}
      navBadges={navBadges}
    >
      {children}
    </CabinetShell>
  );
}
