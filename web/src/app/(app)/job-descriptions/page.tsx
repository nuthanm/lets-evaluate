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

  const roleOptions = Array.from(
    new Set(roles.map((r) => r.name.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
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
