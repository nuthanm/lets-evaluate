import { requireRole } from "@/lib/auth/rbac";
import { getPipelineKanbanData } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { PipelineKanbanBoard } from "@/components/workflow/PipelineKanbanBoard";

export default async function PipelinePage() {
  const session = await requireRole(["admin", "ta"]);
  const { columns, cards } = await getPipelineKanbanData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );

  const subtitle =
    session.user.role === "admin"
      ? "Drag candidates across configured stages · full team visibility"
      : "Your candidates · drag to advance stages";

  return (
    <CabinetPage title="Team pipeline" subtitle={subtitle}>
      <PipelineKanbanBoard initialColumns={columns} initialCards={cards} />
    </CabinetPage>
  );
}
