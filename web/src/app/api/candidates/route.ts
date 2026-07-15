import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates, jobDescriptions } from "@/lib/db/schema";
import {
  ensureCandidateStages,
  getActivityFeed,
  getCandidatesForUser,
  getUserStats,
} from "@/lib/db/queries";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { v4 as uuid } from "uuid";
import { storeResume } from "@/lib/storage/resumes";
import { extractResumeText } from "@/lib/resume/parse";
import { and, eq } from "drizzle-orm";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";
import {
  validateCandidateEmail,
  validateCandidateName,
  validateResumeTextLength,
} from "@/lib/candidates/validation";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

  if (view === "feed") {
    const feed = await getActivityFeed(
      session.user.organizationId,
      session.user.role === "admin" ? null : session.user.id,
    );
    return NextResponse.json(feed);
  }

  if (view === "stats") {
    const stats = await getUserStats(
      session.user.organizationId,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json(stats);
  }

  const candidates = await getCandidatesForUser(
    session.user.organizationId,
    session.user.id,
    session.user.role,
  );
  return NextResponse.json(candidates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const jobDescriptionId = String(form.get("jobDescriptionId") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim();
    const source = String(form.get("source") ?? "").trim();
    const consent = form.get("consent") === "true" || form.get("consent") === "on";
    const file = form.get("resume") as File | null;

    if (!jobDescriptionId) {
      return apiError("Job ID selection is required before creating a candidate.", 400);
    }

    const [jobDescription] = await db
      .select({
        id: jobDescriptions.id,
        roleId: jobDescriptions.roleId,
        projectId: jobDescriptions.projectId,
      })
      .from(jobDescriptions)
      .where(
        and(
          eq(jobDescriptions.id, jobDescriptionId),
          eq(jobDescriptions.organizationId, session.user.organizationId),
        ),
      )
      .limit(1);

    if (!jobDescription) {
      return apiError("Selected Job ID was not found.", 400);
    }

    if (!jobDescription.roleId) {
      return apiError(
        "Selected Job ID is missing role mapping. Save JD with a mapped role to continue.",
        400,
      );
    }

    const nameError = validateCandidateName(name);
    if (nameError) return apiError(nameError, 400);

    const emailError = validateCandidateEmail(email);
    if (emailError) return apiError(emailError, 400);

    let resumeStorageKey: string | undefined;
    let resumeFilename = "";
    let resumeText: string | undefined;

    if (file && file.size > 0) {
      if (!isAllowedResumeFilename(file.name)) {
        return apiError(RESUME_UPLOAD_FRIENDLY_ERROR, 400);
      }
      if (file.size > 10 * 1024 * 1024) {
        return apiError("Resume must be under 10MB", 400);
      }
      const buf = Buffer.from(await file.arrayBuffer());
      resumeFilename = file.name;
      // Persisting the raw file is best-effort — the extracted text drives
      // analysis, so a storage failure must not block candidate creation.
      try {
        resumeStorageKey = await storeResume(buf, file.name);
      } catch (err) {
        console.error("Resume storage failed", err);
      }
      resumeText = await extractResumeText(buf, file.name);
      if (resumeText) {
        const resumeLengthError = validateResumeTextLength(resumeText);
        if (resumeLengthError) return apiError(resumeLengthError, 400);
      }
    }

    const id = uuid();
    await db.insert(candidates).values({
      id,
      organizationId: session.user.organizationId,
      name,
      email,
      phone: phone || "",
      source: source || "",
      consentAt: consent ? new Date() : null,
      projectId: jobDescription.projectId,
      roleId: jobDescription.roleId,
      jobDescriptionId: jobDescription.id,
      resumeStorageKey,
      resumeFilename,
      resumeText: resumeText ?? null,
      status: "draft",
      createdById: session.user.id,
    });

    // Materialize the candidate's interview flow from their project (or the
    // org default) so the stage menu is available from the start.
    await ensureCandidateStages(
      session.user.organizationId,
      id,
      jobDescription.projectId,
    );

    return NextResponse.json({ id, resumeText }, { status: 201 });
  } catch (err) {
    console.error("Candidate creation failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to create candidate";
    return apiError(message, 500);
  }
}
