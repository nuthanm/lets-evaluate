import { requireRole } from "@/lib/auth/rbac";
import {
  getOrgProjects,
  getOrgRoles,
} from "@/lib/db/queries";
import { getCachedCandidatesGrid } from "@/lib/db/cache";
import { CabinetPage, CaseCard, StatBlock } from "@/components/CabinetPage";
import { ButtonLink } from "@/components/Button";
import { CandidatesGrid } from "./CandidatesGrid";
import Link from "next/link";

const S = { viewBox:"0 0 20 20", fill:"none", stroke:"currentColor", strokeWidth:1.75, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
const IcPeople    = () => <svg {...S}><circle cx="7.5" cy="7" r="2.8"/><path d="M2 17c0-3 2.5-5.2 5.5-5.2S13 14 13 17"/><path d="M14.5 6a2.5 2.5 0 0 1 0 5M17.5 17c0-2.5-1.2-4.5-3-5.2"/></svg>;
const IcActive    = () => <svg {...S}><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3" fill="currentColor" stroke="none"/></svg>;
const IcCheck     = () => <svg {...S}><circle cx="10" cy="10" r="7"/><path d="m6.5 10 2.5 2.5 4-5"/></svg>;
const IcChart     = () => <svg {...S}><path d="M3 15.5V10M7.5 15.5V5.5M12 15.5V9.5M16.5 15.5V7"/><path d="M1.5 17h17"/></svg>;

export default async function CandidatesPage() {
  const session = await requireRole(["admin", "ta"]);
  const [candidates, projects, roles] = await Promise.all([
    getCachedCandidatesGrid(
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
        <StatBlock label="All candidates" value={candidates.length} icon={<IcPeople />} />
        <StatBlock label="Active"         value={active}           icon={<IcActive />} variant="cyan" />
        <StatBlock label="Selected"       value={selected}         icon={<IcCheck />}  variant="green" />
        <StatBlock
          label="Avg. match"
          value={`${avgMatch}%`}
          icon={<IcChart />}
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
