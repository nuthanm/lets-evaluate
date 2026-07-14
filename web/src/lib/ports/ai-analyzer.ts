import type { ResumeMetrics } from "@/lib/ai";

export type AnalyzeContext = {
  roleName?: string;
  projectName?: string;
  techStack: string[];
  requirements: string;
  otherProjects?: { name: string; techStack: string[] }[];
};

export interface ResumeAnalyzer {
  analyze(resumeText: string, ctx: AnalyzeContext): Promise<ResumeMetrics>;
}

export type InterviewAnswer = {
  questionId: string;
  question: string;
  category: string;
  answer: string;
};

export type InterviewEvaluation = {
  verdict: "proceed" | "hold" | "reject";
  overallScore: number;
  categoryScores: Record<string, number>;
  comments: string;
  strengths: string[];
  concerns: string[];
};

export interface InterviewEvaluator {
  evaluate(
    answers: InterviewAnswer[],
    ctx: AnalyzeContext & { resumeText?: string },
  ): Promise<InterviewEvaluation>;
}
