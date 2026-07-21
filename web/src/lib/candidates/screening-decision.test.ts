import { describe, it, expect } from "vitest";
import {
  isOverridingAiReject,
  validateScreeningDecision,
  SCREENING_NOTES_MIN_LEN,
} from "@/lib/candidates/screening-decision";

describe("screening-decision", () => {
  it("requires minimum note length for every decision", () => {
    expect(validateScreeningDecision("", "proceed")).toMatch(/required/i);
    expect(validateScreeningDecision("short", "hold")).toMatch(/required/i);
    expect(validateScreeningDecision("x".repeat(SCREENING_NOTES_MIN_LEN - 1), "reject")).toMatch(
      /required/i,
    );
    expect(
      validateScreeningDecision("x".repeat(SCREENING_NOTES_MIN_LEN), "proceed"),
    ).toBeNull();
  });

  it("detects AI reject overrides", () => {
    expect(isOverridingAiReject("Reject", "proceed")).toBe(true);
    expect(isOverridingAiReject("Reject", "hold")).toBe(true);
    expect(isOverridingAiReject("Reject", "reject")).toBe(false);
    expect(isOverridingAiReject("Proceed", "proceed")).toBe(false);
  });

  it("uses override-specific error when AI rejected and notes are short", () => {
    expect(validateScreeningDecision("too short", "proceed", "Reject")).toMatch(
      /overriding an AI Reject/i,
    );
  });
});
