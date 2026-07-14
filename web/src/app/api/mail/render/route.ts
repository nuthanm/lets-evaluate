import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { apiError } from "@/lib/api/helpers";
import { prepareMail, type MailVars } from "@/lib/email";

const renderSchema = z.object({
  slug: z.string().min(1),
  vars: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

/** Preview a template with placeholder substitution (no sending). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const body = renderSchema.parse(await req.json());
  const mail = await prepareMail(
    session.user.organizationId,
    body.slug,
    (body.vars ?? {}) as MailVars,
  );
  if (!mail) return apiError("Template not found", 404);
  return NextResponse.json(mail);
}
