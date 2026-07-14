export function buildIcsEvent(opts: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  durationMinutes?: number;
  organizerEmail?: string;
}) {
  const end = new Date(
    opts.start.getTime() + (opts.durationMinutes ?? 60) * 60 * 1000,
  );
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lets Evaluate//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${opts.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${opts.description.replace(/\n/g, "\\n").replace(/[,;]/g, " ")}`,
    opts.organizerEmail ? `ORGANIZER:mailto:${opts.organizerEmail}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
