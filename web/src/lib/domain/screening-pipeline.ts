/** Per-candidate bulk pipeline steps — order matters. */
export const PIPELINE_STEPS = [
  "queued",
  "creating_profile",
  "analyzing",
  "generating_questions",
  "preparing_email",
  "awaiting_email",
  "awaiting_interview",
  "evaluating",
  "applying_verdict",
  "completed",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export type StepColor = "gray" | "blue" | "amber" | "green" | "red" | "purple";

const STEP_COLORS: Record<PipelineStep, StepColor> = {
  queued: "gray",
  creating_profile: "gray",
  analyzing: "blue",
  generating_questions: "blue",
  preparing_email: "amber",
  awaiting_email: "amber",
  awaiting_interview: "amber",
  evaluating: "blue",
  applying_verdict: "blue",
  completed: "green",
};

export function stepColor(step: PipelineStep, status?: string): StepColor {
  if (status === "failed") return "red";
  if (status === "disqualified") return "red";
  if (status === "retry_pending") return "purple";
  return STEP_COLORS[step] ?? "gray";
}

export function stepLabel(step: PipelineStep): string {
  const labels: Record<PipelineStep, string> = {
    queued: "Queued",
    creating_profile: "Creating profile",
    analyzing: "AI analysis",
    generating_questions: "Generating questions",
    preparing_email: "Preparing email",
    awaiting_email: "Awaiting email send",
    awaiting_interview: "Awaiting AI interview",
    evaluating: "Evaluating answers",
    applying_verdict: "Applying verdict",
    completed: "Completed",
  };
  return labels[step];
}

export function nextStep(current: PipelineStep): PipelineStep | null {
  const i = PIPELINE_STEPS.indexOf(current);
  if (i < 0 || i >= PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[i + 1];
}

export function isTransientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("timeout") ||
    m.includes("econnreset") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500")
  );
}

export const MAX_PIPELINE_RETRIES = 3;
