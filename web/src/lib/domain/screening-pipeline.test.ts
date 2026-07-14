import { describe, it, expect } from "vitest";
import {
  PIPELINE_STEPS,
  nextStep,
  stepColor,
  isTransientError,
  MAX_PIPELINE_RETRIES,
} from "@/lib/domain/screening-pipeline";

describe("screening-pipeline", () => {
  it("defines ordered steps", () => {
    expect(PIPELINE_STEPS[0]).toBe("queued");
    expect(PIPELINE_STEPS.at(-1)).toBe("completed");
  });

  it("advances to next step", () => {
    expect(nextStep("queued")).toBe("creating_profile");
    expect(nextStep("analyzing")).toBe("generating_questions");
    expect(nextStep("completed")).toBeNull();
  });

  it("maps step colors", () => {
    expect(stepColor("analyzing")).toBe("blue");
    expect(stepColor("awaiting_interview")).toBe("amber");
    expect(stepColor("completed")).toBe("green");
    expect(stepColor("analyzing", "failed")).toBe("red");
    expect(stepColor("queued", "retry_pending")).toBe("purple");
  });

  it("detects transient errors", () => {
    expect(isTransientError("OpenAI rate limit exceeded")).toBe(true);
    expect(isTransientError("HTTP 503 Service Unavailable")).toBe(true);
    expect(isTransientError("No resume text")).toBe(false);
  });

  it("has retry limit", () => {
    expect(MAX_PIPELINE_RETRIES).toBe(3);
  });
});
