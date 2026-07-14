import { requireRole } from "@/lib/auth/rbac";
import { CabinetPage } from "@/components/CabinetPage";
import { ImportCandidatesClient } from "./ImportCandidatesClient";

export default async function ImportCandidatesPage() {
  await requireRole(["admin", "ta"]);
  return (
    <CabinetPage title="Import candidates" subtitle="Upload a CSV to create case files in bulk">
      <ImportCandidatesClient />
    </CabinetPage>
  );
}
