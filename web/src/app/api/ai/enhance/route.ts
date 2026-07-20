import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { text, type } = body as { text?: string; type?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const prompt =
    type === "question"
      ? `You are an expert technical interviewer. Rewrite the following interview question to be clearer, more specific, and better at evaluating a candidate's technical depth. Keep it concise. Return only the improved question text, nothing else.\n\nQuestion: ${text.trim()}`
      : `You are an expert technical recruiter writing a professional evaluation report. Improve the following interviewer justification to be more structured, specific, and professional while preserving all the original facts and opinions. Return only the improved text, nothing else.\n\nJustification: ${text.trim()}`;

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.5,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() ?? text.trim();
    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "AI enhancement failed. Please try again." }, { status: 500 });
  }
}
