import { db } from "@/lib/db";
import { projects, roles, officeLocations } from "@/lib/db/schema";
import { getOrgProjects } from "@/lib/db/queries";
import type { CsvRow } from "@/lib/application/bulk/csv-parser";
import type { ImportEntity } from "@/lib/import/spreadsheet";
import { updateImportTask } from "@/lib/import/task-store";
import { v4 as uuid } from "uuid";

function splitList(value: string) {
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveProjectIds(
  row: CsvRow,
  projectByName: Map<string, string>,
  projectById: Map<string, string>,
): string[] {
  const raw =
    row.projects ||
    row.project ||
    row.project_names ||
    row.project_ids ||
    row.project_id ||
    "";
  if (!raw) return [];
  return Array.from(
    new Set(
      splitList(raw)
        .map((token) => projectByName.get(token.toLowerCase()) ?? projectById.get(token))
        .filter(Boolean) as string[],
    ),
  );
}

async function loadProjectMaps(orgId: string) {
  const orgProjects = await getOrgProjects(orgId);
  const byName = new Map(orgProjects.map((p) => [p.name.toLowerCase(), p.id]));
  const byId = new Map(orgProjects.map((p) => [p.id, p.id]));
  return { byName, byId };
}

export async function processImportRows(
  taskId: string,
  entity: ImportEntity,
  rows: CsvRow[],
  orgId: string,
  userId: string,
) {
  updateImportTask(taskId, { status: "processing", total: rows.length });

  try {
    let imported = 0;
    let skipped = 0;

    if (entity === "projects") {
      for (const row of rows) {
        const name = (row.name || row.project_name || "").trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const techStack = splitList(row.tech_stack || row.techstack || row.technologies || "");
        await db.insert(projects).values({
          id: uuid(),
          organizationId: orgId,
          name,
          techStack,
          createdById: userId,
        });
        imported += 1;
      }
    } else if (entity === "locations") {
      for (const row of rows) {
        const name = (row.name || row.location || row.location_name || "").trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        await db.insert(officeLocations).values({
          id: uuid(),
          organizationId: orgId,
          name,
        });
        imported += 1;
      }
    } else if (entity === "roles" || entity === "openings") {
      const { byName, byId } = await loadProjectMaps(orgId);
      for (const row of rows) {
        const name = (row.name || row.role_name || "").trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const projectIds = resolveProjectIds(row, byName, byId);
        const statusRaw = (row.status || (entity === "openings" ? "open" : "")).toLowerCase();
        const status = statusRaw === "closed" ? "closed" : "open";

        await db.insert(roles).values({
          id: uuid(),
          organizationId: orgId,
          name,
          level: row.level ?? "",
          requirements: row.requirements ?? "",
          projectId: projectIds[0] ?? null,
          projectIds,
          status: entity === "openings" ? status : "open",
        });
        imported += 1;
      }
    }

    updateImportTask(taskId, {
      status: "completed",
      imported,
      skipped,
      completedAt: Date.now(),
    });
  } catch (e) {
    updateImportTask(taskId, {
      status: "failed",
      error: e instanceof Error ? e.message : "Import failed",
      completedAt: Date.now(),
    });
  }
}
