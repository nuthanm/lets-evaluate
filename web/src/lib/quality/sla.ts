/** Standard response-time SLA for UI and API flows (milliseconds). */
export const SLA_THRESHOLD_MS = 3000;

export type SlaStatus = "within_sla" | "sla_breach" | "not_applicable";

type SlaInput = {
  durationMs: number;
  testStatus: "passed" | "failed" | "skipped";
  suiteType?: string;
  thresholdMs?: number;
};

/** Unit tests measure correctness, not UI/API response-time SLA. */
export function isSlaApplicable(input: { suiteType?: string; testStatus: SlaInput["testStatus"] }): boolean {
  if (input.testStatus === "skipped") return false;
  if (input.suiteType === "unit") return false;
  return true;
}

export function computeSlaStatus(
  durationMs: number,
  testStatus: SlaInput["testStatus"],
  thresholdMsOrSuiteType: number | string = SLA_THRESHOLD_MS,
  suiteType?: string,
): SlaStatus {
  const thresholdMs =
    typeof thresholdMsOrSuiteType === "number" ? thresholdMsOrSuiteType : SLA_THRESHOLD_MS;
  const resolvedSuiteType =
    typeof thresholdMsOrSuiteType === "string" ? thresholdMsOrSuiteType : suiteType;

  if (!isSlaApplicable({ suiteType: resolvedSuiteType, testStatus })) {
    return "not_applicable";
  }
  if (testStatus === "failed") return "sla_breach";
  return durationMs <= thresholdMs ? "within_sla" : "sla_breach";
}

export function summarizeSlaStatuses(statuses: SlaStatus[]) {
  return {
    compliant: statuses.filter((s) => s === "within_sla").length,
    breach: statuses.filter((s) => s === "sla_breach").length,
    excluded: statuses.filter((s) => s === "not_applicable").length,
    measured: statuses.filter((s) => s !== "not_applicable").length,
  };
}

export function slaLabel(status: SlaStatus): string {
  switch (status) {
    case "within_sla":
      return "Within SLA";
    case "sla_breach":
      return "SLA Breach";
    default:
      return "N/A";
  }
}

export function slaColor(status: SlaStatus): string {
  switch (status) {
    case "within_sla":
      return "var(--green)";
    case "sla_breach":
      return "var(--orange)";
    default:
      return "var(--ink-faint)";
  }
}
