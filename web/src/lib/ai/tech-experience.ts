import { expandTechAliases, techNamesEquivalent, textMentionsTech } from "@/lib/ai/tech-aliases";
import {
  formatDisplayDate,
  formatDuration,
  isPresent,
  isUnknown,
  mergePeriods,
  parseMonthYear,
  periodMonths,
  resolvePeriodEnd,
  resolvePeriodStart,
} from "@/lib/ai/resume-dates";

export type ExtractedEmployment = {
  company?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_current?: boolean;
};

export type ExtractedProject = {
  name?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  technologies?: string[];
};

export type ExtractedResumeData = {
  employment?: ExtractedEmployment[];
  projects?: ExtractedProject[];
  technologies_mentioned?: string[];
  certifications?: string[];
  experience_claims?: string[];
};

export type CareerEntry = {
  company: string;
  title: string;
  start: string;
  end: string;
  duration: string;
  is_current?: boolean;
};

export type TechExperienceEntry = {
  technology: string;
  first_year: string;
  last_year: string;
  total_years: string;
};

type DatePeriod = { start: Date; end: Date };

function blockMentionsTech(block: string, tech: string): boolean {
  if (!block.trim()) return false;
  for (const variant of expandTechAliases(tech)) {
    if (textMentionsTech(block, variant)) return true;
  }
  return false;
}

function periodFromDates(
  startRaw: string | undefined,
  endRaw: string | undefined,
  isCurrent?: boolean,
  now = new Date(),
): DatePeriod | null {
  const start = resolvePeriodStart(startRaw);
  const end = resolvePeriodEnd(endRaw, isCurrent, now);
  if (!start || !end || end < start) return null;
  return { start, end };
}

function parseExperienceClaim(
  claims: string[],
  tech: string,
  now = new Date(),
): TechExperienceEntry | null {
  for (const claim of claims) {
    if (!blockMentionsTech(claim, tech)) continue;
    const match = claim.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    if (!match) continue;
    const years = Number.parseInt(match[1], 10);
    if (!years) continue;
    return {
      technology: tech,
      first_year: String(now.getFullYear() - years),
      last_year: "Present",
      total_years: years === 1 ? "1 yr" : `${years} yrs`,
    };
  }
  return null;
}

function collectTechPeriods(
  tech: string,
  extracted: ExtractedResumeData,
  now = new Date(),
): DatePeriod[] {
  const periods: DatePeriod[] = [];

  for (const job of extracted.employment ?? []) {
    const block = [job.title, job.company, job.description].filter(Boolean).join(" ");
    if (!blockMentionsTech(block, tech)) continue;
    const period = periodFromDates(job.start_date, job.end_date, job.is_current, now);
    if (period) periods.push(period);
  }

  for (const project of extracted.projects ?? []) {
    const techTags = (project.technologies ?? []).join(" ");
    const block = [project.name, project.company, project.description, techTags]
      .filter(Boolean)
      .join(" ");
    const mentionedInProject =
      blockMentionsTech(block, tech) ||
      (project.technologies ?? []).some((t) => techNamesEquivalent(t, tech));
    if (!mentionedInProject) continue;
    const period = periodFromDates(project.start_date, project.end_date, false, now);
    if (period) periods.push(period);
  }

  return periods;
}

function entryFromPeriods(tech: string, periods: DatePeriod[], now = new Date()): TechExperienceEntry {
  const merged = mergePeriods(periods);
  const totalMonths = periodMonths(merged);
  const first = merged[0]?.start;
  const last = merged[merged.length - 1]?.end;
  const ongoing =
    last != null &&
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth();

  return {
    technology: tech,
    first_year: first ? String(first.getFullYear()) : "",
    last_year: ongoing ? "Present" : last ? String(last.getFullYear()) : "",
    total_years: formatDuration(totalMonths),
  };
}

/** Per-technology experience using alias-aware matching over dated employment/projects. */
export function computeTechExperience(
  extracted: ExtractedResumeData,
  technologies: string[],
  now = new Date(),
): TechExperienceEntry[] {
  const claims = extracted.experience_claims ?? [];

  return technologies.map((tech) => {
    const periods = collectTechPeriods(tech, extracted, now);
    if (periods.length) return entryFromPeriods(tech, periods, now);

    const fromClaim = parseExperienceClaim(claims, tech, now);
    if (fromClaim) return fromClaim;

    return {
      technology: tech,
      first_year: "",
      last_year: "",
      total_years: "",
    };
  });
}

