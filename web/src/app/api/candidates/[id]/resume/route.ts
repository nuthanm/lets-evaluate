import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError } from "@/lib/api/helpers";
import { readResume } from "@/lib/storage/resumes";

type Params = { params: Promise<{ id: string }> };

function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  return "application/octet-stream";
}

/** Stream the stored resume file for inline preview (PDF) or download (other). */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id } = await params;

  const [row] = await db
    .select({
      resumeStorageKey: candidates.resumeStorageKey,
      resumeFilename: candidates.resumeFilename,
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.id, id),
        eq(candidates.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!row) return apiError("Not found", 404);
  if (!row.resumeStorageKey) return apiError("No resume on file", 404);

  try {
    const buf = await readResume(row.resumeStorageKey);
    const filename = row.resumeFilename ?? "resume";
    const contentType = guessMime(filename);
    const isPdf = contentType === "application/pdf";

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // inline → browser renders it (PDF); attachment → forces download (DOCX)
        "Content-Disposition": `${isPdf ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return apiError("Resume file unavailable", 404);
  }
}
