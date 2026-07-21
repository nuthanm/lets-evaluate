import OpenAI from "openai";
import { isAiTestMode } from "@/lib/ai/test-mode";
import { mockGeneratedQuestions, mockResumeMetrics } from "@/lib/ai/mock-fixtures";
import { reconcileTechMatching } from "@/lib/ai/tech-matching";
import {
  formatDuration,
  isPresent,
  isUnknown,
  looksLikeDuration,
  monthsBetween,
  parseMonthYear,
} from "@/lib/ai/resume-dates";

const MAX_RESUME = 3200;
const MAX_ROLE = 2000;
const MAX_RESUME_Q = 3000;
const MAX_NOTES = 2000;

/** Default for questions / notes — fast and cheap */
function defaultModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/**
 * Resume analysis — always a full (non-mini) model. Deliberately does NOT fall
 * back to OPENAI_MODEL so the main analysis never silently runs on gpt-4o-mini.
 * Override only with the dedicated OPENAI_ANALYSIS_MODEL env var.
 */
export const ANALYSIS_MODEL =
  process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4o";

function analysisModel() {
  return ANALYSIS_MODEL;
}

function client() {
  if (isAiTestMode()) return null;
  const key = process.env.OPENAI_API_KEY;
  if (!key?.startsWith("sk-")) return null;
  return new OpenAI({ apiKey: key });
}

function parseJson<T>(text: string): T {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .split("\n")
      .filter((l) => !l.trim().startsWith("```"))
      .join("\n")
      .trim();
  }
  return JSON.parse(t) as T;
}

function compressResumeText(input: string): string {
  let t = input || "";
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

function trimOtherProjects(projects: { name: string; techStack: string[] }[]) {
  return projects.slice(0, 4).map((p) => ({
    name: p.name,
    techStack: p.techStack.slice(0, 5),
  }));
}

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
};

export type AiUsageSummary = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  estimatedInputCostUsd: number;
  estimatedOutputCostUsd: number;
  estimatedTotalCostUsd: number;
};

export type AnalyzeResumeDetailedResult = {
  metrics: ResumeMetrics;
  extraction: AiUsageSummary;
  analysis: AiUsageSummary;
  estimatedTotalCostUsd: number;
};

function usageSummary(
  usage: OpenAIUsage | undefined,
  model: string,
  inputPer1k: number,
  outputPer1k: number,
): AiUsageSummary {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  const cacheReadTokens = usage?.prompt_tokens_details?.cached_tokens ?? 0;
  const estimatedInputCostUsd = (promptTokens / 1000) * inputPer1k;
  const estimatedOutputCostUsd = (completionTokens / 1000) * outputPer1k;
  return {
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    cacheReadTokens,
    estimatedInputCostUsd,
    estimatedOutputCostUsd,
    estimatedTotalCostUsd: estimatedInputCostUsd + estimatedOutputCostUsd,
  };
}

/**
 * Deterministically fill tenure/experience durations from dated roles so that
 * ongoing ("Till Date"/"Present") positions show real elapsed time instead of
 * whatever the model happened to echo back. Only fills/normalizes values that
 * are missing or not already expressed as a duration — never overrides a clean
 * model-provided duration.
 */
function computeExperience(m: ResumeMetrics): ResumeMetrics {
  const now = new Date();

  for (const c of m.career_history) {
    const start = parseMonthYear(c.start);
    const ongoing = c.is_current || isPresent(c.end) || !c.end?.trim();
    const end = ongoing ? now : parseMonthYear(c.end);
    if (ongoing) c.is_current = true;
    if (start && end && !looksLikeDuration(c.duration)) {
      c.duration = formatDuration(monthsBetween(start, end) + 1);
    }
  }

  const current =
    m.career_history.find((c) => c.is_current) ?? m.career_history[0];
  if (current) {
    if (!looksLikeDuration(m.current_tenure) && looksLikeDuration(current.duration)) {
      m.current_tenure = current.duration;
    }
    if (isUnknown(m.current_employer)) m.current_employer = current.company;
    if (isUnknown(m.current_role)) m.current_role = current.title;
  }

  if (isUnknown(m.total_experience_calculated)) {
    let totalMonths = 0;
    let counted = false;
    for (const c of m.career_history) {
      const start = parseMonthYear(c.start);
      const ongoing = c.is_current || isPresent(c.end) || !c.end?.trim();
      const end = ongoing ? now : parseMonthYear(c.end);
      if (start && end) {
        totalMonths += monthsBetween(start, end) + 1;
        counted = true;
      }
    }
    if (counted) m.total_experience_calculated = formatDuration(totalMonths);
  }

  for (const t of m.tech_experience) {
    if (isPresent(t.last_year) && isUnknown(t.total_years)) {
      const fy = Number.parseInt(t.first_year, 10);
      if (fy) t.total_years = String(Math.max(1, now.getFullYear() - fy));
    }
  }

  return m;
}

