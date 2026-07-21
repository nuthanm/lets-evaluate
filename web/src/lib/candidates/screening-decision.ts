export const SCREENING_NOTES_MIN_LEN = 40;

export type ScreeningDecision = "proceed" | "hold" | "reject";

export function isOverridingAiReject(
  aiRecommendation: string | undefined,
  decision: ScreeningDecision,
): boolean {
  return (
    aiRecommendation === "Reject" &&
    (decision === "proceed" || decision === "hold")
  );
}

export function validateScreeningDecision(
  comments: string | undefined,
  decision: ScreeningDecision,
  aiRecommendation?: string,
): string | null {
  const trimmed = comments?.trim() ?? "";
  if (trimmed.length < SCREENING_NOTES_MIN_LEN) {
    if (isOverridingAiReject(aiRecommendation, decision)) {
      return `Justification is required when overriding an AI Reject recommendation (minimum ${SCREENING_NOTES_MIN_LEN} characters). Explain why this candidate should advance.`;
    }
    return `Screening notes are required before recording a decision (minimum ${SCREENING_NOTES_MIN_LEN} characters).`;
  }
  return null;
}
