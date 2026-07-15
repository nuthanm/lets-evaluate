import { CabinetPage } from "@/components/CabinetPage";
import { requireRole } from "@/lib/auth/rbac";
import { getOrgOfficeLocations, getOrgRoles } from "@/lib/db/queries";
import { JobDescriptionClient } from "./JobDescriptionClient";

export default async function JobDescriptionsPage() {
  const session = await requireRole(["admin", "ta"]);
  const [roles, locations] = await Promise.all([
    getOrgRoles(session.user.organizationId),
    getOrgOfficeLocations(session.user.organizationId),
  ]);

  const roleOptions = roles
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      projectId: r.projectId,
      projectIds: (r.projectIds as string[] | null) ?? [],
    }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const locationOptions = Array.from(
    new Set(locations.map((l) => l.name.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <CabinetPage
      title="Job Description Studio"
      subtitle="Generate recruiter-grade KANINI job descriptions with consistent AI output and branded DOCX/PDF downloads"
    >
      <JobDescriptionClient
        roleOptions={roleOptions}
        locationOptions={locationOptions}
      />
    </CabinetPage>
  );
}
