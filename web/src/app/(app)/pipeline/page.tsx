import { requireRole } from "@/lib/auth/rbac";
import { getPipelineKanbanData } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { PipelineKanbanBoard } from "@/components/workflow/PipelineKanbanBoard";

export default async function PipelinePage() {
  const session = await requireRole(["ta"]);
  const { columns, cards } = await getPipelineKanbanData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  return (
    <CabinetPage
      title="Team pipeline"
      subtitle="Your candidates · drag to advance stages"
    >
      <PipelineKanbanBoard initialColumns={columns} initialCards={cards} />
    </CabinetPage>
  );
}
