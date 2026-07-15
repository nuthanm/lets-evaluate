import { requireRole } from "@/lib/auth/rbac";
import { CabinetPage } from "@/components/CabinetPage";
import { MailTemplatesClient } from "./MailTemplatesClient";

export default async function MailTemplatesPage() {
  await requireRole(["admin"]);
  return (
    <CabinetPage
      title="Mail templates"
      subtitle="Edit placeholder-driven emails. Branding images are configured in Setup > Mail assets."
    >
      <MailTemplatesClient />
    </CabinetPage>
  );
}