export function buildCareerHistory(
  extracted: ExtractedResumeData,
  now = new Date(),
): CareerEntry[] {
  return (extracted.employment ?? []).map((job) => {
    const start = resolvePeriodStart(job.start_date);
    const end = resolvePeriodEnd(job.end_date, job.is_current, now);
    const ongoing = Boolean(job.is_current) || isPresent(job.end_date ?? "") || !job.end_date?.trim();
    let duration = "";
    if (start && end) {
      duration = formatDuration(monthsBetweenInclusive(start, end));
    }

    return {
      company: job.company?.trim() || "Company not specified",
      title: job.title?.trim() || "Role not specified",
      start: formatDisplayDate(job.start_date) || job.start_date?.trim() || "",
      end: ongoing ? "Present" : formatDisplayDate(job.end_date) || job.end_date?.trim() || "",
      duration,
      is_current: ongoing,
    };
  });
}

function monthsBetweenInclusive(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

export function computeTotalCareerExperience(careerHistory: CareerEntry[]): string {
  let totalMonths = 0;
  let counted = false;
  for (const role of careerHistory) {
    const start = parseMonthYear(role.start);
    const end = isPresent(role.end) ? new Date() : parseMonthYear(role.end);
    if (start && end) {
      totalMonths += monthsBetweenInclusive(start, end);
      counted = true;
    } else if (role.duration) {
      const fromDuration = role.duration.match(/(\d+)\s*yrs?/i);
      const mo = role.duration.match(/(\d+)\s*mos?/i);
      if (fromDuration || mo) {
        if (fromDuration) totalMonths += Number(fromDuration[1]) * 12;
        if (mo) totalMonths += Number(mo[1]);
        counted = true;
      }
    }
  }
  return counted ? formatDuration(totalMonths) : "";
}

/** Shortest hands-on experience among matched required-stack technologies. */
export function computeRelevantStackExperience(
  techExperience: TechExperienceEntry[],
  matchedTechnologies: string[],
): string {
  const relevant = techExperience.filter(
    (entry) =>
      entry.total_years &&
      matchedTechnologies.some((tech) => techNamesEquivalent(tech, entry.technology)),
  );
  if (!relevant.length) return "";

  const minMonths = Math.min(
    ...relevant.map((entry) => {
      const yr = entry.total_years.match(/(\d+)\s*yrs?/i);
      const mo = entry.total_years.match(/(\d+)\s*mos?/i);
      let months = 0;
      if (yr) months += Number(yr[1]) * 12;
      if (mo) months += Number(mo[1]);
      if (!yr && !mo && entry.total_years.includes("< 1")) months = 1;
      return months;
    }),
  );
  return formatDuration(minMonths);
}

export function summarizeExperienceClaims(claims: string[] | undefined): string {
  if (!claims?.length) return "";
  return claims.slice(0, 3).join("; ");
}

export function deriveCurrentEmployment(careerHistory: CareerEntry[]) {
  const current = careerHistory.find((c) => c.is_current) ?? careerHistory[0];
  if (!current) {
    return {
      is_currently_employed: false,
      current_employer: "",
      current_role: "",
      current_tenure: "",
    };
  }
  return {
    is_currently_employed: Boolean(current.is_current),
    current_employer: current.company,
    current_role: current.title,
    current_tenure: current.duration,
  };
}

/**
 * Deterministic experience fields from extracted resume facts.
 * Uses alias-aware tech matching and employment/project date ranges.
 */
export function reconcileExperience(
  extractedData: Record<string, unknown>,
  projectTechStack: string[],
  matchedTechnologies: string[],
  llmMetrics: Record<string, unknown>,
): Record<string, unknown> {
  const extracted = extractedData as ExtractedResumeData;
  const now = new Date();

  const career_history = buildCareerHistory(extracted, now);
  const total_experience_calculated = computeTotalCareerExperience(career_history);
  const total_experience_mentioned =
    summarizeExperienceClaims(extracted.experience_claims) ||
    (llmMetrics.total_experience_mentioned as string | undefined) ||
    "";

  const stackSet = new Set(projectTechStack);
  const extraMentioned = (extracted.technologies_mentioned ?? []).filter(
    (tech) => ![...stackSet].some((required) => techNamesEquivalent(required, tech)),
  );
  const tech_experience = computeTechExperience(
    extracted,
    [...projectTechStack, ...extraMentioned.slice(0, 8)],
    now,
  );

  const relevant_experience =
    computeRelevantStackExperience(tech_experience, matchedTechnologies) ||
    total_experience_calculated;

  return {
    ...llmMetrics,
    career_history,
    tech_experience,
    total_experience_calculated,
    total_experience_mentioned,
    relevant_experience,
    ...deriveCurrentEmployment(career_history),
  };
}
