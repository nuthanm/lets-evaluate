import OpenAI from "openai";

const MAX_RESUME = 4000;
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

const UNKNOWN = new Set(["unknown", "n/a", "-", "none", ""]);

function isUnknown(v: string) {
  return UNKNOWN.has((v || "").trim().toLowerCase());
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8,
  sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

/** True when a date string represents an ongoing role (no fixed end date). */
function isPresent(s: string) {
  return /present|till\s*date|current|ongoing|now|to\s*date/i.test(s || "");
}

/** True when a string already reads as a duration (e.g. "2 yrs 3 mos"). */
function looksLikeDuration(s: string) {
  return /\b(yr|yrs|year|years|mo|mos|month|months)\b/i.test(s || "");
}

/** Best-effort parse of a "Month Year" / "MM/YYYY" / "YYYY" style token. */
function parseMonthYear(s: string): Date | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (isPresent(t)) return new Date();
  let m = t.match(/([a-z]+)[\s./,-]*(\d{4})/);
  if (m && MONTHS[m[1]] != null) return new Date(Number(m[2]), MONTHS[m[1]], 1);
  m = t.match(/(\d{1,2})[\s./-]+(\d{4})/);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = t.match(/(\d{4})[\s./-]+(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  m = t.match(/\b(\d{4})\b/);
  if (m) return new Date(Number(m[1]), 0, 1);
  return null;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Human-friendly duration from a whole number of months. */
function formatDuration(totalMonths: number): string {
  const months = Math.max(0, totalMonths);
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (mo) parts.push(`${mo} mo${mo > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" ") : "< 1 mo";
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

export async function analyzeResume(
  resumeText: string,
  projectTechStack: string[],
  roleRequirements: string,
  opts: AnalyzeOptions = {},
): Promise<ResumeMetrics> {
  const openai = client();
  if (!openai) {
    return emptyMetrics(projectTechStack, "OpenAI API key not configured");
  }

  const roleName = opts.roleName?.trim() || "the role";
  const projectName = opts.projectName?.trim() || "the project";
  const otherProjectsBlock =
    opts.otherProjects && opts.otherProjects.length
      ? opts.otherProjects
          .map((p) => `- ${p.name}: ${p.techStack.join(", ") || "n/a"}`)
          .join("\n")
      : "None provided";

  const prompt = `You are an expert technical recruiter performing a rigorous, evidence-based resume evaluation.

STRICT GROUNDING RULES — follow exactly to avoid hallucination:
1. Base EVERY statement only on facts explicitly present in the resume text below. Never invent employers, job titles, dates, degrees, certifications, or skills.
2. If a piece of information is not present, use an empty string "", an empty array [], or "Not specified" — never guess.
3. Only list a technology under matched_technologies if it is clearly evidenced in the resume. Otherwise it is missing.
4. Derive total_experience_calculated and per-technology years only from dated roles/skills in the resume; if dates are missing, return "Not specified".
5. Be deterministic and consistent: identical input must always yield the same evaluation. Do not add creative embellishment.

Role being evaluated: ${roleName} on project "${projectName}".

Resume:
${resumeText.slice(0, MAX_RESUME)}

Required Tech Stack: ${projectTechStack.join(", ")}

Role Requirements:
${roleRequirements.slice(0, MAX_ROLE)}

Other open projects (for cross-suggestions):
${otherProjectsBlock}

Return ONLY a valid JSON object (no markdown) with EXACTLY these keys:
- tech_match_score (number)
- experience_level (string)
- matched_technologies (string[])
- missing_technologies (string[])
- tech_comparison: array of { technology, status } covering ALL Required Tech Stack items. status is "Matched" when clearly evidenced, "Unmatched" when absent, or "Clarification" when the resume only mentions it generically/vaguely (e.g. a bare keyword list) without concrete real-world usage.
- tech_experience: array of { technology, first_year, last_year, total_years } for the candidate's most-used technologies, computed from dated experience. Use "Present" for last_year when still in use. Include the top technologies by usage. If dates are unavailable, use "Not specified".
- clarifications: array of { technology, reason } for every technology the candidate listed only generically and where real-world, hands-on depth must be confirmed. reason briefly states why clarification is needed.
- domain_expertise: string[] of business/industry domains explicitly evidenced (e.g. Banking, Healthcare). Empty if none.
- strengths (string[])
- concerns (string[])  // weaknesses / gaps from the resume
- recommendation: one of "Proceed", "Hold", "Reject", justified strictly by resume evidence.
- summary (string)
- certifications (string[])
- career_history: array of { company, title, start, end, duration, is_current } ordered most recent first.
- total_experience_mentioned (string)
- total_experience_calculated (string)
- is_currently_employed (boolean)
- current_employer (string)  // current or, if not employed, most recent employer
- current_role (string)      // role/title at that employer
- current_tenure (string)    // duration at that employer
- suitability: { verdict, description } where verdict is "Suitable", "Partially suitable" or "Not suitable" for ${roleName} on "${projectName}", and description explains why in 1-3 sentences grounded in the resume.
- project_suggestions: array of { project, reason } naming which of the "Other open projects" above better match this candidate's skills. Empty array if none are provided or none match.

CONSISTENCY RULE: recommendation and suitability.verdict MUST agree. Use "Suitable" -> "Proceed", "Partially suitable" -> "Proceed" or "Hold", "Not suitable" -> "Reject". Never pair "Proceed" with "Not suitable" or "Reject" with "Suitable".`;

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
            "You are a meticulous technical recruiter. You never fabricate information and you produce deterministic, reproducible JSON evaluations grounded only in the provided resume.",
        },
        { role: "user", content: prompt },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const result = withDefaults(parseJson<Partial<ResumeMetrics>>(raw));
    if (!result.tech_comparison?.length) {
      result.tech_comparison = projectTechStack.map((t) => ({
        technology: t,
        status: result.matched_technologies?.includes(t)
          ? "Matched"
          : "Unmatched",
      }));
    }
    const matched = result.tech_comparison.filter(
      (t) => t.status === "Matched",
    ).length;
    result.tech_match_score = result.tech_comparison.length
      ? Math.round((matched / result.tech_comparison.length) * 100)
      : 0;
    return computeExperience(result);
  } catch (e) {
    return emptyMetrics(
      projectTechStack,
      `Analysis failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
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
  if (!openai)
    return [
      {
        question: "OpenAI API key not configured",
        category: "Technical",
        expected_answer_hints: "N/A",
      },
    ];

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
  if (!openai)
    return [
      {
        question: "OpenAI API key not configured",
        category: "Technical",
        expected_answer_hints: "N/A",
      },
    ];

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
  | "Refactoring";

export const QUESTION_CATEGORIES: {
  id: QuestionCategory;
  label: string;
  hint: string;
  /** Whether questions in this category are expected to include a code snippet. */
  code: boolean;
}[] = [
  { id: "Resume based", label: "Resume based", hint: "Probe claims made in the candidate's resume", code: false },
  { id: "Backend", label: "Backend", hint: "APIs, databases, concurrency, performance", code: false },
  { id: "Frontend", label: "Frontend", hint: "UI, state, rendering, accessibility", code: false },
  { id: "Architecture", label: "Architecture", hint: "System & solution design trade-offs", code: false },
  { id: "Scenario based", label: "Scenario based", hint: "Real-world situational problem solving", code: false },
  { id: "Code error spotting", label: "Find errors in code", hint: "Snippets with bugs to identify", code: true },
  { id: "Refactoring", label: "Refactoring techniques", hint: "Snippets to improve / refactor", code: true },
];

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
    throw new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to your .env.local file.");
  }

  const role = ctx.roleName?.trim() || "the role";
  const tech = (ctx.techStack ?? []).join(", ") || "the relevant stack";
  const wantsCode =
    category === "Code error spotting" || category === "Refactoring";

  const guidance: Record<QuestionCategory, string> = {
    "Resume based": `Base each question on concrete claims, projects and technologies from the candidate's resume below so the interviewer can verify real, hands-on depth.\n\nResume:\n${(ctx.resumeText ?? "").slice(0, MAX_RESUME_Q)}`,
    Backend: "Focus on backend engineering: API design, data modelling, transactions, caching, concurrency, scaling and debugging production issues.",
    Frontend: "Focus on frontend engineering: component design, state management, rendering/performance, accessibility, browser behaviour and testing.",
    Architecture: "Focus on system and solution architecture: trade-offs, scalability, reliability, data flow, and technology selection with justification.",
    "Scenario based": "Pose realistic on-the-job situations (incidents, ambiguous requirements, tight deadlines, cross-team conflicts) that reveal judgement and problem solving.",
    "Code error spotting": "For each item, include a short, realistic code snippet (in the candidate's primary language/stack) that contains one or more bugs. The question asks the candidate to find and explain the errors.",
    Refactoring: "For each item, include a short code snippet that works but has poor quality (duplication, bad naming, tight coupling, inefficiency). The question asks how the candidate would refactor it.",
  };

  const prompt = `You are helping an interviewer prepare ${count} "${category}" interview questions for ${role}. Tech stack: ${tech}.
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
        content:
          'You generate practical, role-relevant interview questions and return strict JSON. When code is requested, produce compilable-looking, realistic snippets. Respond with a JSON object shaped as {"questions": [...]}.',
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

export { isUnknown };
