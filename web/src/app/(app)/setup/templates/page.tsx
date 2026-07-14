import { requireRole } from "@/lib/auth/rbac";
import { CabinetPage } from "@/components/CabinetPage";
import { MailTemplatesClient } from "./MailTemplatesClient";

export default async function MailTemplatesPage() {
  await requireRole(["admin"]);
  return (
    <CabinetPage
      title="Mail templates"
      subtitle="Edit placeholder-driven emails — copy or open in your mail client, no external provider"
    >
      <MailTemplatesClient />
    </CabinetPage>
  );
}
