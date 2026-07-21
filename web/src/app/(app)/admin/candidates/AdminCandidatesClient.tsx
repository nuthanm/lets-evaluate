"use client";

import Link from "next/link";
import { FilterTable } from "@/components/FilterTable";
import type { TableColumn, TableFilter, TableRow } from "@/components/FilterTable";
import { FaceAvatar } from "@/components/FaceAvatar";
import { Pill } from "@/components/Pill";

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  projectName: string | null;
  roleName: string | null;
  techScore: number | null;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  screening: "Screening",
  screened_hold: "Screen hold",
  screened_rejected: "Screen reject",
  ready_for_interview: "Ready",
  assigned: "Assigned",
  interview_in_progress: "Interviewing",
  interview_complete: "Interviewed",
  selected: "Selected",
  rejected: "Rejected",
  hold: "On hold",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Candidate", className: "w-[22%]" },
  { key: "email", label: "Email", className: "w-[18%]" },
  { key: "project", label: "Project", className: "w-[14%]" },
  { key: "role", label: "Role", className: "w-[14%]" },
  { key: "status", label: "Status", className: "w-[12%]" },
  { key: "match", label: "Match", className: "w-[8%]" },
  { key: "updated", label: "Updated", className: "w-[12%]" },
];

const FILTERS: TableFilter[] = [
  { key: "name", placeholder: "Filter by name…" },
  { key: "email", placeholder: "Filter by email…" },
  { key: "project", placeholder: "Filter by project…" },
  { key: "role", placeholder: "Filter by role…" },
  { key: "status", placeholder: "Filter by status…" },
  { key: "match", placeholder: "Filter by match…" },
  { key: "updated", placeholder: "Filter by date", type: "date" },
];

export function AdminCandidatesClient({ rows }: { rows: CandidateRow[] }) {
  const tableRows: TableRow[] = rows.map((row) => {
    const status = statusLabel(row.status);
    const project = row.projectName ?? "—";
    const role = row.roleName ?? "—";
    const match = row.techScore !== null ? `${row.techScore}%` : "—";
    const updated = new Date(row.updatedAt).toLocaleString("en-GB");
    const isoDate = row.updatedAt.slice(0, 10);

    return {
      id: row.id,
      cells: [
        <Link
          key="n"
          href={`/evaluate/${row.id}`}
          className="flex min-w-0 items-center gap-2 font-semibold text-[var(--ink)] hover:text-[var(--cyan-d)]"
        >
          <FaceAvatar name={row.name} size="sm" />
          <span className="truncate">{row.name}</span>
        </Link>,
        <span key="e" className="text-[var(--ink-soft)]">
          {row.email || "—"}
        </span>,
        <span key="p" className="text-[var(--ink-soft)]">
          {project}
        </span>,
        <span key="r" className="text-[var(--ink-soft)]">
          {role}
        </span>,
        <Pill key="s" variant="neutral" className="capitalize">
          {status}
        </Pill>,
        <span key="m" className="font-semibold text-[var(--ink)]">
          {match}
        </span>,
        <span key="u" className="text-[var(--ink-faint)]">
          {updated}
        </span>,
      ],
      searchValues: [row.name, row.email, project, role, status, match, isoDate],
    };
  });

  return (
    <FilterTable
      columns={COLUMNS}
      filters={FILTERS}
      rows={tableRows}
      emptyMessage="No candidates yet."
    />
  );
}
