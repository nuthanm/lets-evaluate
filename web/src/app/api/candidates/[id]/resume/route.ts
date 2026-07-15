import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  try {
    // Get the candidate
    const candidateResult = await db
      .select({
        resumeStorageKey: candidates.resumeStorageKey,
        resumeFilename: candidates.resumeFilename,
        organizationId: candidates.organizationId,
      })
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);

    if (!candidateResult || candidateResult.length === 0) {
      return apiError("Not found", 404);
    }

    const candidate = candidateResult[0];
    if (!candidate.resumeStorageKey) return apiError("No resume on file", 404);

    // Check if candidate belongs to user's organization
    // Admins can access candidates from any organization
    if (session.user.role !== "admin" && candidate.organizationId !== session.user.organizationId) {
      return apiError("Not found", 404);
    }

    // Serve the resume file
    const buf = await readResume(candidate.resumeStorageKey);
    const filename = candidate.resumeFilename ?? "resume";
    const contentType = guessMime(filename);
    const isPdf = contentType === "application/pdf";

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${isPdf ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return apiError("Resume file unavailable", 404);
  }
}
