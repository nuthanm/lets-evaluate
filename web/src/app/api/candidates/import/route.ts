import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { ensureCandidateStages } from "@/lib/db/queries";
import { v4 as uuid } from "uuid";
import { logEvent } from "@/lib/events";

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta", "ta_lead"]);
  if (forbidden) return forbidden;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return apiError("CSV file required", 400);

  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) return apiError("No data rows in CSV", 400);

  const created: string[] = [];
  for (const row of rows) {
    const name = row.name || row.candidate_name;
    if (!name) continue;
    const id = uuid();
    await db.insert(candidates).values({
      id,
      organizationId: session.user.organizationId,
      name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      source: row.source ?? "csv_import",
      projectId: row.project_id || row.projectid || null,
      roleId: row.role_id || row.roleid || null,
      status: "draft",
      createdById: session.user.id,
      consentAt: row.consent === "yes" ? new Date() : null,
    });
    if (row.project_id || row.projectid) {
      await ensureCandidateStages(
        session.user.organizationId,
        id,
        row.project_id || row.projectid,
      );
    }
    created.push(id);
  }

  await logEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    entityType: "import",
    entityId: "candidates",
    action: "candidates.imported",
    payload: { count: created.length },
  });

  return NextResponse.json({ imported: created.length, ids: created });
}
