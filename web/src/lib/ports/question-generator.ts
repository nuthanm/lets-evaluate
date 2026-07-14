import type { GeneratedQuestion } from "@/lib/ai";

export type ScreeningQuestionContext = {
  roleName: string;
  techStack: string[];
  requirements: string;
  resumeText: string;
};

export interface QuestionGenerator {
  generateStandard(
    roleName: string,
    techStack: string[],
    count: number,
  ): Promise<GeneratedQuestion[]>;

  generateResume(
    resumeText: string,
    requirements: string,
    count: number,
  ): Promise<GeneratedQuestion[]>;

  generateCategory(
    category: string,
    ctx: ScreeningQuestionContext,
    count: number,
  ): Promise<GeneratedQuestion[]>;

  /** Pick a balanced set for the candidate AI interview session. */
  selectForSession(
    allQuestions: GeneratedQuestion[],
    count?: number,
  ): GeneratedQuestion[];
}
