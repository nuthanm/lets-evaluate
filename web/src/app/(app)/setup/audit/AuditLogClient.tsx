"use client";

import { FilterTable } from "@/components/FilterTable";
import type { TableColumn, TableFilter, TableRow } from "@/components/FilterTable";
import { formatAuditAction } from "@/lib/audit/format-action";

type AuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  payload: Record<string, unknown>;
  entityType: string;
  entityId: string;
  entityName: string | null;
  createdAt: string;
};

const COLUMNS: TableColumn[] = [
  { key: "user", label: "User", className: "w-[22%]" },
  { key: "action", label: "Action", className: "w-[32%]" },
  { key: "entity", label: "Entity", className: "w-[22%]" },
  { key: "date", label: "Time", className: "w-[24%]" },
];

const FILTERS: TableFilter[] = [
  { key: "user", placeholder: "Filter by user…" },
  { key: "action", placeholder: "Filter by action…" },
  { key: "entity", placeholder: "Filter by entity…" },
  { key: "date", placeholder: "Filter by date", type: "date" },
];

export function AuditLogClient({ rows }: { rows: AuditRow[] }) {
  const tableRows: TableRow[] = rows.map((row) => {
    const actorLabel = row.actorName ?? "System";
    const actionLabel = formatAuditAction(row.action, row.payload);
    const entityLabel = `${row.entityType} · ${row.entityName ?? row.entityId.slice(0, 8)}`;
    const dateLabel = new Date(row.createdAt).toLocaleString("en-GB");
    const isoDate = row.createdAt.slice(0, 10);

    return {
      id: row.id,
      cells: [
        <span key="u" className="font-semibold text-[var(--ink)]">{actorLabel}</span>,
        <span key="a" className="text-[var(--ink-soft)]">{actionLabel}</span>,
        <span key="e" className="text-[var(--ink-faint)]" title={`${row.entityType} · ${row.entityId}`}>{entityLabel}</span>,
        <span key="d" className="text-[var(--ink-faint)]">{dateLabel}</span>,
      ],
      searchValues: [actorLabel, actionLabel, entityLabel, isoDate],
    };
  });

  return (
    <FilterTable
      columns={COLUMNS}
      filters={FILTERS}
      rows={tableRows}
      emptyMessage="No events yet."
    />
  );
}
