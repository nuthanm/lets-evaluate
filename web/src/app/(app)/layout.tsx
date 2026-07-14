import { CabinetShell } from "@/components/CabinetShell";
import { requireSession } from "@/lib/auth/rbac";
import { isPanelRole } from "@/lib/auth/capabilities";
import { getCachedNavBadges } from "@/lib/db/cache";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  
  let navBadges: { candidates?: number; booking?: number } | undefined;
  if (!isPanelRole(session.user.role)) {
    // Use cached version - revalidates every 60s, no blocking queries on page nav
    navBadges = await getCachedNavBadges(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    );
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
