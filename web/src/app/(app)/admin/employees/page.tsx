import { requireRole } from "@/lib/auth/rbac";
import { getOrgMembers, getOrgTeamCounts } from "@/lib/db/queries";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import { AdminEmployeesClient } from "./AdminEmployeesClient";

const S = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const IcTeam = () => (
  <svg {...S}>
    <circle cx="7" cy="7.5" r="2.5" />
    <path d="M2.5 16.5c0-2.5 2-4.5 4.5-4.5" />
    <circle cx="14" cy="8" r="2" />
    <path d="M11 16.5c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5" />
  </svg>
);
const IcPanel = () => (
  <svg {...S}>
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <path d="M7 8h6M7 11h4" />
  </svg>
);

export default async function AdminEmployeesPage() {
  const session = await requireRole(["admin"]);
  const [employees, teamCounts] = await Promise.all([
    getOrgMembers(session.user.organizationId),
    getOrgTeamCounts(session.user.organizationId),
  ]);

  const panelCount =
    (teamCounts.interviewer ?? 0) + (teamCounts.manager ?? 0) + (teamCounts.hr ?? 0);

  return (
    <CabinetPage
      title="Office employees"
      subtitle="Everyone in your organization — admins, recruiters, and interview panel"
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBlock label="All employees" value={employees.length} icon={<IcTeam />} />
        <StatBlock
          label="Recruiters"
          value={(teamCounts.ta ?? 0) + (teamCounts.ta_lead ?? 0)}
          icon={<IcTeam />}
          variant="cyan"
        />
        <StatBlock label="Panel" value={panelCount} icon={<IcPanel />} variant="green" />
      </div>

      <CasePanel title="Employee directory">
        <AdminEmployeesClient rows={employees} />
      </CasePanel>
    </CabinetPage>
  );
}
