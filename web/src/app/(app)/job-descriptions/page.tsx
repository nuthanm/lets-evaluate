import { CabinetPage } from "@/components/CabinetPage";
import { requireRole } from "@/lib/auth/rbac";
import { getBrand } from "@/lib/brand";
import { getOrgOfficeLocations, getOrgProjects, getOrgRoles } from "@/lib/db/queries";
import { JobDescriptionClient } from "./JobDescriptionClient";

export default async function JobDescriptionsPage() {
  const brand = getBrand();
  const session = await requireRole(["admin", "ta"]);
  const [roles, locations, orgProjects] = await Promise.all([
    getOrgRoles(session.user.organizationId),
    getOrgOfficeLocations(session.user.organizationId),
    getOrgProjects(session.user.organizationId),
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
  const projectOptions = orgProjects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <CabinetPage
      title="Job Description Studio"
      subtitle={`Generate recruiter-grade ${brand.orgName} job descriptions with consistent AI output and branded DOCX/PDF downloads`}
    >
      <JobDescriptionClient
        roleOptions={roleOptions}
        locationOptions={locationOptions}
        projectOptions={projectOptions}
      />
    </CabinetPage>
  );
}
