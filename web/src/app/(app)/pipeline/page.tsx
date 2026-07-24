import { requireRole } from "@/lib/auth/rbac";
import { getPipelineKanbanData } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { PipelineKanbanBoard } from "@/components/workflow/PipelineKanbanBoard";

export default async function PipelinePage() {
  const session = await requireRole(["ta", "ta_lead"]);
  const { columns, cards } = await getPipelineKanbanData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  return (
    <CabinetPage
      title="Team pipeline"
      subtitle="Org-wide view · only owners can drag stages"
    >
      <PipelineKanbanBoard initialColumns={columns} initialCards={cards} />
    </CabinetPage>
  );
}
