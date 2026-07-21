import { describe, expect, it } from "vitest";
import { expandTechAliases, techNamesEquivalent } from "@/lib/ai/tech-aliases";
import {
  buildTechComparison,
  computeRecommendationFromComparison,
  matchRequiredTech,
} from "@/lib/ai/tech-matching";

describe("techNamesEquivalent", () => {
  it("treats EFCore and Entity Framework as equivalent", () => {
    expect(techNamesEquivalent("EFCore", "Entity Framework")).toBe(true);
    expect(techNamesEquivalent("Entity Framework Core", "EFCore")).toBe(true);
  });

  it("treats JS and JavaScript as equivalent", () => {
    expect(techNamesEquivalent("JS", "JavaScript")).toBe(true);
  });

  it("does not match unrelated technologies", () => {
    expect(techNamesEquivalent("EFCore", "Hibernate")).toBe(false);
    expect(techNamesEquivalent("React", "Angular")).toBe(false);
  });
});

describe("expandTechAliases", () => {
  it("includes alias variants for EFCore", () => {
    const variants = expandTechAliases("EFCore");
    expect(variants).toContain("Entity Framework");
    expect(variants).toContain("Entity Framework Core");
  });
});

describe("matchRequiredTech", () => {
  it("matches Entity Framework in employment when stack requires EFCore", () => {
    const status = matchRequiredTech("EFCore", {
      employment: [
        {
          title: "Senior .NET Developer",
          description: "Built APIs with Entity Framework and SQL Server",
        },
      ],
      technologies_mentioned: [],
    });
    expect(status).toBe("Matched");
  });

  it("flags Clarification when Entity Framework is only in skills", () => {
    const status = matchRequiredTech("EFCore", {
      employment: [{ title: "Developer", description: "Built REST APIs" }],
      technologies_mentioned: ["Entity Framework", "C#"],
    });
    expect(status).toBe("Clarification");
  });

  it("returns Unmatched when no alias appears anywhere", () => {
    const status = matchRequiredTech("EFCore", {
      employment: [{ title: "Developer", description: "Python and Django" }],
      technologies_mentioned: ["Python", "Django"],
    });
    expect(status).toBe("Unmatched");
  });
});

describe("computeRecommendationFromComparison", () => {
  it("Proceed when high match with no clarifications", () => {
    const result = computeRecommendationFromComparison([
      { technology: "Node.js", status: "Matched" },
      { technology: "React", status: "Matched" },
      { technology: "PostgreSQL", status: "Matched" },
      { technology: "Docker", status: "Matched" },
      { technology: "AWS", status: "Matched" },
    ]);
    expect(result.recommendation).toBe("Proceed");
    expect(result.tech_match_score).toBe(100);
  });

  it("Hold when high match but clarifications exist", () => {
    const result = computeRecommendationFromComparison([
      { technology: "Node.js", status: "Matched" },
      { technology: "React", status: "Matched" },
      { technology: "PostgreSQL", status: "Clarification" },
      { technology: "Docker", status: "Matched" },
      { technology: "AWS", status: "Matched" },
    ]);
    expect(result.recommendation).toBe("Hold");
    expect(result.tech_match_score).toBe(80);
    expect(result.clarifications).toHaveLength(1);
  });
});

describe("buildTechComparison", () => {
  it("scores alias match across the full stack", () => {
    const comparison = buildTechComparison(["EFCore", "C#"], {
      employment: [
        {
          title: ".NET Engineer",
          description: "Delivered services using Entity Framework and C#",
        },
      ],
    });
    expect(comparison).toEqual([
      { technology: "EFCore", status: "Matched" },
      { technology: "C#", status: "Matched" },
    ]);
  });
});
