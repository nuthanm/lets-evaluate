export type RecruiterTask = {
  id: string;
  candidateId: string;
  candidateName: string;
  action: string;
  detail?: string;
  href: string;
  priority: number;
  urgency: "overdue" | "today" | "soon" | "normal" | "hold";
  dueAt?: string;
};

type CandidateRow = {
  id: string;
  name: string;
  status: string;
  updatedAt: Date | string;
};

type BookingRow = {
  candidateId: string;
  dueAt: Date | string | null;
  slaDueAt?: Date | string | null;
  label: string;
  status: string;
};

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfToday() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function daysSince(value: Date | string) {
  const t = new Date(value).getTime();
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

const NEEDS_ACTION_STATUSES = new Set([
  "draft",
  "screening",
  "ready_for_interview",
  "assigned",
  "interview_in_progress",
]);

export function candidateNeedsAction(status: string) {
  return NEEDS_ACTION_STATUSES.has(status);
}

export function nextActionForCandidate(
  candidateId: string,
  status: string,
): { label: string; href: string } {
  if (status === "draft" || status === "screening") {
    return { label: "Screen", href: `/evaluate/${candidateId}` };
  }
  if (status === "ready_for_interview" || status === "assigned") {
    return { label: "Schedule", href: `/booking/${candidateId}` };
  }
  if (status === "interview_in_progress" || status === "interview_complete") {
    return { label: "Track", href: `/pipeline` };
  }
  if (status === "screened_hold" || status === "hold") {
    return { label: "Review", href: `/evaluate/${candidateId}` };
  }
  return { label: "Open", href: `/evaluate/${candidateId}` };
}

export function getNavPendingCounts(candidates: CandidateRow[]) {
  let screening = 0;
  let booking = 0;
  for (const c of candidates) {
    if (c.status === "draft" || c.status === "screening") screening += 1;
    if (c.status === "ready_for_interview") booking += 1;
  }
  return { candidates: screening, booking };
}

/**
 * Build a prioritized task list for the TA dashboard — names, actions, and deep links.
 */
export function buildRecruiterTasks(
  candidates: CandidateRow[],
  bookings: BookingRow[] = [],
): RecruiterTask[] {
  const now = Date.now();
  const todayStart = startOfToday().getTime();
  const todayEnd = endOfToday().getTime();

  const bookingByCandidate = new Map<string, BookingRow>();
  for (const b of bookings) {
    if (b.status === "active" && b.dueAt) {
      bookingByCandidate.set(b.candidateId, b);
    }
  }

  const tasks: RecruiterTask[] = [];

  for (const c of candidates) {
    const age = daysSince(c.updatedAt);
    const booking = bookingByCandidate.get(c.id);
    const dueMs = booking?.dueAt ? new Date(booking.dueAt).getTime() : null;
    const slaMs = booking?.slaDueAt
      ? new Date(booking.slaDueAt).getTime()
      : dueMs
        ? dueMs + 48 * 60 * 60 * 1000
        : null;
    const overdueSla = slaMs !== null && slaMs < now;

    if (c.status === "draft" || c.status === "screening") {
      const stale = age >= 2;
      tasks.push({
        id: `screen-${c.id}`,
        candidateId: c.id,
        candidateName: c.name,
        action: c.status === "draft" ? "Start screening" : "Complete screening",
        detail: stale
          ? `Waiting ${age} day${age === 1 ? "" : "s"}`
          : "Resume review & AI analysis",
        href: `/evaluate/${c.id}`,
        priority: stale ? 10 + age : 30 + age,
        urgency: stale ? "soon" : "normal",
      });
      continue;
    }

    if (c.status === "ready_for_interview") {
      tasks.push({
        id: `book-${c.id}`,
        candidateId: c.id,
        candidateName: c.name,
        action: "Schedule interviewer",
        detail: "Assign panel member & time slot",
        href: `/booking/${c.id}`,
        priority: 20 + age,
        urgency: age >= 1 ? "soon" : "normal",
      });
      continue;
    }

    if (c.status === "assigned" || c.status === "interview_in_progress") {
      if ((dueMs && dueMs < now) || overdueSla) {
        tasks.push({
          id: `overdue-${c.id}`,
          candidateId: c.id,
          candidateName: c.name,
          action: "Follow up with panel",
          detail: booking
            ? `${booking.label} was scheduled ${new Date(booking.dueAt!).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "Interview overdue",
          href: `/pipeline`,
          priority: 1,
          urgency: "overdue",
          dueAt: booking?.dueAt
            ? new Date(booking.dueAt).toISOString()
            : undefined,
        });
      } else if (dueMs && dueMs >= todayStart && dueMs < todayEnd) {
        tasks.push({
          id: `today-${c.id}`,
          candidateId: c.id,
          candidateName: c.name,
          action: "Interview today",
          detail: booking
            ? `${booking.label} · ${new Date(booking.dueAt!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
            : "Monitor panel progress",
          href: `/booking/${c.id}`,
          priority: 5,
          urgency: "today",
          dueAt: new Date(booking!.dueAt!).toISOString(),
        });
      } else {
        tasks.push({
          id: `track-${c.id}`,
          candidateId: c.id,
          candidateName: c.name,
          action: "Awaiting interview result",
          detail: booking?.label ?? "Panel in progress",
          href: `/pipeline`,
          priority: 50,
          urgency: "normal",
          dueAt: booking?.dueAt
            ? new Date(booking.dueAt).toISOString()
            : undefined,
        });
      }
      continue;
    }

    if (c.status === "screened_hold" || c.status === "hold") {
      tasks.push({
        id: `hold-${c.id}`,
        candidateId: c.id,
        candidateName: c.name,
        action: "Review hold",
        detail: "Revisit paused candidate",
        href: `/evaluate/${c.id}`,
        priority: 60,
        urgency: "hold",
      });
    }
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}

export function groupTasksByUrgency(tasks: RecruiterTask[]) {
  return {
    overdue: tasks.filter((t) => t.urgency === "overdue"),
    today: tasks.filter((t) => t.urgency === "today"),
    soon: tasks.filter((t) => t.urgency === "soon"),
    normal: tasks.filter(
      (t) => t.urgency === "normal" && t.action !== "Review hold",
    ),
    hold: tasks.filter((t) => t.urgency === "hold"),
  };
}
