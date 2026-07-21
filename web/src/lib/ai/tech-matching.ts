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

  let recommendation: string;
  let verdict: string;

  if (tech_match_score >= 80 && clarification_count === 0) {
    recommendation = "Proceed";
    verdict = "Suitable";
  } else if (tech_match_score >= 80 && clarification_count > 0) {
    recommendation = "Hold";
    verdict = "Partially suitable";
  } else if (tech_match_score >= 60) {
    recommendation = "Hold";
    verdict = "Partially suitable";
  } else {
    recommendation = "Reject";
    verdict = "Not suitable";
  }

  return {
    tech_match_score,
    recommendation,
    suitability: {
      verdict,
      description: "",
    },
    matched_technologies: matched.map((t) => t.technology),
    missing_technologies: missing.map((t) => t.technology),
    clarifications: clarifications.map((c) => ({
      technology: c.technology,
      reason: `${c.technology} appears in skills or certifications but is not clearly tied to dated project work in employment history.`,
    })),
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
      description:
        llmMetrics.suitability?.description?.trim() ||
        derived.suitability.description,
    },
  };

  return reconcileExperience(
    extractedData,
    projectTechStack,
    derived.matched_technologies,
    withMatching,
  );
}