export type CareerEntry = {
  company: string;
  title: string;
  start: string;
  end: string;
  duration: string;
  is_current?: boolean;
};

export type TechComparisonEntry = {
  technology: string;
  /** "Matched" | "Unmatched" | "Clarification" */
  status: string;
};

export type TechExperienceEntry = {
  technology: string;
  first_year: string;
  /** A year or "Present" when still in use */
  last_year: string;
  total_years: string;
};

export type Clarification = {
  technology: string;
  reason: string;
};

export type ProjectSuggestion = {
  project: string;
  reason: string;
};

export type Suitability = {
  /** "Suitable" | "Partially suitable" | "Not suitable" | "" */
  verdict: string;
  description: string;
};

export type ResumeMetrics = {
  tech_match_score: number;
  experience_level: string;
  matched_technologies: string[];
  missing_technologies: string[];
  tech_comparison: TechComparisonEntry[];
  tech_experience: TechExperienceEntry[];
  clarifications: Clarification[];
  domain_expertise: string[];
  strengths: string[];
  concerns: string[];
  recommendation: string;
  summary: string;
  certifications: string[];
  career_history: CareerEntry[];
  total_experience_mentioned: string;
  total_experience_calculated: string;
  relevant_experience: string;
  is_currently_employed: boolean;
  current_employer: string;
  current_role: string;
  current_tenure: string;
  suitability: Suitability;
  project_suggestions: ProjectSuggestion[];
};

export type AnalyzeOptions = {
  roleName?: string;
  projectName?: string;
  otherProjects?: { name: string; techStack: string[] }[];
};

/**
 * PHASE 1: Extract structured data from resume (fast, deterministic).
 * Uses gpt-4o-mini for cost efficiency (~$0.00015/1K tokens).
 */
