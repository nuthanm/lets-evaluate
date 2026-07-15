import { redirect } from "next/navigation";
import { CabinetPage } from "@/components/CabinetPage";
import { canManageSetup, requireSession } from "@/lib/auth/rbac";
import { getOrgOfficeLocations } from "@/lib/db/queries";
import { LocationsClient } from "./LocationsClient";

export default async function OfficeLocationsPage() {
  const session = await requireSession();
  if (!canManageSetup(session.user.role)) redirect("/people");

  const locations = await getOrgOfficeLocations(session.user.organizationId);

  return (
    <CabinetPage
      title="Office locations"
      subtitle="Manage recruiter-selectable office locations used across hiring workflows"
    >
      <LocationsClient
        initialLocations={locations.map((item) => ({ id: item.id, name: item.name }))}
      />
    </CabinetPage>
  );
}
