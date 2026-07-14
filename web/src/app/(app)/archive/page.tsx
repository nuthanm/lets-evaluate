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
      subtitle={`${archived.length} candidate${archived.length !== 1 ? "s" : ""} on record · interviews in all stages`}
      bodyClassName="space-y-5"
    >
      <div className="case-banner">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--cyan)] text-2xl">
          ▤
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold">Evaluation archive</h2>
          <p className="mt-1 text-[13px] text-white/65">
            Every verdict recorded with a complete stage-by-stage audit trail
          </p>
        </div>
      </div>

      <ArchiveClient
        candidates={archived}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </CabinetPage>
  );
}
