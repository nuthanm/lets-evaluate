/** Feature areas mapped to product functionality for the trust dashboard. */
export const FEATURE_AREAS = [
  "landing",
  "auth",
  "candidates",
  "screening",
  "bulk",
  "booking",
  "setup",
  "library",
  "jobs",
  "archive",
  "pipeline",
  "email",
  "rbac",
  "domain",
  "load",
] as const;

export type FeatureArea = (typeof FEATURE_AREAS)[number];

export const FEATURE_LABELS: Record<FeatureArea, string> = {
  landing: "Landing & marketing",
  auth: "Authentication & registration",
  candidates: "Candidate evaluate",
  screening: "AI screening portal",
  bulk: "Bulk import & jobs",
  booking: "Interview booking",
  setup: "Admin setup",
  library: "Question library",
  jobs: "Job descriptions",
  archive: "Archive & records",
  pipeline: "Pipeline views",
  email: "Email & templates",
  rbac: "Roles & access control",
  domain: "Core domain logic",
  load: "Load & performance",
};

export function inferFeatureArea(input: {
  filePath?: string;
  suiteTitle?: string;
  testName?: string;
  suiteType?: string;
}): FeatureArea {
  const haystack = `${input.filePath ?? ""} ${input.suiteTitle ?? ""} ${input.testName ?? ""}`.toLowerCase();

  if (input.suiteType === "load") return "load";
  if (haystack.includes("bulk") || haystack.includes("csv-parser")) return "bulk";
  if (haystack.includes("screening") || haystack.includes("proctoring")) return "screening";
  if (haystack.includes("candidate")) return "candidates";
  if (haystack.includes("booking") || haystack.includes("assignment") || haystack.includes("interview"))
    return "booking";
  if (haystack.includes("setup") || haystack.includes("project") || haystack.includes("pipeline-stage"))
    return "setup";
  if (haystack.includes("library") || haystack.includes("question")) return "library";
  if (haystack.includes("job-description")) return "jobs";
  if (haystack.includes("archive")) return "archive";
  if (haystack.includes("pipeline") && !haystack.includes("screening-pipeline")) return "pipeline";
  if (haystack.includes("mail") || haystack.includes("email")) return "email";
  if (haystack.includes("rbac") || haystack.includes("401") || haystack.includes("403")) return "rbac";
  if (haystack.includes("auth") || haystack.includes("login") || haystack.includes("register"))
    return "auth";
  if (haystack.includes("landing") || haystack.includes("workflow") || haystack.includes("quality proof"))
    return "landing";
  if (haystack.includes("domain") || haystack.includes("src/lib/domain")) return "domain";
  if (haystack.includes("validation")) return "auth";

  return "domain";
}
