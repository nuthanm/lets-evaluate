import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { getBrand } from "@/lib/brand";
import { isAiTestMode } from "@/lib/ai/test-mode";
import { mockJobDescription } from "@/lib/ai/mock-fixtures";
import { normalizeGeneratedJobDescription } from "@/lib/job-description/normalize-generated";
import { generateJobDescriptionInputSchema } from "@/lib/job-description/types";
import { extractResumeText } from "@/lib/resume/parse";
import { isAllowedResumeFilename } from "@/lib/resume/formats";

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const MAX_JD_TEXT = 12000;

export const runtime = "nodejs";

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

function importErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (/json|unexpected token|unterminated/i.test(message)) {
    return "The uploaded job description could not be structured. Please try again or use a text-searchable PDF or DOCX file.";
  }

  if (/max|too long|length/i.test(message)) {
    return "The uploaded job description contains text that is too long for the preview. Please upload a shorter version of the document.";
  }

  return "Could not create a preview from this job description. Please try again.";
}

function fileReadError(error: unknown, filename: string): string {
  const message = error instanceof Error ? error.message : "";

  if (/password|encrypted/i.test(message)) {
    return "This PDF is password-protected. Remove the password and upload it again.";
  }

  if (/invalid pdf|corrupt|xref|unexpected end|syntax error/i.test(message)) {
    return "This PDF appears to be damaged or incomplete. Export it again and upload the new file.";
  }

  return `Could not extract text from ${filename}. Upload a text-searchable PDF or a DOCX file.`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError("Upload a PDF or DOCX job description file.", 400);
  }
  if (!isAllowedResumeFilename(file.name)) {
    return apiError("Please upload a job description in PDF or DOCX format.", 400);
  }

  const input = generateJobDescriptionInputSchema.parse({
    roleTitle: String(form.get("roleTitle") ?? ""),
    location: String(form.get("location") ?? ""),
    experience: String(form.get("experience") ?? ""),
    domain: String(form.get("domain") ?? "").trim() || undefined,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = "";
  try {
    extractedText = await extractResumeText(buffer, file.name);
  } catch (error) {
    console.error("[job-descriptions/import] file text extraction failed", {
      filename: file.name,
      error,
    });
    return apiError(fileReadError(error, file.name), 422);
  }

  if (!extractedText.trim()) {
    return apiError(
      "No text could be found in this file. Upload a text-searchable PDF or a DOCX file.",
      422,
    );
  }

  const brand = getBrand();
  const orgName = brand.orgName;
  const openai = openaiClient();

  if (!openai) {
    if (isAiTestMode()) {
      const mock = mockJobDescription(orgName, input.roleTitle);
      const jobDescription = normalizeGeneratedJobDescription(input, mock, orgName);
      return NextResponse.json({
        jobDescription,
        usage: null,
        mock: true,
      });
    }
    return apiError("OpenAI API key not configured", 500);
  }

  const prompt = [
    `You are a senior technical recruiter at ${orgName}.`,
    "Convert the uploaded job description text into the structured JSON format below.",
    "Preserve the original wording and intent wherever possible — do not invent requirements that are not in the source text.",
    "Use the form metadata below when the source text is missing header details.",
    "",
    "OUTPUT FORMAT — return strict JSON only, no markdown, no extra keys:",
    '{"aboutRole":"...","whatYoullDo":["..."],"whatYouBring":{"summary":"...","skills":["..."],"domain":"..."},"whyJoinKanini":["..."],"readyToMakeImpact":"..."}',
    "",
    "FORM METADATA:",
    `Role Title: ${input.roleTitle}`,
    `Location: ${input.location}`,
    `Experience Required: ${input.experience}`,
    `Domain / Industry: ${input.domain?.trim() || "Not specified"}`,
    "",
    "UPLOADED JOB DESCRIPTION TEXT:",
    extractedText.slice(0, MAX_JD_TEXT),
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You structure existing job descriptions into JSON. Return valid JSON only. Keep content faithful to the uploaded source.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = parseJson<Record<string, unknown>>(raw);
    const jobDescription = normalizeGeneratedJobDescription(input, parsed, orgName);

    return NextResponse.json({
      jobDescription,
      usage: {
        model: completion.model,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("[job-descriptions/import] AI structuring failed", {
      filename: file.name,
      error,
    });
    return apiError(importErrorMessage(error), 422);
  }
}
