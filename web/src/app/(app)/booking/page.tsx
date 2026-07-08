import { requireRole } from "@/lib/auth/rbac";
import { getBookableCandidates, getStageBookings } from "@/lib/db/queries";
import { CabinetPage } from "@/components/CabinetPage";
import { BookingClient } from "./BookingClient";

export default async function BookingPage() {
  const session = await requireRole(["admin", "ta"]);
  const [bookable, bookings] = await Promise.all([
    getBookableCandidates(session.user.organizationId),
    getStageBookings(session.user.organizationId),
  ]);

  const candidates = bookable.map((row) => {
    const metrics = (row.metrics ?? {}) as Record<string, unknown>;
    const score = metrics.tech_match_score;
    return {
      id: row.candidate.id,
      name: row.candidate.name,
      email: row.candidate.email ?? "",
      status: row.candidate.status,
      roleName: row.roleName ?? null,
      roleClosed: row.roleStatus === "closed",
      techMatchScore: typeof score === "number" ? score : null,
      recommendation:
        typeof metrics.recommendation === "string"
          ? (metrics.recommendation as string)
          : null,
      summary:
        typeof metrics.summary === "string" ? (metrics.summary as string) : null,
    };
  });

  const upcoming = bookings
    .filter((b) => b.assigneeId && b.dueAt && b.status === "active")
    .map((b) => ({
      id: b.id,
      candidateId: b.candidateId,
      candidateName: b.candidateName,
      interviewer: `${b.assigneeName ?? "—"} · ${b.label}`,
      status: b.status,
      dueAt: b.dueAt ? (b.dueAt as Date).toISOString() : null,
      handoffNote: "",
    }));

  return (
    <CabinetPage
      title="Booking"
      subtitle="Assign screened candidates to the right interviewer for their current round"
    >
      <BookingClient
        candidates={candidates}
        interviewers={[]}
        upcoming={upcoming}
      />
    </CabinetPage>
  );
}
