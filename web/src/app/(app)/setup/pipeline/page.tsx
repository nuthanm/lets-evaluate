import { requireSession, canManageSetup } from "@/lib/auth/rbac";
import { getOrgProjects } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { CabinetPage } from "@/components/CabinetPage";
import { PipelineConfigClient } from "./PipelineConfigClient";

export default async function PipelineSetupPage() {
  const session = await requireSession();
  if (!canManageSetup(session.user.role)) redirect("/people");
  const projects = await getOrgProjects(session.user.organizationId);

  return (
    <CabinetPage
      title="Interview process"
      subtitle="Configure stages visually or as a list — general default and per-project flows"
    >
      <PipelineConfigClient
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </CabinetPage>
  );
}
