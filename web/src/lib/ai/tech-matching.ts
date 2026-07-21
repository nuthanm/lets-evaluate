import { expandTechAliases, techNamesEquivalent, textMentionsTech } from "@/lib/ai/tech-aliases";
import {
  type ExtractedResumeData,
  reconcileExperience,
} from "@/lib/ai/tech-experience";

type TechComparisonEntry = {
  technology: string;
  status: string;
};

type Clarification = {
  technology: string;
  reason: string;
};

type Suitability = {
  verdict: string;
  description: string;
};

type ResumeMetricsLike = {
  suitability?: Suitability;
};

export type { ExtractedResumeData };
export type TechMatchStatus = "Matched" | "Unmatched" | "Clarification";

/** Classify one required stack item against extracted resume facts. */
export function matchRequiredTech(
  requiredTech: string,
  extracted: ExtractedResumeData,
): TechMatchStatus {
  const employment = extracted.employment ?? [];

  for (const job of employment) {
    const block = [job.title, job.description].filter(Boolean).join(" ");
    for (const variant of expandTechAliases(requiredTech)) {
      if (textMentionsTech(block, variant)) return "Matched";
    }
  }

  const skillSources = [
    ...(extracted.technologies_mentioned ?? []),
    ...(extracted.certifications ?? []),
  ];

  for (const source of skillSources) {
    for (const variant of expandTechAliases(requiredTech)) {
      if (techNamesEquivalent(source, variant) || textMentionsTech(source, variant)) {
        return "Clarification";
      }
    }
  }

  return "Unmatched";
}

export function buildTechComparison(
  projectTechStack: string[],
  extracted: ExtractedResumeData,
): TechComparisonEntry[] {
  return projectTechStack.map((technology) => ({
    technology,
    status: matchRequiredTech(technology, extracted),
  }));
}

export function buildSuitabilityDescription(input: {
  recommendation: string;
  matched: string[];
  missing: string[];
  clarifications: Clarification[];
}): string {
  const { recommendation, matched, missing, clarifications } = input;
  const clarificationTechs = clarifications.map((c) => c.technology);

  if (recommendation === "Proceed") {
    return matched.length
      ? `Strong alignment with the required stack (${matched.join(", ")}). No material gaps identified in project work.`
      : "Strong alignment with the required stack. No material gaps identified in project work.";
  }

  if (recommendation === "Hold") {
    const parts: string[] = [];
    if (matched.length) {
      parts.push(`Solid match on ${matched.join(", ")}`);
    }
    if (clarificationTechs.length) {
      parts.push(
        `clarification needed on ${clarificationTechs.join(", ")} — listed in skills or certifications but not clearly tied to dated project work`,
      );
    }
    if (missing.length) {
      parts.push(`gaps remain in ${missing.join(", ")}`);
    }
    if (parts.length === 0) {
      return "Review recommended before proceeding — some stack items need recruiter confirmation.";
    }
    return `${parts.join("; ")}.`;
  }

  const parts: string[] = [];
  if (matched.length) {
    parts.push(`Some overlap on ${matched.join(", ")}`);
  }
  if (missing.length) {
    parts.push(`significant gaps in ${missing.join(", ")}`);
  }
  if (clarificationTechs.length) {
    parts.push(
      `${clarificationTechs.join(", ")} listed without clear project evidence`,
    );
  }
  if (parts.length === 0) {
    return "The required stack is not sufficiently covered based on the resume.";
  }
  return `${parts.join(", but ")}.`;
}

export function computeRecommendationFromComparison(
  techComparison: TechComparisonEntry[],
): {
  tech_match_score: number;
  recommendation: string;
  suitability: Suitability;
  matched_technologies: string[];
  missing_technologies: string[];
  clarifications: Clarification[];
} {
  const matched = techComparison.filter((t) => t.status === "Matched");
  const clarifications = techComparison.filter((t) => t.status === "Clarification");
  const missing = techComparison.filter((t) => t.status === "Unmatched");
  const total = techComparison.length;
  const tech_match_score = total ? Math.round((matched.length / total) * 100) : 0;
  const clarification_count = clarifications.length;
  const unmatched_count = missing.length;
  const effective_score = total
    ? Math.round(((matched.length + 0.5 * clarifications.length) / total) * 100)
    : 0;

  let recommendation: string;
  let verdict: string;

  if (tech_match_score >= 80 && clarification_count === 0) {
    recommendation = "Proceed";
    verdict = "Suitable";
  } else if (unmatched_count === 0 && clarification_count > 0) {
    // Every required tech appears somewhere — only project-work proof is missing.
    recommendation = "Hold";
    verdict = "Partially suitable";
  } else if (effective_score >= 80 && clarification_count > 0) {
    recommendation = "Hold";
    verdict = "Partially suitable";
  } else if (effective_score >= 55 || tech_match_score >= 60) {
    recommendation = "Hold";
    verdict = "Partially suitable";
  } else {
    recommendation = "Reject";
    verdict = "Not suitable";
  }

  const clarificationsList = clarifications.map((c) => ({
    technology: c.technology,
    reason: `${c.technology} appears in skills or certifications but is not clearly tied to dated project work in employment history.`,
  }));

  const matchedNames = matched.map((t) => t.technology);
  const missingNames = missing.map((t) => t.technology);

  return {
    tech_match_score,
    recommendation,
    suitability: {
      verdict,
      description: buildSuitabilityDescription({
        recommendation,
        matched: matchedNames,
        missing: missingNames,
        clarifications: clarificationsList,
      }),
    },
    matched_technologies: matchedNames,
    missing_technologies: missingNames,
    clarifications: clarificationsList,
  };
}

/**
 * Apply deterministic alias-aware tech matching on top of LLM narrative output.
 * Tech status, score, and recommendation always come from code — not the model.
 */
export function reconcileTechMatching(
  extractedData: Record<string, unknown>,
  projectTechStack: string[],
  llmMetrics: ResumeMetricsLike & Record<string, unknown>,
): Record<string, unknown> {
  const extracted = extractedData as ExtractedResumeData;
  const tech_comparison = buildTechComparison(projectTechStack, extracted);
  const derived = computeRecommendationFromComparison(tech_comparison);

  const withMatching = {
    ...llmMetrics,
    tech_comparison,
    tech_match_score: derived.tech_match_score,
    matched_technologies: derived.matched_technologies,
    missing_technologies: derived.missing_technologies,
    clarifications: derived.clarifications,
    recommendation: derived.recommendation,
    suitability: {
      verdict: derived.suitability.verdict,
      description: derived.suitability.description,
    },
  };

  return reconcileExperience(
    extractedData,
    projectTechStack,
    derived.matched_technologies,
    withMatching,
  );
}

/** Re-derive recommendation and suitability from stored tech comparison (fixes legacy AI text mismatches). */
export function resolveScreeningVerdict(metrics: {
  tech_comparison?: { technology: string; status: string }[];
  recommendation?: string;
  tech_match_score?: number;
  suitability?: { verdict?: string; description?: string };
}) {
  if (metrics.tech_comparison?.length) {
    const derived = computeRecommendationFromComparison(metrics.tech_comparison);
    return {
      recommendation: derived.recommendation,
      tech_match_score: derived.tech_match_score,
      suitability: derived.suitability,
    };
  }
  return {
    recommendation: metrics.recommendation ?? "Hold",
    tech_match_score: metrics.tech_match_score ?? 0,
    suitability: metrics.suitability ?? { verdict: "", description: "" },
  };
}
