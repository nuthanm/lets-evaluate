import { describe, it, expect } from "vitest";
import { recordViolation, canGrantRetry, PROCTORING } from "@/lib/domain/proctoring-policy";

describe("proctoring-policy", () => {
  it("warns on first strike", () => {
    const r = recordViolation(0, "tab_switch");
    expect(r.action).toBe("warn");
    expect(r.strikeCount).toBe(1);
  });

  it("disqualifies on second strike", () => {
    const r = recordViolation(1, "idle");
    expect(r.action).toBe("disqualify");
    expect(r.strikeCount).toBe(2);
  });

  it("respects max strikes constant", () => {
    expect(PROCTORING.maxStrikes).toBe(2);
  });

  it("allows one retry grant", () => {
    expect(canGrantRetry(0)).toBe(true);
    expect(canGrantRetry(1)).toBe(false);
  });
});
