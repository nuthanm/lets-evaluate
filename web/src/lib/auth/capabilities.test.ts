import { describe, expect, it } from "vitest";
import {
  canMutateCandidate,
  canViewAllCandidates,
  canViewRecruiterPerformance,
  isPanelRole,
  isRecruiterRole,
} from "./capabilities";

describe("capabilities", () => {
  it("lets TAs and TA leads see all candidates", () => {
    expect(canViewAllCandidates("ta")).toBe(true);
    expect(canViewAllCandidates("ta_lead")).toBe(true);
    expect(canViewAllCandidates("manager")).toBe(false);
  });

  it("restricts recruiter mutations to ownership", () => {
    expect(canMutateCandidate("ta", "u1", "u1")).toBe(true);
    expect(canMutateCandidate("ta", "u1", "u2")).toBe(false);
    expect(canMutateCandidate("ta_lead", "u1", "u2")).toBe(false);
    expect(canMutateCandidate("admin", "u1", "u2")).toBe(true);
  });

  it("reserves performance dashboards for admin and TA lead", () => {
    expect(canViewRecruiterPerformance("ta_lead")).toBe(true);
    expect(canViewRecruiterPerformance("admin")).toBe(true);
    expect(canViewRecruiterPerformance("ta")).toBe(false);
    expect(canViewRecruiterPerformance("manager")).toBe(false);
  });

  it("keeps manager as a panel role", () => {
    expect(isPanelRole("manager")).toBe(true);
    expect(isRecruiterRole("manager")).toBe(false);
    expect(isRecruiterRole("ta_lead")).toBe(true);
  });
});
