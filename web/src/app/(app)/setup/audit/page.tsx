import { requireRole } from "@/lib/auth/rbac";
import { getAuditLog } from "@/lib/db/queries";
import { CabinetPage, CasePanel } from "@/components/CabinetPage";
import { AuditLogClient } from "./AuditLogClient";

export default async function AuditPage() {
  const session = await requireRole(["admin", "ta"]);
  const isAdmin = session.user.role === "admin";
  const rawRows = await getAuditLog(
    session.user.organizationId,
    200,
    0,
    isAdmin ? null : session.user.id,
  );

  const rows = rawRows.map(({ event, actorName, entityName }) => ({
    id: event.id,
    actorName: actorName ?? null,
    action: event.action,
    payload: (event.payload ?? {}) as Record<string, unknown>,
    entityType: event.entityType,
    entityId: event.entityId,
    entityName: entityName ?? null,
    createdAt: event.createdAt.toISOString(),
  }));

  return (
    <CabinetPage
      title="Audit log"
      subtitle={
        isAdmin
          ? "Who changed what, and when — across the hiring workflow"
          : "Your actions across the hiring workflow"
      }
    >
      <CasePanel title={isAdmin ? "Recent events" : "Your recent events"}>
        <AuditLogClient rows={rows} showUserColumn={isAdmin} />
      </CasePanel>
    </CabinetPage>
  );
}
