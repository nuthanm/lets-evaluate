import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobDescriptions, projects } from "@/lib/db/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { jobDescriptionSchema } from "@/lib/job-description/types";

const saveSchema = z.object({
  jobDescription: jobDescriptionSchema,
  roleId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
});

function toOptionLabel(row: {
  title: string;
  location: string;
  experience: string;
  projectName: string | null;
}) {
  const base = `${row.title} - ${row.location} (${row.experience})`;
  return row.projectName ? `${base} · ${row.projectName}` : base;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "list";

  const baseWhere = eq(jobDescriptions.organizationId, session.user.organizationId);

  if (view === "options") {
    const rows = await db
      .select({
        id: jobDescriptions.id,
        title: jobDescriptions.title,
        location: jobDescriptions.location,
        experience: jobDescriptions.experience,
        roleId: jobDescriptions.roleId,
        projectId: jobDescriptions.projectId,
        projectName: projects.name,
        updatedAt: jobDescriptions.updatedAt,
      })
      .from(jobDescriptions)
      .leftJoin(projects, eq(jobDescriptions.projectId, projects.id))
      .where(and(baseWhere, isNotNull(jobDescriptions.roleId)))
      .orderBy(desc(jobDescriptions.updatedAt));

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        label: toOptionLabel(row),
        roleId: row.roleId,
        projectId: row.projectId,
        location: row.location,
        experience: row.experience,
        updatedAt: row.updatedAt,
      })),
    );
  }

  const rows = await db
    .select()
    .from(jobDescriptions)
    .where(baseWhere)
    .orderBy(desc(jobDescriptions.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const body = saveSchema.parse(await req.json());
  const roleId = body.roleId?.trim() || null;
  const projectId = body.projectId?.trim() || null;
  const location = body.jobDescription.location.trim();
  const experience = body.jobDescription.experience.trim();

  const duplicateConditions = [
    eq(jobDescriptions.organizationId, session.user.organizationId),
    roleId ? eq(jobDescriptions.roleId, roleId) : isNull(jobDescriptions.roleId),
    eq(jobDescriptions.location, location),
    eq(jobDescriptions.experience, experience),
    projectId ? eq(jobDescriptions.projectId, projectId) : isNull(jobDescriptions.projectId),
  ];

  const [existing] = await db
    .select({
      id: jobDescriptions.id,
      title: jobDescriptions.title,
      location: jobDescriptions.location,
      experience: jobDescriptions.experience,
      projectName: projects.name,
    })
    .from(jobDescriptions)
    .leftJoin(projects, eq(jobDescriptions.projectId, projects.id))
    .where(and(...duplicateConditions))
    .limit(1);

  if (existing) {
    return apiError(
      `A job description already exists for this role, location, and experience (${toOptionLabel(existing)}). Load the existing one instead of creating another.`,
      409,
    );
  }

  const id = uuid();
  await db.insert(jobDescriptions).values({
    id,
    organizationId: session.user.organizationId,
    roleId,
    projectId,
    title: body.jobDescription.roleTitle,
    location,
    experience,
    content: body.jobDescription,
    createdById: session.user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}
