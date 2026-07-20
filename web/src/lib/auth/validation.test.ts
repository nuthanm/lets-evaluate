import { describe, expect, it } from "vitest";
import {
  buildEmail,
  getPasswordStrength,
  normalizeLoginCredentials,
  validatePassword,
  validateUsername,
} from "./validation";

describe("validateUsername", () => {
  it("rejects empty username", () => {
    expect(validateUsername("")).toMatch(/required/i);
  });

  it("rejects email-style input", () => {
    expect(validateUsername("user@kanini.com")).toMatch(/@domain/i);
  });

  it("accepts valid username", () => {
    expect(validateUsername("nuthan.m")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("requires mixed character classes", () => {
    expect(validatePassword("short")).toMatch(/8 characters/i);
    expect(validatePassword("alllowercase1!")).toMatch(/uppercase/i);
    expect(validatePassword("ALLUPPERCASE1!")).toMatch(/lowercase/i);
    expect(validatePassword("NoNumbers!!")).toMatch(/number/i);
    expect(validatePassword("NoSpecial123")).toMatch(/special/i);
  });

  it("accepts strong password", () => {
    expect(validatePassword("Kanini@2026")).toBeNull();
  });
});

describe("getPasswordStrength", () => {
  it("scores password checks", () => {
    const weak = getPasswordStrength("abc");
    const strong = getPasswordStrength("Kanini@2026");
    expect(weak.score).toBeLessThan(strong.score);
    expect(strong.label).toBe("Strong");
  });
});

describe("buildEmail", () => {
  it("combines username and domain", () => {
    expect(buildEmail("Nuthan", "kanini.com")).toBe("nuthan@kanini.com");
  });
});

describe("normalizeLoginCredentials", () => {
  it("requires username", () => {
    expect(normalizeLoginCredentials({ email: "", password: "x" })).toEqual({
      ok: false,
      error: "Username is required",
    });
  });

  it("builds email from username", () => {
    const result = normalizeLoginCredentials({
      email: "nuthan.m",
      password: "Kanini@2026",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toContain("@");
    }
  });
});
