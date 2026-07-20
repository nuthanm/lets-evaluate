import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  deleteJobDescriptionRecord,
  getJobDescriptionDeleteImpact,
  sendJobDescriptionDeleteNotifications,
} from "@/lib/job-description/delete";
import { db } from "@/lib/db";
import { jobDescriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const deleteSchema = z.object({
  confirmText: z.string().trim().optional(),
  force: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const { searchParams } = new URL(_req.url);
  const view = searchParams.get("view") ?? "impact";

  // If requesting the full job description content
  if (view === "content") {
    const row = await db.query.jobDescriptions.findFirst({
      where: and(
        eq(jobDescriptions.id, id),
        eq(jobDescriptions.organizationId, session.user.organizationId),
      ),
    });

    if (!row) {
      return apiError("Job description not found", 404);
    }

    return NextResponse.json({
      id: row.id,
      title: row.title,
      location: row.location,
      experience: row.experience,
      updatedAt: row.updatedAt,
      content: row.content,
    });
  }

  // Default: return delete impact (skip email preview — only needed on actual DELETE)
  const impact = await getJobDescriptionDeleteImpact(
    session.user.organizationId,
    id,
  );
  if (!impact) return apiError("Not found", 404);

  return NextResponse.json({
    jobDescription: impact.jobDescription,
    candidates: impact.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      projectName: candidate.projectName,
      roleName: candidate.roleName,
    })),
    notificationPreview: [],
    hasLinkedProject: impact.hasLinkedProject,
    impactedCount: impact.candidates.length,
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = deleteSchema.parse(await req.json().catch(() => ({})));
  const impact = await getJobDescriptionDeleteImpact(
    session.user.organizationId,
    id,
  );
  if (!impact) return apiError("Not found", 404);

  const requiresConfirmation = impact.candidates.length > 0 || impact.hasLinkedProject;
  if (requiresConfirmation && body.confirmText !== "DELETE") {
    return new Response(
      JSON.stringify({
        error: "Confirm deletion after reviewing linked candidates and project mapping.",
        impact: {
          jobDescription: impact.jobDescription,
          candidates: impact.candidates,
          notificationPreview: impact.notificationPreview,
          hasLinkedProject: impact.hasLinkedProject,
          impactedCount: impact.candidates.length,
        },
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const sentNotifications = requiresConfirmation
    ? await sendJobDescriptionDeleteNotifications({
        organizationId: session.user.organizationId,
        impact,
        actorName: session.user.name ?? undefined,
      })
    : [];

  const deleted = await deleteJobDescriptionRecord(
    session.user.organizationId,
    id,
  );
  if (!deleted) return apiError("Job description not found", 404);

  return NextResponse.json({
    id: deleted.id,
    title: deleted.title,
    impactedCount: impact.candidates.length,
    sentNotifications,
  });
}
