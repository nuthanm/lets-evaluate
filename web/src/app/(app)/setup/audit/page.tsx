import { requireRole } from "@/lib/auth/rbac";
import { getAuditLog } from "@/lib/db/queries";
import { CabinetPage, CasePanel } from "@/components/CabinetPage";

export default async function AuditPage() {
  const session = await requireRole(["admin"]);
  const rows = await getAuditLog(session.user.organizationId, 200);

  return (
    <CabinetPage
      title="Audit log"
      subtitle="Who changed what, and when — across the hiring workflow"
    >
      <CasePanel title="Recent events">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-[var(--ink-faint)]">No events yet.</p>
        ) : (
          rows.map(({ event, actorName }) => (
            <div key={event.id} className="case-row text-[13px]">
              <strong>{actorName ?? "System"}</strong>
              <span className="text-[var(--ink-soft)]">{event.action}</span>
              <span className="text-[11px] text-[var(--ink-faint)]">
                {event.entityType} · {event.entityId.slice(0, 8)}
              </span>
              <span className="text-[11px] text-[var(--ink-faint)]">
                {new Date(event.createdAt).toLocaleString("en-GB")}
              </span>
            </div>
          ))
        )}
      </CasePanel>
    </CabinetPage>
  );
}
