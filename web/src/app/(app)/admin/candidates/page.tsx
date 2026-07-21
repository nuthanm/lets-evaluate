import { requireRole } from "@/lib/auth/rbac";
import { getCandidatesGridForUser } from "@/lib/db/queries";
import { CabinetPage, CasePanel, StatBlock } from "@/components/CabinetPage";
import { AdminCandidatesClient } from "./AdminCandidatesClient";

const S = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const IcPeople = () => (
  <svg {...S}>
    <circle cx="7.5" cy="7" r="2.8" />
    <path d="M2 17c0-3 2.5-5.2 5.5-5.2S13 14 13 17" />
    <path d="M14.5 6a2.5 2.5 0 0 1 0 5M17.5 17c0-2.5-1.2-4.5-3-5.2" />
  </svg>
);
const IcActive = () => (
  <svg {...S}>
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="3" fill="currentColor" stroke="none" />
  </svg>
);
const IcCheck = () => (
  <svg {...S}>
    <circle cx="10" cy="10" r="7" />
    <path d="m6.5 10 2.5 2.5 4-5" />
  </svg>
);

export default async function AdminCandidatesPage() {
  const session = await requireRole(["admin"]);
  const candidates = await getCandidatesGridForUser(
    session.user.organizationId,
    session.user.id,
    "admin",
  );

  const active = candidates.filter(
    (c) =>
      !["selected", "rejected", "screened_rejected", "interview_complete"].includes(
        c.status,
      ),
  ).length;
  const selected = candidates.filter((c) => c.status === "selected").length;

  return (
    <CabinetPage
      title="Candidates"
      subtitle="Org-wide candidate directory — view profiles and evaluation status"
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBlock label="All candidates" value={candidates.length} icon={<IcPeople />} />
        <StatBlock label="Active" value={active} icon={<IcActive />} variant="cyan" />
        <StatBlock label="Selected" value={selected} icon={<IcCheck />} variant="green" />
      </div>

      <CasePanel title="All candidates">
        <AdminCandidatesClient rows={candidates} />
      </CasePanel>
    </CabinetPage>
  );
}
