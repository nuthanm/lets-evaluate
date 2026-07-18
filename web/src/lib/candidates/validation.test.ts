import { describe, expect, it } from "vitest";
import {
  validateCandidateEmail,
  validateCandidateName,
  validateResumeTextLength,
} from "./validation";

describe("validateCandidateName", () => {
  it("requires a name", () => {
    expect(validateCandidateName("   ")).toMatch(/required/i);
  });

  it("rejects overly long names", () => {
    expect(validateCandidateName("x".repeat(121))).toMatch(/120 characters/i);
  });

  it("accepts valid names", () => {
    expect(validateCandidateName("Ada Lovelace")).toBeNull();
  });
});

describe("validateCandidateEmail", () => {
  it("requires email", () => {
    expect(validateCandidateEmail("")).toMatch(/required/i);
  });

  it("rejects invalid email", () => {
    expect(validateCandidateEmail("not-an-email")).toMatch(/valid email/i);
  });

  it("accepts valid email", () => {
    expect(validateCandidateEmail("ada@example.com")).toBeNull();
  });
});

describe("validateResumeTextLength", () => {
  it("rejects oversized resume text", () => {
    expect(validateResumeTextLength("a".repeat(20001))).toMatch(/too long/i);
  });

  it("accepts normal resume length", () => {
    expect(validateResumeTextLength("Experienced engineer…")).toBeNull();
  });
});
