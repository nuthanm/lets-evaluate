import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { buildJobDescriptionDocx, getJobDescriptionFilename } from "@/lib/job-description/export";
import { exportJobDescriptionInputSchema } from "@/lib/job-description/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const body = exportJobDescriptionInputSchema.parse(await req.json());
  const file = await buildJobDescriptionDocx(
    body.jobDescription,
    session.user.organizationId,
  );
  const filename = getJobDescriptionFilename(body.jobDescription, "docx");

  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
