/**
 * When enabled, all OpenAI calls are blocked and deterministic fixtures are returned.
 * Set automatically during `npm run test:quality` — never bills API usage.
 */
export function isAiTestMode(): boolean {
  return (
    process.env.AI_TEST_MODE === "1" ||
    process.env.VITEST === "true" ||
    process.env.PLAYWRIGHT_TEST === "1"
  );
}

/** Human-readable label stored on quality runs. */
export function aiTestEnvironmentLabel(base = "production"): string {
  return isAiTestMode() ? `${base} · AI mocked (no API cost)` : base;
}
