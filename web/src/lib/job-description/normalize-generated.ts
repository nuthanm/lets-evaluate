import {
  ensureGreatPlaceToWorkLine,
  jobDescriptionSchema,
  type GenerateJobDescriptionInput,
  type JobDescription,
} from "@/lib/job-description/types";

function clampArray(items: string[] | undefined, min: number, max: number, fallback: string[]) {
  const source = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (source.length >= min) return source.slice(0, max);
  return fallback.slice(0, max);
}

export function normalizeGeneratedJobDescription(
  input: GenerateJobDescriptionInput,
  parsed: Record<string, unknown>,
  orgName: string,
): JobDescription {
  const candidate = {
    roleTitle: input.roleTitle,
    location: input.location,
    experience: input.experience,
    aboutRole:
      typeof parsed.aboutRole === "string" && parsed.aboutRole.trim()
        ? parsed.aboutRole.trim()
        : `${input.roleTitle} at ${orgName} plays a high-impact role in delivering measurable outcomes for enterprise clients through strong execution and collaboration.`,
    whatYoullDo: clampArray(
      Array.isArray(parsed.whatYoullDo)
        ? parsed.whatYoullDo.filter((item): item is string => typeof item === "string")
        : undefined,
      6,
      8,
      [
        "Own assigned responsibilities end to end with clear quality and delivery commitments.",
        "Collaborate with cross-functional stakeholders to translate goals into practical execution plans.",
        "Drive design, implementation, and improvement of scalable, maintainable solutions.",
        "Identify risks early and resolve blockers with clear, data-backed recommendations.",
        "Contribute to standards that improve team effectiveness, consistency, and reuse.",
        "Communicate progress, dependencies, and outcomes clearly to project and business leaders.",
      ],
    ),
    whatYouBring: {
      summary:
        typeof parsed.whatYouBring === "object" &&
        parsed.whatYouBring &&
        typeof (parsed.whatYouBring as { summary?: unknown }).summary === "string"
          ? ((parsed.whatYouBring as { summary: string }).summary || "").trim() ||
            "You bring strong execution fundamentals, role-aligned technical depth, and a collaborative mindset."
          : "You bring strong execution fundamentals, role-aligned technical depth, and a collaborative mindset.",
      skills: clampArray(
        typeof parsed.whatYouBring === "object" && parsed.whatYouBring
          ? Array.isArray((parsed.whatYouBring as { skills?: unknown[] }).skills)
            ? (parsed.whatYouBring as { skills: unknown[] }).skills.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined
          : undefined,
        4,
        12,
        [
          `${input.experience} of relevant professional experience aligned to ${input.roleTitle}.`,
          "Strong communication and stakeholder management across technical and business teams.",
          "Hands-on delivery mindset with attention to quality, reliability, and maintainability.",
          "Ability to work effectively in fast-paced, outcome-driven project environments.",
        ],
      ),
      domain:
        typeof parsed.whatYouBring === "object" &&
        parsed.whatYouBring &&
        typeof (parsed.whatYouBring as { domain?: unknown }).domain === "string"
          ? ((parsed.whatYouBring as { domain: string }).domain || "").trim() ||
            input.domain?.trim() ||
            "Experience in enterprise-grade delivery environments."
          : input.domain?.trim() || "Experience in enterprise-grade delivery environments.",
    },
    whyJoinKanini: ensureGreatPlaceToWorkLine(
      clampArray(
        Array.isArray(parsed.whyJoinKanini)
          ? parsed.whyJoinKanini.filter((item): item is string => typeof item === "string")
          : undefined,
        3,
        6,
        [
          `Recognized as a Great Place to Work, ${orgName} invests in people, trust, and long-term growth.`,
          "Work on high-impact enterprise programs with modern platforms and experienced teams.",
          "Expand your technical and domain expertise through cross-functional collaboration and ownership.",
        ],
      ),
    ),
    readyToMakeImpact:
      typeof parsed.readyToMakeImpact === "string" && parsed.readyToMakeImpact.trim()
        ? parsed.readyToMakeImpact.trim()
        : `Ready to build meaningful outcomes with ${orgName}? Apply now and help shape impactful solutions for global clients.`,
    generatedAt: new Date().toISOString(),
  };

  return jobDescriptionSchema.parse(candidate);
}
