import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { getBrand } from "@/lib/brand";
import { isAiTestMode } from "@/lib/ai/test-mode";
import { mockJobDescription } from "@/lib/ai/mock-fixtures";
import {
  ensureGreatPlaceToWorkLine,
  generateJobDescriptionInputSchema,
  jobDescriptionSchema,
} from "@/lib/job-description/types";

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const MAX_CONTEXT = 1200;

function openaiClient() {
  if (isAiTestMode()) return null;
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

function resolvePromptPlaceholders(
  text: string,
  input: {
    roleTitle: string;
    location: string;
    experience: string;
    skills: string;
    domain?: string;
  },
) {
  return text
    .replaceAll("[Insert Role]", input.roleTitle)
    .replaceAll("[Insert Location]", input.location)
    .replaceAll("[Insert Years]", input.experience)
    .replaceAll("[Insert Experience]", input.experience)
    .replaceAll("[Insert Skills]", input.skills || "Not specified")
    .replaceAll("[Insert Domain]", input.domain || "Not specified")
    .replaceAll("{{ROLE}}", input.roleTitle)
    .replaceAll("{{LOCATION}}", input.location)
    .replaceAll("{{EXPERIENCE}}", input.experience)
    .replaceAll("{{SKILLS}}", input.skills || "Not specified")
    .replaceAll("{{DOMAIN}}", input.domain || "Not specified");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  let body: ReturnType<typeof generateJobDescriptionInputSchema.parse>;
  try {
    body = generateJobDescriptionInputSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first?.path ?? [];
      if (path[0] === "mustHaveSkills") {
        const idx = typeof path[1] === "number" ? path[1] + 1 : "";
        return apiError(
          `Skill ${idx ? `#${idx}` : ""} is too long — each skill must be 60 characters or fewer. Please shorten it and try again.`,
          400,
        );
      }
      return apiError(first?.message ?? "Invalid input.", 400);
    }
    throw err;
  }

  const openai = openaiClient();
  if (!openai) {
    if (isAiTestMode()) {
      const brand = getBrand();
      const mock = mockJobDescription(brand.orgName, body.roleTitle);
      return NextResponse.json({
        ...mock,
        generatedAt: new Date().toISOString(),
        mock: true,
      });
    }
    return apiError("OpenAI API key not configured", 500);
  }

  const brand = getBrand();
  const orgName = brand.orgName;

  const skills = (body.mustHaveSkills ?? []).slice(0, 12).join(", ");
  const contextRaw = (body.additionalContext ?? "").slice(0, MAX_CONTEXT);
  const context = resolvePromptPlaceholders(contextRaw, {
    roleTitle: body.roleTitle,
    location: body.location,
    experience: body.experience,
    skills,
    domain: body.domain?.trim(),
  });

  const prompt = [
    `You are a senior technical recruiter at ${orgName} writing a job description for a client-facing enterprise hiring campaign.`,
    `Generate a complete, professional Job Description in ${orgName}'s official format.`,
    "",
    "SECTION RULES — follow exactly in this order:",
    "",
    "1. aboutRole (2-3 sentences)",
    `   - Open with ${orgName}'s identity: an enterprise technology company delivering innovation across industries.`,
    "   - Describe what this specific role does, why it exists, and the impact it creates for clients or internal teams.",
    "   - End with a sentence about the team environment or opportunity for the candidate.",
    `   - Example: 'At ${orgName}, we partner with enterprises to engineer scalable, high-impact technology solutions. As a [Role], you will lead end-to-end delivery of [key responsibility], directly influencing client outcomes. You will work in a high-performing team that values ownership, speed, and continuous learning.'`,
    "",
    "2. whatYoullDo — exactly 6-8 bullets",
    "   - Each bullet must be a specific, action-oriented responsibility for THIS role.",
    "   - Start with a strong verb: Design, Lead, Build, Drive, Own, Architect, Evaluate, Collaborate, Implement.",
    "   - Be specific to the role title and domain — avoid generic phrases like 'work with stakeholders' or 'assist team'.",
    "   - Cover the full scope: technical delivery + cross-team interaction + quality/ownership.",
    "   - Example (for Application Architect): 'Architect and govern application design standards across distributed teams to ensure scalability and resilience.'",
    "   - Example: 'Lead architectural reviews, identify technical debt, and drive remediation with engineering teams.'",
    "   - Example: 'Define cloud infrastructure strategy on Azure, including cost optimization and high availability patterns.'",
    "   - Max 20 words per bullet.",
    "",
    "3. whatYouBring.summary (1-2 sentences)",
    "   - Describe the ideal candidate's background, mindset, and what they bring to the team.",
    "   - Example: 'You are a seasoned architect with deep expertise in cloud-native solutions and a track record of leading enterprise-scale delivery.'",
    "",
    "4. whatYouBring.skills — exactly 6-8 full requirement sentences",
    "   - These are NON-NEGOTIABLE: write complete, specific requirement sentences. NOT short skill tags.",
    "   - Cover these types across the list (in order):",
    "     a) Total years of experience + role context  → '12+ years of software development experience including 4+ years in an architect or technical lead capacity.'",
    "     b) Core technical skills/stack with specifics → 'Hands-on expertise in [specific tech stack], including [tools/frameworks] for [use case].'",
    "     c) Platform/cloud/infrastructure knowledge   → 'Proficiency in Azure/AWS cloud architecture including IaaS, PaaS, serverless, and CI/CD pipeline design.'",
    "     d) Architecture/design patterns              → 'Deep understanding of microservices, event-driven architecture, API design, and distributed system patterns.'",
    "     e) Domain or industry knowledge              → 'Exposure to [domain] industry processes, compliance requirements, and enterprise integration standards.'",
    "     f) Soft skills / leadership                  → 'Proven ability to communicate complex technical decisions to non-technical stakeholders and executive sponsors.'",
    "     g) Delivery methodology                      → 'Experience delivering projects in Agile/Scrum environments with strong ownership of sprint goals and release quality.'",
    "",
    "5. whatYouBring.domain (1 sentence)",
    "   - State the domain clearly. Example: 'Healthcare' or 'BFSI — Banking, Financial Services, and Insurance'.",
    "",
    `6. whyJoin${orgName} — 4-5 bullets`,
    "   - One bullet MUST mention 'Great Place to Work' recognition explicitly.",
    "   - Cover: career growth, tech exposure, culture, learning, work environment.",
    "   - Example: 'Work on complex, high-stakes enterprise projects that stretch your technical and leadership capabilities.'",
    "   - Example: 'Certified as a Great Place to Work — we invest in people through mentorship, L&D, and internal mobility.'",
    "",
    "7. readyToMakeImpact (1-2 sentences)",
    "   - A compelling, direct call-to-action. Energetic tone.",
    `   - Example: 'Ready to shape the future of enterprise technology with ${orgName}? Apply now and let us build something exceptional together.'`,
    "",
    "OUTPUT FORMAT — return strict JSON only, no markdown, no extra keys:",
    '{"aboutRole":"...","whatYoullDo":["..."],"whatYouBring":{"summary":"...","skills":["..."],"domain":"..."},"whyJoinKanini":["..."],"readyToMakeImpact":"..."}',
    "",
    "CRITICAL RULES:",
    "- Only use facts from the input. Do not invent tools, certifications, or domain knowledge not mentioned.",
    "- If must-have skills are provided, anchor the tech bullets around them.",
    "- If additional context is provided, reflect it in responsibilities and requirements.",
    "- No generic filler. Every sentence must add specific value.",
    "- No placeholders, no markdown, no section headings inside JSON values.",
    "",
    "INPUT:",
    `Role Title: ${body.roleTitle}`,
    `Location: ${body.location}`,
    `Experience Required: ${body.experience}`,
    `Domain / Industry: ${body.domain?.trim() || "Not specified"}`,
    `Must-have skills: ${skills || "Not specified"}`,
    `Additional context: ${context || "None"}`,
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You are a senior technical recruiter at ${orgName}, an enterprise technology company. You write precise, structured, candidate-friendly job descriptions for enterprise hiring. Return valid JSON only. Be specific to the role — never write generic content. Every bullet must reflect real responsibilities and real requirements for this exact role.`,
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
        : `${body.roleTitle} at ${orgName} plays a high-impact role in delivering measurable outcomes for enterprise clients through strong execution and collaboration.`,
    whatYoullDo: clampArray(
      Array.isArray(parsed.whatYoullDo)
        ? parsed.whatYoullDo.filter((item): item is string => typeof item === "string")
        : undefined,
      6,
      8,
      [
        "Own assigned responsibilities end to end with clear quality and delivery commitments.",
        "Collaborate with cross-functional stakeholders to translate goals into practical execution plans.",
        "Drive design, implementation, and improvement of scalable, maintainable solutions.",
        "Identify risks early and resolve blockers with clear, data-backed recommendations.",
        "Contribute to standards that improve team effectiveness, consistency, and reuse.",
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
          `${body.experience} of relevant professional experience aligned to ${body.roleTitle}.`,
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
          `Recognized as a Great Place to Work, ${orgName} invests in people, trust, and long-term growth.`,
          "Work on high-impact enterprise programs with modern platforms and experienced teams.",
          "Expand your technical and domain expertise through cross-functional collaboration and ownership.",
        ],
      ),
    ),
    readyToMakeImpact:
      typeof parsed.readyToMakeImpact === "string" && parsed.readyToMakeImpact.trim()
        ? parsed.readyToMakeImpact.trim()
        : `Ready to build meaningful outcomes with ${orgName}? Apply now and help shape impactful solutions for global clients.`,
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
