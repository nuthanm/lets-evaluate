import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { startBulkJob } from "@/lib/application/bulk/start-bulk-job";
import { listBulkJobs } from "@/lib/db/repositories/bulk-job-repository";
import JSZip from "jszip";
import { logEvent } from "@/lib/events";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const jobs = await listBulkJobs(session.user.organizationId);
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const form = await req.formData();
  const csvFile = form.get("csv") as File | null;
  const zipFile = form.get("resumes") as File | null;
  const projectId = String(form.get("projectId") ?? "");
  const roleId = String(form.get("roleId") ?? "");

  if (!csvFile) return apiError("CSV file required", 400);
  if (!projectId || !roleId) return apiError("projectId and roleId required", 400);

  const csvText = await csvFile.text();
  const { parseBulkCsv } = await import("@/lib/application/bulk/start-bulk-job");
  const rows = parseBulkCsv(csvText);
  if (!rows.length) return apiError("No valid rows in CSV", 400);

  const resumeMap = new Map<string, { buffer: Buffer; filename: string }>();
  if (zipFile) {
    const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const name = path.split("/").pop() ?? path;
      const buf = Buffer.from(await entry.async("arraybuffer"));
      resumeMap.set(name.toLowerCase(), { buffer: buf, filename: name });
    }
  }

  const enriched = rows.map((row) => {
    const resumeName = (row.resume_filename ?? row.resumefilename ?? "").trim();
    const match = resumeName
      ? resumeMap.get(resumeName.toLowerCase())
      : undefined;
    return {
      ...row,
      resumeBuffer: match?.buffer,
      resumeFilename: match?.filename ?? resumeName,
    };
  });

  const result = await startBulkJob({
    organizationId: session.user.organizationId,
    projectId,
    roleId,
    createdById: session.user.id,
    rows: enriched,
  });

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "bulk_job",
    entityId: result.jobId,
    action: "bulk_job.started",
    payload: { count: result.itemIds.length, skipped: result.skipped.length },
  });

  return NextResponse.json(result);
}
