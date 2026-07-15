import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  ensureGreatPlaceToWorkLine,
  generateJobDescriptionInputSchema,
  jobDescriptionSchema,
} from "@/lib/job-description/types";

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const MAX_CONTEXT = 1000;

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.startsWith("sk-")) return null;
  return new OpenAI({ apiKey: key });
}

function parseJson<T>(text: string): T {
  let value = text.trim();
  if (value.startsWith("```")) {
    value = value
      .split("\n")
      .filter((line) => !line.trim().startsWith("```"))
      .join("\n")
      .trim();
  }
  return JSON.parse(value) as T;
}

function clampArray(items: string[] | undefined, min: number, max: number, fallback: string[]) {
  const source = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (source.length >= min) return source.slice(0, max);
  return fallback.slice(0, max);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const body = generateJobDescriptionInputSchema.parse(await req.json());

  const openai = openaiClient();
  if (!openai) {
    return apiError("OpenAI API key not configured", 500);
  }

  const skills = (body.mustHaveSkills ?? []).slice(0, 12).join(", ");
  const context = (body.additionalContext ?? "").slice(0, MAX_CONTEXT);

  const prompt = [
    "Create a recruiter-grade Job Description in KANINI official style.",
    "Tone: crisp, professional, candidate-friendly.",
    "Always highlight Great Place to Work recognition.",
    "Return strict JSON only with this shape:",
    '{"aboutRole":"...","whatYoullDo":["..."],"whatYouBring":{"summary":"...","skills":["..."],"domain":"..."},"whyJoinKanini":["..."],"readyToMakeImpact":"..."}',
    "Rules:",
    "1) whatYoullDo must have 6-8 action bullets.",
    "2) whatYouBring.skills must be concrete and role-relevant.",
    "3) whyJoinKanini must include one line mentioning Great Place to Work.",
    "4) Avoid placeholders, avoid markdown, no headings in values.",
    "5) Keep each bullet <= 22 words.",
    "Input:",
    `Role Title: ${body.roleTitle}`,
    `Location: ${body.location}`,
    `Experience: ${body.experience}`,
    `Domain: ${body.domain?.trim() || "Not specified"}`,
    `Must-have skills: ${skills || "Not specified"}`,
    `Additional context: ${context || "None"}`,
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 950,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write accurate, structured hiring content for enterprise recruiting teams. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = parseJson<Record<string, unknown>>(raw);

  const candidate = {
    roleTitle: body.roleTitle,
    location: body.location,
    experience: body.experience,
    aboutRole:
      typeof parsed.aboutRole === "string" && parsed.aboutRole.trim()
        ? parsed.aboutRole.trim()
        : `${body.roleTitle} at KANINI plays a high-impact role in delivering measurable outcomes for enterprise clients through strong execution and collaboration.`,
    whatYoullDo: clampArray(
      Array.isArray(parsed.whatYoullDo)
        ? parsed.whatYoullDo.filter((item): item is string => typeof item === "string")
        : undefined,
      6,
      8,
      [
        "Own end-to-end delivery of assigned responsibilities with clear quality and timeline commitments.",
        "Collaborate with cross-functional stakeholders to translate business goals into practical execution plans.",
        "Drive design, implementation, and continuous improvement of scalable, maintainable solutions.",
        "Proactively identify delivery risks and resolve blockers with data-backed recommendations.",
        "Contribute to technical and process standards that improve team effectiveness and consistency.",
        "Communicate progress, dependencies, and outcomes clearly to project and business leaders.",
      ],
    ),
    whatYouBring: {
      summary:
        typeof parsed.whatYouBring === "object" &&
        parsed.whatYouBring &&
        typeof (parsed.whatYouBring as { summary?: unknown }).summary === "string"
          ? ((parsed.whatYouBring as { summary: string }).summary || "").trim() ||
            "You bring strong execution fundamentals, role-aligned technical depth, and a collaborative mindset."
          : "You bring strong execution fundamentals, role-aligned technical depth, and a collaborative mindset.",
      skills: clampArray(
        typeof parsed.whatYouBring === "object" && parsed.whatYouBring
          ? Array.isArray((parsed.whatYouBring as { skills?: unknown[] }).skills)
            ? (parsed.whatYouBring as { skills: unknown[] }).skills.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined
          : undefined,
        4,
        12,
        [
          `${body.experience} of relevant professional experience in ${body.roleTitle}.`,
          "Strong communication and stakeholder management across technical and business teams.",
          "Hands-on delivery mindset with attention to quality, reliability, and maintainability.",
          "Ability to work effectively in fast-paced, outcome-driven project environments.",
        ],
      ),
      domain:
        typeof parsed.whatYouBring === "object" &&
        parsed.whatYouBring &&
        typeof (parsed.whatYouBring as { domain?: unknown }).domain === "string"
          ? ((parsed.whatYouBring as { domain: string }).domain || "").trim() ||
            body.domain?.trim() ||
            "Experience in enterprise-grade delivery environments."
          : body.domain?.trim() || "Experience in enterprise-grade delivery environments.",
    },
    whyJoinKanini: ensureGreatPlaceToWorkLine(
      clampArray(
        Array.isArray(parsed.whyJoinKanini)
          ? parsed.whyJoinKanini.filter((item): item is string => typeof item === "string")
          : undefined,
        3,
        6,
        [
          "Recognized as a Great Place to Work, KANINI invests in people, trust, and long-term growth.",
          "Work on high-impact enterprise programs with modern platforms and experienced teams.",
          "Expand your technical and domain expertise through cross-functional collaboration and ownership.",
        ],
      ),
    ),
    readyToMakeImpact:
      typeof parsed.readyToMakeImpact === "string" && parsed.readyToMakeImpact.trim()
        ? parsed.readyToMakeImpact.trim()
        : "Ready to build meaningful outcomes with KANINI? Apply now and help shape impactful solutions for global clients.",
    generatedAt: new Date().toISOString(),
  };

  const jobDescription = jobDescriptionSchema.parse(candidate);

  return NextResponse.json({
    jobDescription,
    usage: {
      model: completion.model,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
    },
  });
}
