export type ViolationType = "tab_switch" | "idle" | "camera";

export type ViolationResult =
  | { action: "warn"; message: string; strikeCount: number }
  | { action: "disqualify"; message: string; strikeCount: number };

export const PROCTORING = {
  maxStrikes: 2,
  idleThresholdMs: 60_000,
  idleMaxWarnings: 3,
} as const;

/**
 * Tab switch and idle violations share a combined strike counter.
 * 1st strike → warning; 2nd strike → disqualify.
 */
export function recordViolation(
  currentStrikes: number,
  type: ViolationType,
): ViolationResult {
  const next = currentStrikes + 1;

  if (next >= PROCTORING.maxStrikes) {
    const reason =
      type === "tab_switch"
        ? "You switched away from the interview window more than once."
        : type === "idle"
          ? "You were inactive for too long during the interview."
          : "A proctoring violation was detected.";
    return {
      action: "disqualify",
      message: `${reason} This session has been ended.`,
      strikeCount: next,
    };
  }

  const message =
    type === "tab_switch"
      ? "Warning: Please stay on this tab during your screening interview."
      : type === "idle"
        ? "Warning: You have been inactive. Please continue your interview."
        : "Warning: Please keep your camera focused on the screen.";

  return { action: "warn", message, strikeCount: next };
}

export function canGrantRetry(retryCount: number, maxRetries = 1): boolean {
  return retryCount < maxRetries;
}
