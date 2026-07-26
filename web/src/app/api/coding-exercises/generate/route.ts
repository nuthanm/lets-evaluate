import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { generateCodingExercise } from "@/lib/ai";

const schema = z.object({
  prompt: z.string().min(1).max(2000),
  roleName: z.string().optional(),
  projectName: z.string().optional(),
  language: z.string().optional(),
  timeLimitMin: z.number().int().min(10).max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, [
    "admin",
    "ta",
    "ta_lead",
    "interviewer",
    "manager",
    "hr",
  ]);
  if (forbidden) return forbidden;

  const body = schema.parse(await req.json());
  try {
    const draft = await generateCodingExercise(body);
    return NextResponse.json(draft);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return apiError(message, 500);
  }
}
