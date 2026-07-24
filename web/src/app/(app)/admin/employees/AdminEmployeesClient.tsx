"use client";

import { FilterTable } from "@/components/FilterTable";
import type { TableColumn, TableFilter, TableRow } from "@/components/FilterTable";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";
import { getRoleDisplayName } from "@/lib/auth/validation";
import type { MemberRole } from "@/lib/auth/config";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  lastActiveAt: string | null;
};

function roleVariant(role: MemberRole): "cyan" | "green" | "orange" | "neutral" {
  if (role === "admin") return "orange";
  if (role === "ta" || role === "ta_lead") return "cyan";
  if (role === "hr") return "green";
  return "neutral";
}

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Employee", className: "w-[24%]" },
  { key: "email", label: "Email", className: "w-[24%]" },
  { key: "role", label: "Role", className: "w-[16%]" },
  { key: "joined", label: "Joined", className: "w-[18%]" },
  { key: "active", label: "Last active", className: "w-[18%]" },
];

const FILTERS: TableFilter[] = [
  { key: "name", placeholder: "Filter by name…" },
  { key: "email", placeholder: "Filter by email…" },
  { key: "role", placeholder: "Filter by role…" },
  { key: "joined", placeholder: "Filter by join date", type: "date" },
  { key: "active", placeholder: "Filter by last active", type: "date" },
];

export function AdminEmployeesClient({ rows }: { rows: EmployeeRow[] }) {
  const tableRows: TableRow[] = rows.map((row) => {
    const role = getRoleDisplayName(row.role);
    const joined = new Date(row.joinedAt).toLocaleDateString("en-GB");
    const joinedIso = row.joinedAt.slice(0, 10);
    const lastActive = row.lastActiveAt
      ? new Date(row.lastActiveAt).toLocaleString("en-GB")
      : "Never";
    const lastActiveIso = row.lastActiveAt?.slice(0, 10) ?? "";

    return {
      id: row.id,
      cells: [
        <span key="n" className="flex min-w-0 items-center gap-2 font-semibold text-[var(--ink)]">
          <FaceAvatar name={row.name} size="sm" />
          <span className="truncate">{row.name}</span>
        </span>,
        <span key="e" className="text-[var(--ink-soft)]">
          {row.email}
        </span>,
        <Pill key="r" variant={roleVariant(row.role)}>
          {role}
        </Pill>,
        <span key="j" className="text-[var(--ink-faint)]">
          {joined}
        </span>,
        <span key="a" className="text-[var(--ink-faint)]">
          {lastActive}
        </span>,
      ],
      searchValues: [row.name, row.email, role, joinedIso, lastActiveIso],
    };
  });

  return (
    <FilterTable
      columns={COLUMNS}
      filters={FILTERS}
      rows={tableRows}
      emptyMessage="No employees found."
    />
  );
}
