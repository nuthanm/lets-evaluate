import { createHash } from "crypto";
import {
  analyzeResume,
  generateStandardQuestions,
  generateResumeQuestions,
  generateCategoryQuestions,
  type GeneratedQuestion,
  type QuestionCategory,
} from "@/lib/ai";
import type {
  AnalyzeContext,
  InterviewAnswer,
  InterviewEvaluator,
  ResumeAnalyzer,
} from "@/lib/ports/ai-analyzer";
import type { QuestionGenerator } from "@/lib/ports/question-generator";
import OpenAI from "openai";

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.startsWith("sk-")) return null;
  return new OpenAI({ apiKey: key });
}

export class OpenAiResumeAnalyzer implements ResumeAnalyzer {
  async analyze(resumeText: string, ctx: AnalyzeContext) {
    return analyzeResume(resumeText, ctx.techStack, ctx.requirements, {
      roleName: ctx.roleName,
      projectName: ctx.projectName,
      otherProjects: ctx.otherProjects,
    });
  }
}

const SCREENING_CATEGORIES: QuestionCategory[] = [
  "Resume based",
  "Scenario based",
  "Architecture",
];

const SOFT_CATEGORIES = [
  "Communication",
  "Behavioural",
  "Acceptance",
] as const;

export class OpenAiQuestionGenerator implements QuestionGenerator {
  async generateStandard(roleName: string, techStack: string[], count: number) {
    return (await generateStandardQuestions(roleName, techStack, count)) as GeneratedQuestion[];
  }

  async generateResume(resumeText: string, requirements: string, count: number) {
    return (await generateResumeQuestions(resumeText, requirements, count)) as GeneratedQuestion[];
  }

  async generateCategory(
    category: string,
    ctx: { roleName: string; techStack: string[]; requirements: string; resumeText: string },
    count: number,
  ) {
    if (SOFT_CATEGORIES.includes(category as (typeof SOFT_CATEGORIES)[number])) {
      return generateSoftCategoryQuestions(
        category as (typeof SOFT_CATEGORIES)[number],
        ctx,
        count,
      );
    }
    return generateCategoryQuestions(category as QuestionCategory, {
      roleName: ctx.roleName,
      techStack: ctx.techStack,
      resumeText: ctx.resumeText,
      roleRequirements: ctx.requirements,
    }, count);
  }

  selectForSession(allQuestions: GeneratedQuestion[], count = 10): GeneratedQuestion[] {
    const byCat = new Map<string, GeneratedQuestion[]>();
    for (const q of allQuestions) {
      const cat = q.category || "General";
      const list = byCat.get(cat) ?? [];
      list.push(q);
      byCat.set(cat, list);
    }
    const picked: GeneratedQuestion[] = [];
    const cats = [...byCat.keys()];
    let i = 0;
    while (picked.length < count && cats.length > 0) {
      const idx = i % cats.length;
      const cat = cats[idx];
      const list = byCat.get(cat) ?? [];
      if (!list.length) {
        // Remove the empty category in place; next category slides into idx.
        cats.splice(idx, 1);
        continue;
      }
      picked.push(list.shift()!);
      if (!list.length) {
        cats.splice(idx, 1);
      } else {
        i += 1;
      }
    }
    return picked.slice(0, count);
  }
}

async function generateSoftCategoryQuestions(
  category: (typeof SOFT_CATEGORIES)[number],
  ctx: { roleName: string; techStack: string[]; requirements: string; resumeText: string },
  count: number,
): Promise<GeneratedQuestion[]> {
  const openai = openaiClient();
  if (!openai) {
    return [{
      question: "OpenAI API key not configured",
      category,
      difficulty: "Medium",
      code: "",
      expected_answer_hints: "",
    }];
  }

  const guidance: Record<(typeof SOFT_CATEGORIES)[number], string> = {
    Communication:
      "Assess clarity, structure, stakeholder communication, and ability to explain technical concepts to non-technical audiences.",
    Behavioural:
      "Assess ownership, teamwork, conflict resolution, feedback reception, and professional attitude under pressure.",
    Acceptance:
      "Assess honesty when the candidate does not know an answer — willingness to admit gaps, ask clarifying questions, and describe how they would learn.",
  };

  const prompt = `Generate ${count} "${category}" screening interview questions for ${ctx.roleName}.
Tech stack: ${ctx.techStack.join(", ") || "general"}
${ctx.requirements ? `Role requirements:\n${ctx.requirements.slice(0, 2000)}` : ""}

Focus: ${guidance[category]}

Return JSON object {"questions": [{"question": string, "difficulty": "Easy"|"Medium"|"Hard", "code": "", "expected_answer_hints": string}]}`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { questions?: GeneratedQuestion[] };
    return (parsed.questions ?? []).map((q) => ({
      question: String(q.question ?? ""),
      category,
      difficulty: String(q.difficulty ?? "Medium"),
      code: "",
      expected_answer_hints: String(q.expected_answer_hints ?? ""),
    })).filter((q) => q.question);
  } catch (e) {
    return [{
      question: `Could not generate: ${e instanceof Error ? e.message : String(e)}`,
      category,
      difficulty: "Medium",
      code: "",
      expected_answer_hints: "",
    }];
  }
}

export class OpenAiInterviewEvaluator implements InterviewEvaluator {
  async evaluate(
    answers: InterviewAnswer[],
    ctx: AnalyzeContext & { resumeText?: string },
  ) {
    const openai = openaiClient();
    if (!openai) {
      return {
        verdict: "hold" as const,
        overallScore: 0,
        categoryScores: {},
        comments: "AI evaluation unavailable — OpenAI not configured.",
        strengths: [],
        concerns: ["Evaluation could not run"],
      };
    }

    const prompt = `You are an AI screening interviewer evaluating a candidate for ${ctx.roleName ?? "a role"}.

Tech stack: ${ctx.techStack.join(", ")}
Requirements: ${ctx.requirements.slice(0, 2000)}

Candidate answers:
${answers.map((a, i) => `Q${i + 1} [${a.category}]: ${a.question}\nA: ${a.answer}`).join("\n\n")}

Return JSON:
{
  "verdict": "proceed" | "hold" | "reject",
  "overall_score": 0-100,
  "category_scores": {"category": score},
  "comments": "2-4 sentence screening summary for recruiter",
  "strengths": ["..."],
  "concerns": ["..."]
}

Be fair. "proceed" if clearly suitable; "hold" if borderline; "reject" only if clearly unsuitable.`;

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON only. Be evidence-based." },
        { role: "user", content: prompt },
      ],
    });

    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const verdict: "proceed" | "hold" | "reject" =
      raw.verdict === "proceed" || raw.verdict === "reject" ? raw.verdict : "hold";

    return {
      verdict,
      overallScore: Number(raw.overall_score ?? 0),
      categoryScores: (raw.category_scores as Record<string, number>) ?? {},
      comments: String(raw.comments ?? ""),
      strengths: (raw.strengths as string[]) ?? [],
      concerns: (raw.concerns as string[]) ?? [],
    };
  }
}

export function resumeHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

export const defaultResumeAnalyzer = new OpenAiResumeAnalyzer();
export const defaultQuestionGenerator = new OpenAiQuestionGenerator();
export const defaultInterviewEvaluator = new OpenAiInterviewEvaluator();
