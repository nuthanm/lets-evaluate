import { requireSession } from "@/lib/auth/rbac";
import { getOrgQuestions } from "@/lib/db/queries";
import { getOrgRoles } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { QuestionLibraryClient } from "./QuestionLibraryClient";

export default async function LibraryPage() {
  const session = await requireSession();
  const [qs, roles] = await Promise.all([
    getOrgQuestions(session.user.organizationId, undefined, session.user.id),
    getOrgRoles(session.user.organizationId),
  ]);

  const questions = qs.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    category: q.category ?? "General",
    difficulty: q.difficulty ?? "Medium",
    roleId: q.roleId ?? null,
    code: (q.code as string | null) ?? "",
    visibility: (q.visibility as "org" | "private") ?? "org",
    createdById: q.createdById ?? null,
  }));

  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name }));

  return (
    <CabinetPage
      title="Question library"
      subtitle={`${questions.length} question${questions.length !== 1 ? "s" : ""} · shared across your organisation`}
    >
      <QuestionLibraryClient
        questions={questions}
        roles={roleOptions}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </CabinetPage>
  );
}
