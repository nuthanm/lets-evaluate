import { requireRole } from "@/lib/auth/rbac";
import {
  getCandidatesGridForUser,
  getOrgProjects,
  getOrgRoles,
} from "@/lib/db/queries";
import { CabinetPage, CaseCard, StatBlock } from "@/components/CabinetPage";
import { ButtonLink } from "@/components/Button";
import { CandidatesGrid } from "./CandidatesGrid";
import Link from "next/link";

export default async function CandidatesPage() {
  const session = await requireRole(["admin", "ta"]);
  const [candidates, projects, roles] = await Promise.all([
    getCandidatesGridForUser(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    ),
    getOrgProjects(session.user.organizationId),
    getOrgRoles(session.user.organizationId),
  ]);

  const active = candidates.filter(
    (c) =>
      ![
        "selected",
        "rejected",
        "screened_rejected",
        "interview_complete",
      ].includes(c.status),
  ).length;
  const selected = candidates.filter((c) => c.status === "selected").length;
  const scored = candidates.filter((c) => c.techScore !== null);
  const avgMatch = scored.length
    ? Math.round(
        scored.reduce((sum, c) => sum + (c.techScore ?? 0), 0) / scored.length,
      )
    : 0;

  return (
    <CabinetPage
      title="Candidate details"
      subtitle="Profiles and AI evaluation reports for every candidate"
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/candidates/import" variant="ghost" className="px-4 py-2 text-[13px]">
            Import CSV
          </ButtonLink>
          <ButtonLink href="/evaluate/new" className="px-5 py-2 text-[13px]">
            + New candidate
          </ButtonLink>
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="All candidates" value={candidates.length} icon="👥" />
        <StatBlock label="Active" value={active} icon="◎" />
        <StatBlock label="Selected" value={selected} icon="✓" />
        <StatBlock
          label="Avg. match"
          value={`${avgMatch}%`}
          icon="📊"
          className="hidden md:block"
        />
      </div>

      {candidates.length === 0 ? (
        <CaseCard className="p-6 text-sm text-[var(--ink-faint)]">
          No candidates yet. Start by creating a{" "}
          <Link href="/evaluate/new" className="font-semibold text-[var(--cyan-d)]">
            new candidate
          </Link>
          .
        </CaseCard>
      ) : (
        <CandidatesGrid
          candidates={candidates}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          roles={roles.map((r) => ({
            id: r.id,
            name: r.name,
            projectId: r.projectId,
            projectIds: (r.projectIds as string[] | null) ?? [],
          }))}
        />
      )}
    </CabinetPage>
  );
}
