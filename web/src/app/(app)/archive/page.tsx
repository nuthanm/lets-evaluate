import { requireSession } from "@/lib/auth/rbac";
import { getArchivedCandidatesWithStages } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { ArchiveClient } from "./ArchiveClient";

export default async function ArchivePage() {
  const session = await requireSession();
  const archived = await getArchivedCandidatesWithStages(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  return (
    <CabinetPage
      title="Closed case files"
      subtitle={`${archived.length} candidate${archived.length !== 1 ? "s" : ""} on record`}
      bodyClassName="space-y-5"
    >
      <ArchiveClient
        candidates={archived}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </CabinetPage>
  );
}
