import type { GeneratedQuestion, ResumeMetrics } from "@/lib/ai";

export function mockResumeMetrics(techStack: string[] = ["TypeScript", "Node.js"]): ResumeMetrics {
  return {
    tech_match_score: 82,
    experience_level: "Senior",
    matched_technologies: techStack.slice(0, 2),
    missing_technologies: techStack.slice(2, 3),
    tech_comparison: techStack.map((technology, index) => ({
      technology,
      status: index < 2 ? "Matched" : "Clarification",
    })),
    clarifications: [],
    tech_experience: [],
    domain_expertise: ["Mock domain"],
    strengths: ["Mock strength — test fixture"],
    concerns: [],
    recommendation: "Proceed",
    summary: "Deterministic mock resume analysis (AI_TEST_MODE).",
    certifications: [],
    career_history: [],
    total_experience_mentioned: "5 years",
    total_experience_calculated: "5 years",
    is_currently_employed: true,
    current_employer: "Mock Corp",
    current_role: "Engineer",
    current_tenure: "2 years",
    suitability: { verdict: "Suitable", description: "Mock analysis for automated testing." },
    project_suggestions: [],
  };
}

export function mockGeneratedQuestions(category = "General", count = 3): GeneratedQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    question: `[Mock] ${category} question ${index + 1} for automated testing`,
    category,
    difficulty: "Medium",
    code: "",
    expected_answer_hints: "Mock fixture — no OpenAI call.",
  }));
}

export function mockJobDescription(orgName: string, roleTitle: string) {
  return {
    aboutRole: `Mock JD for ${roleTitle} at ${orgName} (AI_TEST_MODE — no API cost).`,
    whatYoullDo: [
      "Deliver mock responsibility bullet one for test validation.",
      "Collaborate with teams using deterministic fixtures.",
    ],
    whatYouBring: {
      summary: "Mock candidate profile for automated testing.",
      skills: ["Mock skill requirement one.", "Mock skill requirement two."],
      domain: "Technology",
    },
    whyJoinKanini: ["Mock culture bullet.", "Great Place to Work — test fixture."],
    readyToMakeImpact: "Mock call to action for automated testing.",
  };
}
