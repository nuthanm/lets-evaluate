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
  const { text, type, questions } = body as {
    text?: string;
    type?: string;
    questions?: { category: string; question: string; difficulty: string; satisfaction: string; notes: string }[];
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  let prompt: string;
  if (type === "question") {
    prompt = `You are an expert technical interviewer. Rewrite the following interview question to be clearer, more specific, and better at evaluating a candidate's technical depth. Keep it concise. Return only the improved question text, nothing else.\n\nQuestion: ${text.trim()}`;
  } else if (questions && questions.length > 0) {
    const qLines = questions
      .map((q, i) => {
        const satisfactionLabel = q.satisfaction || "Not assessed";
        const notesLine = q.notes?.trim() ? `\n   Notes: ${q.notes.trim()}` : "";
        return `${i + 1}. [${q.category}] (${q.difficulty}) ${q.question}\n   Outcome: ${satisfactionLabel}${notesLine}`;
      })
      .join("\n\n");

    prompt = `You are an expert technical recruiter writing a professional interview evaluation report.

The interviewer has provided the following initial comment:
"${text.trim()}"

Below is the full list of questions asked during the interview along with how the candidate performed on each:

${qLines}

Using the interviewer's comment AND the question-by-question performance above, write a structured, professional justification for the evaluation report. The output must:
- Start with a brief overall assessment paragraph that incorporates the interviewer's own words
- Include a "Question Performance" section that summarises how the candidate did on each question (group by category where possible, mention satisfied/not satisfied and any specific notes)
- Include a "Strengths" section based on satisfied questions and positive notes
- Include a "Concerns / Gaps" section based on unsatisfied questions or missing notes
- End with a "Recommendation" sentence that ties everything together
- Be professional, specific, and concise
- Return plain text only — no markdown headers with # symbols, use bold labels like "Overall Assessment:", "Question Performance:", "Strengths:", "Concerns / Gaps:", "Recommendation:"`;
  } else {
    prompt = `You are an expert technical recruiter writing a professional evaluation report. Improve the following interviewer justification to be more structured, specific, and professional while preserving all the original facts and opinions. Return only the improved text, nothing else.\n\nJustification: ${text.trim()}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: questions && questions.length > 0 ? 1200 : 600,
      temperature: 0.5,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() ?? text.trim();
    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "AI enhancement failed. Please try again." }, { status: 500 });
  }
}
