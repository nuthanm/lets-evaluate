import { requireRole } from "@/lib/auth/rbac";
import { CabinetPage } from "@/components/CabinetPage";
import { MailAssetsSetupClient } from "./MailAssetsSetupClient";

export default async function MailAssetsPage() {
  await requireRole(["admin"]);

  return (
    <CabinetPage
      title="Mail assets"
      subtitle="Upload reusable logo/header/footer assets and apply them to all or specific templates"
    >
      <MailAssetsSetupClient />
    </CabinetPage>
  );
}