async function extractResumeData(resumeText: string): Promise<{
  data: Record<string, unknown>;
  usage: AiUsageSummary;
} | null> {
  const openai = client();
  if (!openai) {
    return null;
  }

  const cleanedResume = compressResumeText(resumeText);

  const extractionPrompt = `Extract structured data from the resume below. Return ONLY valid JSON (no markdown).

Resume text:
${cleanedResume.slice(0, MAX_RESUME)}

CRITICAL RULES:
1. Extract facts EXACTLY as written in the resume
2. Never invent or infer data not explicitly present
3. For dates, use format "YYYY-MM" or "YYYY" or "Not specified"
4. For current roles, set is_current: true if end_date is missing or says "Present"/"Till Date"/"Current"
5. List technologies mentioned anywhere: skills, certifications, project descriptions
6. Extract ALL employment date ranges (start/end) and project date ranges exactly as written
7. Capture summary claims like "8 years Java" in experience_claims

Return JSON object:
{
  "employment": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or empty string for current",
      "description": "Excerpt from resume describing the role and technologies used",
      "is_current": boolean
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "company": "Client or employer",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or YYYY or empty for ongoing",
      "description": "What was built and which technologies were used",
      "technologies": ["Tech1", "Tech2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "University",
      "graduation_year": "YYYY"
    }
  ],
  "technologies_mentioned": ["Tech1", "Tech2", ...],
  "certifications": ["Cert1", ...],
  "experience_claims": ["5 years Java", ...]
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      seed: 7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a resume data extractor. Extract facts exactly as written. Never fabricate. Return valid JSON only.",
        },
        { role: "user", content: extractionPrompt },
      ],
    });

    return {
      data: parseJson<Record<string, unknown>>(
        res.choices[0]?.message?.content ?? "{}",
      ),
      usage: usageSummary(
        res.usage as OpenAIUsage | undefined,
        "gpt-4o-mini",
        0.00015,
        0.0006,
      ),
    };
  } catch (e) {
    console.error("Extraction failed:", e);
    return null;
  }
}

/**
 * PHASE 2: Analyze extracted data with deterministic rules.
 * Uses gpt-4o for judgment and reasoning (~$0.003/1K tokens).
 */
async function analyzeExtractedData(
  extractedData: Record<string, unknown>,
  projectTechStack: string[],
  roleRequirements: string,
  roleName: string,
  projectName: string,
  otherProjects: { name: string; techStack: string[] }[],
): Promise<{ metrics: ResumeMetrics; usage: AiUsageSummary }> {
  const openai = client();
  if (!openai) {
    return {
      metrics: emptyMetrics(projectTechStack, "OpenAI API key not configured"),
      usage: usageSummary(undefined, analysisModel(), 0.0025, 0.01),
    };
  }

  const compactProjects = trimOtherProjects(otherProjects);
  const otherProjectsBlock =
    compactProjects && compactProjects.length
      ? compactProjects
          .map((p) => `- ${p.name}: ${p.techStack.join(", ") || "n/a"}`)
          .join("\n")
      : "None";

  const analysisPrompt = `You are a technical recruiter evaluating a candidate for "${roleName}" on project "${projectName}".

EXTRACTED CANDIDATE DATA:
${JSON.stringify(extractedData, null, 2)}

REQUIRED TECH STACK: ${projectTechStack.join(", ")}

ROLE REQUIREMENTS:
${roleRequirements.slice(0, MAX_ROLE)}

OTHER OPEN PROJECTS:
${otherProjectsBlock}

---

ANALYSIS RULES (Follow EXACTLY):

1. TECH MATCHING (For each tech in Required Stack):
   - Technology status (Matched / Unmatched / Clarification) is computed separately with alias-aware rules — focus on narrative fields below.
   - Treat equivalent names as the same technology (e.g. EFCore = Entity Framework Core, JS = JavaScript, K8s = Kubernetes).
   - "Matched": Technology explicitly mentioned in employment descriptions (not just skills)
   - "Unmatched": Never mentioned (including known aliases)
   - "Clarification": Mentioned in skills/certifications but NOT tied to dated project work

2. EXPERIENCE CALCULATION:
   - Employment dates, career timeline, per-technology experience, and relevant stack experience are computed separately in code
   - Focus narrative fields on strengths, concerns, summary, and suitability description

3. RECOMMENDATION TREE (Deterministic):
   Calculate tech_match_score = (count Matched) / (required stack length) * 100
   
   IF tech_match_score >= 80 AND clarification_count == 0:
     recommendation = "Proceed"
     suitability.verdict = "Suitable"
   ELSE IF tech_match_score >= 80 AND clarification_count > 0:
     recommendation = "Hold"
     suitability.verdict = "Partially suitable"
   ELSE IF tech_match_score >= 60:
     recommendation = "Hold"
     suitability.verdict = "Partially suitable"
   ELSE:
     recommendation = "Reject"
     suitability.verdict = "Not suitable"

4. CLARIFICATIONS:
   - For EVERY "Clarification" tech: create entry explaining why certainty is needed
   - Do NOT include Matched or Unmatched techs

Return ONLY valid JSON with exactly these keys:
{
  "tech_match_score": <number 0-100>,
  "matched_technologies": <array>,
  "missing_technologies": <array>,
  "tech_comparison": [{ "technology": "...", "status": "Matched"|"Unmatched"|"Clarification" }],
  "clarifications": [{ "technology": "...", "reason": "..." }],
  "tech_experience": [],
  "career_history": [],
  "total_experience_mentioned": "...",
  "total_experience_calculated": "...",
  "relevant_experience": "...",
  "is_currently_employed": boolean,
  "current_employer": "...",
  "current_role": "...",
  "current_tenure": "...",
  "experience_level": "Junior|Mid|Senior|Not specified",
  "domain_expertise": [],
  "strengths": ["Strength1", ...],
  "concerns": ["Concern1", ...],
  "recommendation": "Proceed"|"Hold"|"Reject",
  "suitability": { "verdict": "Suitable"|"Partially suitable"|"Not suitable", "description": "..." },
  "certifications": [],
  "summary": "...",
  "project_suggestions": []
}`;

  try {
    const res = await openai.chat.completions.create({
      model: analysisModel(),
      temperature: 0,
      seed: 7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous technical recruiter. Apply the decision rules exactly. Return valid JSON only.",
        },
        { role: "user", content: analysisPrompt },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = withDefaults(parseJson<Partial<ResumeMetrics>>(raw));
    const reconciled = reconcileTechMatching(
      extractedData,
      projectTechStack,
      parsed,
    );
    return {
      metrics: computeExperience(withDefaults(reconciled as Partial<ResumeMetrics>)),
      usage: usageSummary(
        res.usage as OpenAIUsage | undefined,
        analysisModel(),
        0.0025,
        0.01,
      ),
    };
  } catch (e) {
    return {
      metrics: emptyMetrics(
        projectTechStack,
        `Analysis failed: ${e instanceof Error ? e.message : String(e)}`,
      ),
      usage: usageSummary(undefined, analysisModel(), 0.0025, 0.01),
    };
  }
}

/**
 * Main entry point: Extract, then analyze with deterministic rules.
 * PHASE 1 implementation for consistency & cost reduction.
 */
export async function analyzeResumeDetailed(
  resumeText: string,
  projectTechStack: string[],
  roleRequirements: string,
  opts: AnalyzeOptions = {},
): Promise<AnalyzeResumeDetailedResult> {
  if (isAiTestMode()) {
    const emptyUsage = usageSummary(undefined, analysisModel(), 0.0025, 0.01);
    return {
      metrics: mockResumeMetrics(projectTechStack),
      extraction: usageSummary(undefined, "gpt-4o-mini", 0.00015, 0.0006),
      analysis: emptyUsage,
      estimatedTotalCostUsd: 0,
    };
  }

  // Phase 1: Extract structured data (fast, cheap, deterministic)
  const extracted = await extractResumeData(resumeText);
  if (!extracted) {
    const fallback = emptyMetrics(projectTechStack, "Failed to extract resume data");
    const emptyUsage = usageSummary(undefined, analysisModel(), 0.0025, 0.01);
    return {
      metrics: fallback,
      extraction: usageSummary(undefined, "gpt-4o-mini", 0.00015, 0.0006),
      analysis: emptyUsage,
      estimatedTotalCostUsd: 0,
    };
  }

  // Phase 2: Analyze with deterministic rules (gpt-4o)
  const roleName = opts.roleName?.trim() || "the role";
  const projectName = opts.projectName?.trim() || "the project";
  const otherProjects = opts.otherProjects ?? [];

  const analyzed = await analyzeExtractedData(
    extracted.data,
    projectTechStack,
    roleRequirements,
    roleName,
    projectName,
    otherProjects,
  );

  return {
    metrics: analyzed.metrics,
    extraction: extracted.usage,
    analysis: analyzed.usage,
    estimatedTotalCostUsd:
      extracted.usage.estimatedTotalCostUsd + analyzed.usage.estimatedTotalCostUsd,
  };
}

export async function analyzeResume(
  resumeText: string,
  projectTechStack: string[],
  roleRequirements: string,
  opts: AnalyzeOptions = {},
): Promise<ResumeMetrics> {
  const result = await analyzeResumeDetailed(
    resumeText,
    projectTechStack,
    roleRequirements,
    opts,
  );
  return result.metrics;
}

/** Ensure every field exists so the UI never crashes on a partial model reply. */
function withDefaults(r: Partial<ResumeMetrics>): ResumeMetrics {
  return {
    tech_match_score: r.tech_match_score ?? 0,
    experience_level: r.experience_level ?? "",
    matched_technologies: r.matched_technologies ?? [],
    missing_technologies: r.missing_technologies ?? [],
    tech_comparison: r.tech_comparison ?? [],
    tech_experience: r.tech_experience ?? [],
    clarifications: r.clarifications ?? [],
    domain_expertise: r.domain_expertise ?? [],
    strengths: r.strengths ?? [],
    concerns: r.concerns ?? [],
    recommendation: r.recommendation ?? "Hold",
    summary: r.summary ?? "",
    certifications: r.certifications ?? [],
    career_history: r.career_history ?? [],
    total_experience_mentioned: r.total_experience_mentioned ?? "",
    total_experience_calculated: r.total_experience_calculated ?? "",
    relevant_experience: r.relevant_experience ?? "",
    is_currently_employed: r.is_currently_employed ?? false,
    current_employer: r.current_employer ?? "",
    current_role: r.current_role ?? "",
    current_tenure: r.current_tenure ?? "",
    suitability: r.suitability ?? { verdict: "", description: "" },
    project_suggestions: r.project_suggestions ?? [],
  };
}

function emptyMetrics(stack: string[], msg: string): ResumeMetrics {
  return withDefaults({
    concerns: [msg],
    summary: msg,
    recommendation: "Hold",
    missing_technologies: stack,
    tech_comparison: stack.map((t) => ({
      technology: t,
      status: "Unmatched",
    })),
  });
}

export async function generateStandardQuestions(
  roleName: string,
  techStack: string[],
  numQuestions = 10,
  topic = "",
) {
  const openai = client();
  if (!openai) {
    if (isAiTestMode()) {
      return mockGeneratedQuestions(topic.trim() || "Technical", numQuestions);
    }
    return [
      {
        question: "OpenAI API key not configured",
        category: "Technical",
        expected_answer_hints: "N/A",
      },
    ];
  }

  const topicLine = topic.trim() ? `\nFocus on: ${topic.trim()}` : "";
  const prompt = `Generate ${numQuestions} interview questions for ${roleName}. Tech: ${techStack.join(", ")}${topicLine}. Return JSON array with question, category, expected_answer_hints.`;

  const res = await openai.chat.completions.create({
    model: defaultModel(),
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = res.choices[0]?.message?.content ?? "[]";
  const result = parseJson<unknown[]>(raw);
  return Array.isArray(result) ? result : [];
}

export async function generateResumeQuestions(
  resumeText: string,
  roleRequirements: string,
  numQuestions = 10,
) {
  const openai = client();
  if (!openai) {
    if (isAiTestMode()) {
      return mockGeneratedQuestions("Resume", numQuestions);
    }
    return [
      {
        question: "OpenAI API key not configured",
        category: "Technical",
        expected_answer_hints: "N/A",
      },
    ];
  }

  const prompt = `Based on resume excerpt and role requirements, generate ${numQuestions} targeted questions. Return JSON array.

Resume: ${resumeText.slice(0, MAX_RESUME_Q)}
Requirements: ${roleRequirements.slice(0, MAX_ROLE / 2)}`;

  const res = await openai.chat.completions.create({
    model: defaultModel(),
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = res.choices[0]?.message?.content ?? "[]";
  const result = parseJson<unknown[]>(raw);
  return Array.isArray(result) ? result : [];
}

/* ─────────────────────── Interviewer question categories ─────────────────────── */

export type QuestionCategory =
  | "Resume based"
  | "Backend"
  | "Frontend"
  | "Architecture"
  | "Scenario based"
  | "Code error spotting"
  | "Refactoring"
  | "Leadership & Ownership"
  | "People Management"
  | "Conflict Resolution"
  | "Decision Making"
  | "Communication"
  | "Behavioural"
  | "Culture Fit"
  | "Career Motivation";

type CategoryDef = {
  id: QuestionCategory;
  label: string;
  hint: string;
  /** Whether questions in this category are expected to include a code snippet. */
  code: boolean;
};

/** Technical interview rounds. */
export const QUESTION_CATEGORIES: CategoryDef[] = [
  { id: "Resume based", label: "Resume based", hint: "Probe claims made in the candidate's resume", code: false },
  { id: "Backend", label: "Backend", hint: "APIs, databases, concurrency, performance", code: false },
  { id: "Frontend", label: "Frontend", hint: "UI, state, rendering, accessibility", code: false },
  { id: "Architecture", label: "Architecture", hint: "System & solution design trade-offs", code: false },
  { id: "Scenario based", label: "Scenario based", hint: "Real-world situational problem solving", code: false },
  { id: "Code error spotting", label: "Find errors in code", hint: "Snippets with bugs to identify", code: true },
  { id: "Refactoring", label: "Refactoring techniques", hint: "Snippets to improve / refactor", code: true },
];

/** Manager rounds: assess leadership, ownership and people-management readiness. */
export const MANAGER_QUESTION_CATEGORIES: CategoryDef[] = [
  { id: "Resume based", label: "Resume based", hint: "Probe claims made in the candidate's resume", code: false },
  { id: "Leadership & Ownership", label: "Leadership & Ownership", hint: "Driving outcomes, taking initiative, owning failures", code: false },
  { id: "People Management", label: "People Management", hint: "Mentoring, feedback, delegation, performance conversations", code: false },
  { id: "Conflict Resolution", label: "Conflict Resolution", hint: "Difficult stakeholders, team disagreements, escalations", code: false },
  { id: "Decision Making", label: "Decision Making", hint: "Prioritisation & trade-offs under ambiguity", code: false },
  { id: "Communication", label: "Communication", hint: "Stakeholder updates & cross-team alignment", code: false },
  { id: "Culture Fit", label: "Culture Fit", hint: "Values alignment & collaboration style", code: false },
];

/** HR rounds: assess behaviour, communication and organisational fit. */
export const HR_QUESTION_CATEGORIES: CategoryDef[] = [
  { id: "Resume based", label: "Resume based", hint: "Probe career history & claims made in the resume", code: false },
  { id: "Behavioural", label: "Behavioural", hint: "Ownership, teamwork, conflict handling, feedback reception", code: false },
  { id: "Communication", label: "Communication", hint: "Clarity, articulation, stakeholder communication", code: false },
  { id: "Culture Fit", label: "Culture Fit", hint: "Values alignment & working style", code: false },
  { id: "Career Motivation", label: "Career Motivation", hint: "Reasons for change, long-term goals, expectations", code: false },
];

/** Pick the right category set for a given interview-process stage kind. */
export function questionCategoriesForStageKind(
  kind: "screening" | "technical" | "manager" | "hr" | "final" | "custom" | string,
): CategoryDef[] {
  if (kind === "manager") return MANAGER_QUESTION_CATEGORIES;
  if (kind === "hr") return HR_QUESTION_CATEGORIES;
  return QUESTION_CATEGORIES;
}

export type GeneratedQuestion = {
  question: string;
  category: string;
  difficulty: string;
  code: string;
  expected_answer_hints: string;
};

export type CategoryQuestionContext = {
  roleName?: string;
  techStack?: string[];
  resumeText?: string;
  roleRequirements?: string;
};

/**
 * Generate interview questions for a specific category. Code-oriented
 * categories return a `code` snippet; others leave it empty.
 */
export async function generateCategoryQuestions(
  category: QuestionCategory,
  ctx: CategoryQuestionContext,
  count = 5,
): Promise<GeneratedQuestion[]> {
  const openai = client();
  if (!openai) {
    if (isAiTestMode()) {
      return mockGeneratedQuestions(category, count);
    }
    throw new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to your .env.local file.");
  }

  const role = ctx.roleName?.trim() || "the role";
  const wantsCode =
    category === "Code error spotting" || category === "Refactoring";

  // People / leadership categories are purely behavioural — tech stack is
  // irrelevant and including it causes the model to drift toward technical
  // questions even for manager/HR rounds.
  const PEOPLE_CATEGORIES: string[] = [
    "Leadership & Ownership",
    "People Management",
    "Conflict Resolution",
    "Decision Making",
    "Culture Fit",
    "Career Motivation",
  ];
  const isPeopleCategory = PEOPLE_CATEGORIES.includes(category);

  const tech = isPeopleCategory ? "" : (ctx.techStack ?? []).join(", ") || "the relevant stack";

  const guidance: Record<QuestionCategory, string> = {
    "Resume based": `Base each question on concrete claims, projects and technologies from the candidate's resume below so the interviewer can verify real, hands-on depth.\n\nResume:\n${(ctx.resumeText ?? "").slice(0, MAX_RESUME_Q)}`,
    Backend: "Focus on backend engineering: API design, data modelling, transactions, caching, concurrency, scaling and debugging production issues.",
    Frontend: "Focus on frontend engineering: component design, state management, rendering/performance, accessibility, browser behaviour and testing.",
    Architecture: "Focus on system and solution architecture: trade-offs, scalability, reliability, data flow, and technology selection with justification.",
    "Scenario based": "Pose realistic on-the-job situations (incidents, ambiguous requirements, tight deadlines, cross-team conflicts) that reveal judgement and problem solving.",
    "Code error spotting": "For each item, include a short, realistic code snippet (in the candidate's primary language/stack) that contains one or more bugs. The question asks the candidate to find and explain the errors.",
    Refactoring: "For each item, include a short code snippet that works but has poor quality (duplication, bad naming, tight coupling, inefficiency). The question asks how the candidate would refactor it.",
    "Leadership & Ownership": "Assess how the candidate drives outcomes, takes initiative beyond their remit, and owns mistakes or failed projects without deflecting blame.",
    "People Management": "Assess mentoring style, how they give and receive feedback, delegate work, and handle underperformance or performance reviews.",
    "Conflict Resolution": "Pose realistic team conflicts, disagreements with peers/stakeholders, or escalations, and assess how the candidate navigates them fairly.",
    "Decision Making": "Assess how the candidate prioritises, makes trade-offs under ambiguity or incomplete data, and justifies decisions to others.",
    Communication: "Assess clarity, structure, stakeholder communication, and the ability to explain complex or sensitive topics to different audiences.",
    Behavioural: "Assess ownership, teamwork, conflict handling, and how the candidate receives and acts on feedback under pressure.",
    "Culture Fit": "Assess alignment with collaborative, ownership-driven values and working style — not right/wrong answers, but fit signals.",
    "Career Motivation": "Assess reasons for seeking a change, career goals, and realistic expectations around the role, team and growth path.",
  };

  const prompt = isPeopleCategory
    ? `You are helping a hiring manager prepare ${count} "${category}" interview questions for the ${role} role.
${guidance[category]}
${ctx.roleRequirements?.trim() ? `\nRole context:\n${ctx.roleRequirements.slice(0, MAX_ROLE)}` : ""}

Do NOT ask about technology, programming languages, or coding. Focus entirely on the person's behaviour, mindset, and leadership qualities.

Return ONLY a valid JSON array of exactly ${count} objects, each with keys:
- "question" (string): a clear, open-ended behavioural or situational question.
- "difficulty" (string): one of "Easy", "Medium", "Hard".
- "code" (string): leave as an empty string "".
- "expected_answer_hints" (string): concise notes on what a strong answer looks like (use STAR indicators where relevant).`
    : `You are helping an interviewer prepare ${count} "${category}" interview questions for ${role}. Tech stack: ${tech}.
${guidance[category]}
${ctx.roleRequirements?.trim() ? `\nRole requirements:\n${ctx.roleRequirements.slice(0, MAX_ROLE)}` : ""}

Return ONLY a valid JSON array of exactly ${count} objects, each with keys:
- "question" (string): the interview question.
- "difficulty" (string): one of "Easy", "Medium", "Hard".
- "code" (string): ${wantsCode ? "the code snippet the question refers to (use \\n for newlines). Required." : 'leave as an empty string "".'}
- "expected_answer_hints" (string): concise notes on what a strong answer covers.`;

  const res = await openai.chat.completions.create({
    model: defaultModel(),
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: isPeopleCategory
          ? 'You are an expert in behavioural and leadership interviewing. Generate practical, people-focused interview questions and return strict JSON. Never include code snippets or ask about specific technologies. Respond with a JSON object shaped as {"questions": [...]}.'
          : 'You generate practical, role-relevant interview questions and return strict JSON. When code is requested, produce compilable-looking, realistic snippets. Respond with a JSON object shaped as {"questions": [...]}.',
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = parseJson<{ questions?: unknown[] } | unknown[]>(raw);
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown[] }).questions)
      ? (parsed as { questions?: unknown[] }).questions!
      : [];

  return arr
    .map((q) => {
      const o = (q ?? {}) as Record<string, unknown>;
      return {
        question: String(o.question ?? "").trim(),
        category,
        difficulty: String(o.difficulty ?? "Medium").trim() || "Medium",
        code: String(o.code ?? "").trim(),
        expected_answer_hints: String(o.expected_answer_hints ?? "").trim(),
      };
    })
    .filter((q) => q.question);
}

export async function refineEvaluationNotes(notes: string) {
  const openai = client();
  if (!openai || !notes.trim()) return notes;
  const res = await openai.chat.completions.create({
    model: defaultModel(),
    temperature: 0.5,
    messages: [
      {
        role: "user",
        content: `Refine these evaluation notes professionally. Return only refined text.\n\n${notes.slice(0, MAX_NOTES)}`,
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? notes;
}

export { isUnknown } from "@/lib/ai/resume-dates";
