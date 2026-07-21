const UNKNOWN = new Set(["unknown", "n/a", "-", "none", ""]);

export function isUnknown(v: string) {
  return UNKNOWN.has((v || "").trim().toLowerCase());
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8,
  sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

/** True when a date string represents an ongoing role (no fixed end date). */
export function isPresent(s: string) {
  return /present|till\s*date|current|ongoing|now|to\s*date/i.test(s || "");
}

/** True when a string already reads as a duration (e.g. "2 yrs 3 mos"). */
export function looksLikeDuration(s: string) {
  return /\b(yr|yrs|year|years|mo|mos|month|months)\b/i.test(s || "");
}

/** Best-effort parse of a "Month Year" / "MM/YYYY" / "YYYY" style token. */
export function parseMonthYear(s: string): Date | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (isPresent(t)) return new Date();
  let m = t.match(/([a-z]+)[\s./,-]*(\d{4})/);
  if (m && MONTHS[m[1]] != null) return new Date(Number(m[2]), MONTHS[m[1]], 1);
  m = t.match(/(\d{1,2})[\s./-]+(\d{4})/);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = t.match(/(\d{4})[\s./-]+(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  m = t.match(/\b(\d{4})\b/);
  if (m) return new Date(Number(m[1]), 0, 1);
  return null;
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Human-friendly duration from a whole number of months. */
export function formatDuration(totalMonths: number): string {
  const months = Math.max(0, totalMonths);
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (mo) parts.push(`${mo} mo${mo > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" ") : "< 1 mo";
}

/** Parse a formatted duration back to months (best effort). */
export function durationToMonths(duration: string): number {
  if (!duration?.trim()) return 0;
  let months = 0;
  const yr = duration.match(/(\d+)\s*yrs?/i);
  const mo = duration.match(/(\d+)\s*mos?/i);
  if (yr) months += Number(yr[1]) * 12;
  if (mo) months += Number(mo[1]);
  if (!yr && !mo && duration.includes("< 1")) return 1;
  return months;
}

export function formatDisplayDate(raw: string | undefined): string {
  if (!raw?.trim() || isUnknown(raw)) return "";
  if (isPresent(raw)) return "Present";
  const d = parseMonthYear(raw);
  if (!d) return raw.trim();
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

type DatePeriod = { start: Date; end: Date };

export function mergePeriods(periods: DatePeriod[]): DatePeriod[] {
  if (!periods.length) return [];
  const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: DatePeriod[] = [{ start: sorted[0].start, end: sorted[0].end }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.start.getTime() <= last.end.getTime()) {
      if (cur.end.getTime() > last.end.getTime()) last.end = cur.end;
    } else {
      merged.push({ start: cur.start, end: cur.end });
    }
  }
  return merged;
}

export function periodMonths(periods: DatePeriod[]): number {
  return mergePeriods(periods).reduce(
    (sum, p) => sum + monthsBetween(p.start, p.end) + 1,
    0,
  );
}

export function resolvePeriodEnd(
  endRaw: string | undefined,
  isCurrent?: boolean,
  now = new Date(),
): Date | null {
  if (isCurrent || isPresent(endRaw ?? "") || !endRaw?.trim()) return now;
  return parseMonthYear(endRaw);
}

export function resolvePeriodStart(startRaw: string | undefined): Date | null {
  if (!startRaw?.trim() || isUnknown(startRaw)) return null;
  return parseMonthYear(startRaw);
}
