import { describe, expect, it } from "vitest";
import {
  buildCareerHistory,
  computeRelevantStackExperience,
  computeTechExperience,
  computeTotalCareerExperience,
} from "@/lib/ai/tech-experience";

const sampleExtracted = {
  employment: [
    {
      company: "TechCorp",
      title: "Senior .NET Developer",
      start_date: "2019-01",
      end_date: "2024-06",
      description: "Built APIs with Entity Framework, C#, and SQL Server",
      is_current: false,
    },
    {
      company: "StartupX",
      title: ".NET Engineer",
      start_date: "2024-07",
      end_date: "",
      description: "Microservices with EF Core and Azure",
      is_current: true,
    },
  ],
  projects: [
    {
      name: "Inventory platform",
      start_date: "2020",
      end_date: "2021",
      description: "React dashboard with Node.js backend",
      technologies: ["React", "Node.js"],
    },
  ],
  technologies_mentioned: ["Entity Framework", "C#", "React"],
  experience_claims: ["8+ years .NET development"],
};

describe("computeTechExperience", () => {
  it("counts Entity Framework employment toward EFCore stack requirement", () => {
    const rows = computeTechExperience(sampleExtracted, ["EFCore", "C#"], new Date("2024-07-01"));
    const ef = rows.find((r) => r.technology === "EFCore");
    expect(ef?.total_years).toBeTruthy();
    expect(ef?.first_year).toBe("2019");
  });

  it("merges overlapping employment periods for the same technology", () => {
    const rows = computeTechExperience(sampleExtracted, ["C#"], new Date("2024-07-01"));
    const csharp = rows.find((r) => r.technology === "C#");
    expect(csharp?.total_years).toMatch(/yr/);
  });

  it("includes project dates when technology appears in project work", () => {
    const rows = computeTechExperience(sampleExtracted, ["React"], new Date("2024-07-01"));
    const react = rows.find((r) => r.technology === "React");
    expect(react?.first_year).toBe("2020");
    expect(react?.total_years).toBeTruthy();
  });
});

describe("buildCareerHistory", () => {
  it("builds dated roles from extracted employment", () => {
    const history = buildCareerHistory(sampleExtracted, new Date("2024-07-01"));
    expect(history).toHaveLength(2);
    expect(history[0].company).toBe("TechCorp");
    expect(history[0].duration).toMatch(/yr/);
    expect(history[1].is_current).toBe(true);
    expect(history[1].end).toBe("Present");
  });
});

describe("computeTotalCareerExperience", () => {
  it("sums employment durations", () => {
    const history = buildCareerHistory(sampleExtracted, new Date("2024-07-01"));
    const total = computeTotalCareerExperience(history);
    expect(total).toMatch(/yr/);
  });
});

describe("computeRelevantStackExperience", () => {
  it("returns shortest matched stack technology experience", () => {
    const techExperience = computeTechExperience(
      sampleExtracted,
      ["EFCore", "C#", "React"],
      new Date("2024-07-01"),
    );
    const relevant = computeRelevantStackExperience(techExperience, ["EFCore", "C#"]);
    expect(relevant).toMatch(/yr/);
  });
});
