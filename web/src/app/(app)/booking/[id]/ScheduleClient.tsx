"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { FaceAvatar } from "@/components/FaceAvatar";
import { FieldInput, FieldTextarea } from "@/components/FormField";
import { EmailComposer } from "@/components/EmailComposer";
import type { RenderedMail } from "@/lib/email";
import { cn } from "@/lib/utils";

type Interviewer = {
  id: string;
  name: string;
  email: string;
  role: string;
  pendingCount?: number;
};

type AvailabilityWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

type Event = {
  id: string;
  interviewerId: string;
  candidateId: string;
  candidateName: string;
  status: string;
  dueAt: string;
};

type Existing = {
  interviewerId: string;
  dueAt: string | null;
  handoffNote: string;
};

type View = "month" | "week" | "day";

/* Working hours grid: 09:00 – 18:00, one-hour slots. */
const START_HOUR = 9;
const END_HOUR = 18;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ─────────────────────────── date helpers ─────────────────────────── */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
/** Monday as the first day of the week. */
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7;
  return addDays(x, -offset);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isWeekend(d: Date) {
  const g = d.getDay();
  return g === 0 || g === 6;
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function slotDate(day: Date, hour: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

export function ScheduleClient({
  candidate,
  stage,
  interviewers,
  events,
  existing,
  availability = {},
}: {
  candidate: {
    id: string;
    name: string;
    role: string;
    projectName?: string;
    status: string;
  };
  stage: { label: string; kind: string; roles: string[] };
  interviewers: Interviewer[];
  events: Event[];
  existing: Existing | null;
  availability?: Record<string, AvailabilityWindow[]>;
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);

  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(now));
  const [search, setSearch] = useState("");
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>(
    existing?.interviewerId ?? "",
  );
  const [pending, setPending] = useState<Date | null>(null);
  const [note, setNote] = useState(existing?.handoffNote ?? "");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparedMails, setPreparedMails] = useState<RenderedMail[] | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);

  const parsedEvents = useMemo(
    () => events.map((e) => ({ ...e, date: new Date(e.dueAt) })),
    [events],
  );

  /* Fast lookup: interviewer + day + hour -> event (busy). */
  const busyMap = useMemo(() => {
    const m = new Map<string, (typeof parsedEvents)[number]>();
    for (const e of parsedEvents) {
      const k = `${e.interviewerId}|${dayKey(e.date)}|${e.date.getHours()}`;
      m.set(k, e);
    }
    return m;
  }, [parsedEvents]);

  /* Per-day event count (for the month grid). */
  const dayCounts = useMemo(() => {
    const m = new Map<string, (typeof parsedEvents)[number][]>();
    for (const e of parsedEvents) {
      if (selectedInterviewer && e.interviewerId !== selectedInterviewer)
        continue;
      const k = dayKey(e.date);
      (m.get(k) ?? m.set(k, []).get(k)!).push(e);
    }
    return m;
  }, [parsedEvents, selectedInterviewer]);

  const filteredInterviewers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interviewers;
    return interviewers.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q),
    );
  }, [interviewers, search]);

  const busyAt = (day: Date, hour: number) =>
    selectedInterviewer
      ? busyMap.get(`${selectedInterviewer}|${dayKey(day)}|${hour}`)
      : undefined;

  const activeInterviewer = interviewers.find(
    (i) => i.id === selectedInterviewer,
  );

  function isWithinAvailability(day: Date, hour: number) {
    if (!selectedInterviewer) return true;
    const windows = availability[selectedInterviewer];
    if (!windows?.length) return true;
    const dow = (day.getDay() + 6) % 7;
    const slotStart = hour * 60;
    const slotEnd = slotStart + 60;
    return windows.some(
      (w) =>
        w.dayOfWeek === dow &&
        slotStart >= w.startMinute &&
        slotEnd <= w.endMinute,
    );
  }

  function openSlot(day: Date, hour: number) {
    if (!selectedInterviewer) {
      setError("Select an interviewer on the left first.");
      return;
    }
    const start = slotDate(day, hour);
    if (start.getTime() < now.getTime()) return;
    if (busyAt(day, hour)) return;
    if (!isWithinAvailability(day, hour)) {
      setError("This slot is outside the interviewer's availability window.");
      return;
    }
    setError(null);
    setPending(start);
  }

  async function confirmBooking() {
    if (!pending || !selectedInterviewer) return;
    setBooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${candidate.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: selectedInterviewer,
          handoffNote: note,
          dueAt: pending.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not book this slot.");
        return;
      }
      const data = await res.json();
      if (data.mails?.length) setPreparedMails(data.mails as RenderedMail[]);
      if (data.icsUrl) setIcsUrl(data.icsUrl as string);
      if (!data.mails?.length) {
        router.push(`/evaluate/${candidate.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  const periodLabel =
    view === "month"
      ? cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(cursor).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}`
        : cursor.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });

  function shift(dir: -1 | 1) {
    if (view === "month") setCursor(addMonths(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(addDays(cursor, dir));
  }

  return (
    <div className="space-y-5">
      {preparedMails && (
        <div className="space-y-3">
          <EmailComposer
            mails={preparedMails}
            title="Booking emails ready"
            onClose={() => setPreparedMails(null)}
          />
          {icsUrl && (
            <a
              href={icsUrl}
              className="inline-flex text-[13px] font-semibold text-[var(--cyan-d)] hover:underline"
            >
              Download calendar invite (.ics) →
            </a>
          )}
          <Button
            onClick={() => {
              router.push(`/evaluate/${candidate.id}`);
              router.refresh();
            }}
          >
            Done →
          </Button>
        </div>
      )}

    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Interviewer roster */}
      <aside className="flex flex-col">
        <div className="case-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <FaceAvatar name={candidate.name} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{candidate.name}</div>
              <div className="truncate text-[11px] text-[var(--ink-faint)]">
                {candidate.role}
                {candidate.projectName ? ` · ${candidate.projectName}` : ""}
              </div>
            </div>
          </div>
          <Pill variant="cyan" className="capitalize">
            {candidate.status.replace(/_/g, " ")}
          </Pill>
        </div>

        <div className="mt-3 case-card p-3">
          <span className="case-label">Round</span>
          <div className="mt-1 flex items-center gap-2">
            <Pill variant="orange" className="capitalize">
              {stage.label}
            </Pill>
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
            Only {stage.roles.join(" / ")} users can take this round.
          </p>
        </div>

        <div className="mt-3 case-card flex min-h-0 flex-1 flex-col p-3">
          <label className="case-label mb-2 block">
            {stage.roles.join(" / ")} panel
          </label>
          <FieldInput
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <button
            type="button"
            onClick={() => setSelectedInterviewer("")}
            className={cn(
              "mb-1 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors",
              selectedInterviewer === ""
                ? "bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                : "text-[var(--ink-soft)] hover:bg-[var(--cream)]",
            )}
          >
            All interviewers (overview)
          </button>
          <div className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
            {interviewers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-[var(--ink-faint)]">
                No {stage.roles.join(" / ")} users exist yet. Ask an admin to add
                one (they can register with that role).
              </p>
            ) : filteredInterviewers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-[var(--ink-faint)]">
                No one matches “{search}”.
              </p>
            ) : (
              filteredInterviewers.map((iv) => {
                const booked = parsedEvents.filter(
                  (e) => e.interviewerId === iv.id,
                ).length;
                const pending = iv.pendingCount ?? 0;
                const on = selectedInterviewer === iv.id;
                return (
                  <button
                    key={iv.id}
                    type="button"
                    onClick={() => setSelectedInterviewer(iv.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                      on
                        ? "bg-[var(--cyan-soft)] ring-1 ring-[var(--cyan)]"
                        : "hover:bg-[var(--cream)]",
                    )}
                  >
                    <FaceAvatar name={iv.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">
                        {iv.name}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--ink-faint)]">
                        {iv.email}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-full bg-[var(--cream)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]"
                      title="Pending active rounds"
                    >
                      {pending} pending · {booked} booked
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Calendar */}
      <section className="case-card flex min-h-0 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cream-2)] p-3">
          <div className="flex items-center gap-1">
            <IconBtn label="Previous" onClick={() => shift(-1)}>
              ‹
            </IconBtn>
            <button
              type="button"
              onClick={() => setCursor(startOfDay(new Date()))}
              className="rounded-lg border border-[var(--cream-2)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--cyan)]"
            >
              Today
            </button>
            <IconBtn label="Next" onClick={() => shift(1)}>
              ›
            </IconBtn>
            <span className="ml-2 text-sm font-bold text-[var(--ink)]">
              {periodLabel}
            </span>
          </div>
          <div className="flex rounded-lg border border-[var(--cream-2)] bg-white p-0.5">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                  view === v
                    ? "bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                    : "text-[var(--ink-soft)] hover:bg-[var(--cream)]",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {!selectedInterviewer && view !== "month" && (
          <div className="border-b border-[var(--cream-2)] bg-[var(--cream)] px-4 py-2 text-xs text-[var(--ink-soft)]">
            Showing all interviewers. Select an interviewer to book a free slot.
          </div>
        )}

        {activeInterviewer && (
          <div className="flex items-center gap-2 border-b border-[var(--cream-2)] bg-[var(--cyan-soft)] px-4 py-2 text-xs">
            <span className="font-bold text-[var(--cyan-d)]">
              {activeInterviewer.name}
            </span>
            <span className="text-[var(--ink-soft)]">
              — click a free (＋) slot to book
            </span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {view === "month" && (
            <MonthGrid
              cursor={cursor}
              now={now}
              dayCounts={dayCounts}
              selectedInterviewer={selectedInterviewer}
              onPickDay={(d) => {
                setCursor(d);
                setView("day");
              }}
            />
          )}
          {view === "week" && (
            <TimeGrid
              days={Array.from({ length: 7 }, (_, i) =>
                addDays(startOfWeek(cursor), i),
              )}
              now={now}
              busyAt={busyAt}
              canBook={!!selectedInterviewer}
              pending={pending}
              onSlot={openSlot}
            />
          )}
          {view === "day" && (
            <TimeGrid
              days={[startOfDay(cursor)]}
              now={now}
              busyAt={busyAt}
              canBook={!!selectedInterviewer}
              pending={pending}
              onSlot={openSlot}
            />
          )}
        </div>
      </section>

      {/* Booking modal */}
      {pending && activeInterviewer && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !booking && setPending(null)}
        >
          <div
            className="case-card w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-bold">Confirm booking</h3>
            <div className="mt-3 space-y-2 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-sm">
              <Row label="Candidate" value={candidate.name} />
              <Row label="Interviewer" value={activeInterviewer.name} />
              <Row
                label="When"
                value={pending.toLocaleString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>
            <label className="case-label mb-1 mt-4 block">
              Handoff note (optional)
            </label>
            <FieldTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Focus areas or concerns from the report…"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                className="px-4 py-2 text-sm"
                onClick={() => setPending(null)}
                disabled={booking}
              >
                Cancel
              </Button>
              <Button
                className="px-5 py-2 text-sm"
                onClick={confirmBooking}
                disabled={booking}
              >
                {booking ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && !pending && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-white shadow-lg md:bottom-6">
          {error}
        </div>
      )}
    </div>
    </div>
  );
}

/* ─────────────────────────── month grid ─────────────────────────── */

function MonthGrid({
  cursor,
  now,
  dayCounts,
  selectedInterviewer,
  onPickDay,
}: {
  cursor: Date;
  now: Date;
  dayCounts: Map<string, { candidateName: string; date: Date }[]>;
  selectedInterviewer: string;
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="grid grid-cols-7">
      {DAY_LABELS.map((d) => (
        <div
          key={d}
          className="border-b border-[var(--cream-2)] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]"
        >
          {d}
        </div>
      ))}
      {days.map((d) => {
        const inMonth = d.getMonth() === cursor.getMonth();
        const today = isSameDay(d, now);
        const list = dayCounts.get(dayKey(d)) ?? [];
        return (
          <button
            type="button"
            key={d.toISOString()}
            onClick={() => onPickDay(d)}
            className={cn(
              "flex min-h-[92px] flex-col border-b border-r border-[var(--cream-2)] p-1.5 text-left transition-colors hover:bg-[var(--cream)]",
              !inMonth && "bg-[var(--cream)]/50 text-[var(--ink-faint)]",
              isWeekend(d) && "bg-[var(--cream)]/40",
            )}
          >
            <span
              className={cn(
                "mb-1 grid size-6 place-items-center rounded-full text-xs font-bold",
                today
                  ? "bg-[var(--cyan)] text-white"
                  : inMonth
                    ? "text-[var(--ink)]"
                    : "text-[var(--ink-faint)]",
              )}
            >
              {d.getDate()}
            </span>
            <span className="flex flex-col gap-0.5 overflow-hidden">
              {list.slice(0, 3).map((e, i) => (
                <span
                  key={i}
                  className="truncate rounded bg-[var(--cyan-soft)] px-1 py-0.5 text-[10px] font-semibold text-[var(--cyan-d)]"
                >
                  {e.date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {selectedInterviewer ? e.candidateName : ""}
                </span>
              ))}
              {list.length > 3 && (
                <span className="text-[10px] font-semibold text-[var(--ink-faint)]">
                  +{list.length - 3} more
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── time grid (week / day) ─────────────────────────── */

function TimeGrid({
  days,
  now,
  busyAt,
  canBook,
  pending,
  onSlot,
}: {
  days: Date[];
  now: Date;
  busyAt: (day: Date, hour: number) => { candidateName: string } | undefined;
  canBook: boolean;
  pending: Date | null;
  onSlot: (day: Date, hour: number) => void;
}) {
  return (
    <div
      className="grid min-w-[560px]"
      style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
    >
      {/* header row */}
      <div className="sticky top-0 z-10 border-b border-r border-[var(--cream-2)] bg-white" />
      {days.map((d) => {
        const today = isSameDay(d, now);
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "sticky top-0 z-10 border-b border-r border-[var(--cream-2)] bg-white px-2 py-2 text-center",
              isWeekend(d) && "bg-[var(--cream)]/50",
            )}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              {DAY_LABELS[(d.getDay() + 6) % 7]}
            </div>
            <div
              className={cn(
                "mx-auto mt-0.5 grid size-6 place-items-center rounded-full text-sm font-bold",
                today ? "bg-[var(--cyan)] text-white" : "text-[var(--ink)]",
              )}
            >
              {d.getDate()}
            </div>
          </div>
        );
      })}

      {/* hour rows */}
      {HOURS.map((hour) => (
        <FragmentRow key={hour}>
          <div className="border-b border-r border-[var(--cream-2)] px-1 py-2 text-right text-[10px] font-semibold text-[var(--ink-faint)]">
            {String(hour).padStart(2, "0")}:00
          </div>
          {days.map((d) => {
            const busy = busyAt(d, hour);
            const start = slotDate(d, hour);
            const past = start.getTime() < now.getTime();
            const isPending = pending ? pending.getTime() === start.getTime() : false;
            const bookable = canBook && !busy && !past;
            return (
              <button
                type="button"
                key={d.toISOString() + hour}
                disabled={!bookable}
                onClick={() => onSlot(d, hour)}
                className={cn(
                  "group relative h-12 border-b border-r border-[var(--cream-2)] p-1 text-left transition-colors",
                  isWeekend(d) && "bg-[var(--cream)]/40",
                  past && !busy && "bg-[var(--cream)]/60",
                  busy && "cursor-default",
                  isPending && "ring-2 ring-inset ring-[var(--green)]",
                  bookable && "hover:bg-[var(--cyan-soft)]",
                )}
              >
                {busy ? (
                  <span className="flex h-full flex-col justify-center rounded bg-[var(--cyan-soft)] px-1.5 text-[10px] font-bold leading-tight text-[var(--cyan-d)]">
                    <span className="truncate">{busy.candidateName}</span>
                    <span className="font-medium opacity-70">Booked</span>
                  </span>
                ) : bookable ? (
                  <span className="grid h-full place-items-center text-sm font-bold text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100">
                    ＋
                  </span>
                ) : null}
              </button>
            );
          })}
        </FragmentRow>
      ))}
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-[var(--cream-2)] bg-white text-lg font-bold text-[var(--ink-soft)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--ink-faint)]">{label}</span>
      <span className="text-right font-semibold text-[var(--ink)]">{value}</span>
    </div>
  );
}
