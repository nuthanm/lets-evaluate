import { NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  isAcceptedImportFile,
  friendlyFormatError,
  parseSpreadsheetFile,
  type ImportEntity,
} from "@/lib/import/spreadsheet";
import { createImportTask, listImportTasks } from "@/lib/import/task-store";
import { processImportRows } from "@/lib/import/processors";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const entitySchema = z.enum(["projects", "roles", "locations", "openings"]);

const ENTITY_LABELS: Record<ImportEntity, string> = {
  projects: "Projects import",
  roles: "Roles import",
  locations: "Office locations import",
  openings: "Openings import",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const tasks = listImportTasks(session.user.organizationId, session.user.id);
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const form = await req.formData();
  const file = form.get("file");
  const entityRaw = form.get("entity");

  if (!(file instanceof File)) return apiError("File is required", 400);
  const entityResult = entitySchema.safeParse(entityRaw);
  if (!entityResult.success) return apiError("Invalid import type", 400);
  const entity = entityResult.data;

  if (!isAcceptedImportFile(file)) {
    return apiError(friendlyFormatError(file.name), 400);
  }

  let rows;
  try {
    rows = await parseSpreadsheetFile(file);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Could not read file", 400);
  }

  const taskId = uuid();
  createImportTask({
    id: taskId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    entity,
    label: ENTITY_LABELS[entity],
    total: rows.length,
  });

  after(async () => {
    await processImportRows(
      taskId,
      entity,
      rows,
      session.user.organizationId,
      session.user.id,
    );
  });

  return NextResponse.json({ taskId, status: "queued", total: rows.length }, { status: 202 });
}
