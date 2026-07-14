import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureCandidateStages } from "@/lib/db/queries";
import {
  createBulkJob,
  createBulkJobItem,
} from "@/lib/db/repositories/bulk-job-repository";
import { parseCsvRows, type CsvRow } from "@/lib/application/bulk/csv-parser";
import { getJobQueue } from "@/lib/infrastructure/jobs/job-queue-factory";

export type BulkImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  consent?: string;
  resume_filename?: string;
  resumeFilename?: string;
  resumeBuffer?: Buffer;
};

export type StartBulkJobInput = {
  organizationId: string;
  projectId: string;
  roleId: string;
  createdById: string;
  rows: BulkImportRow[];
};

export type StartBulkJobResult = {
  jobId: string;
  itemIds: string[];
  skipped: { row: number; reason: string }[];
};

export async function startBulkJob(input: StartBulkJobInput): Promise<StartBulkJobResult> {
  const jobId = uuid();
  const itemIds: string[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const validRows: BulkImportRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    const name = row.name?.trim();
    if (!name) {
      skipped.push({ row: i + 1, reason: "Missing name" });
      continue;
    }
    const email = (row.email ?? "").trim().toLowerCase();
    if (email) {
      const key = `${email}:${input.roleId}`;
      if (seenEmails.has(key)) {
        skipped.push({ row: i + 1, reason: `Duplicate email: ${email}` });
        continue;
      }
      seenEmails.add(key);

      const [dup] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.email, email))
        .limit(1);
      if (dup) {
        skipped.push({ row: i + 1, reason: `Candidate already exists: ${email}` });
        continue;
      }
    }
    validRows.push(row);
  }

  await createBulkJob({
    id: jobId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    roleId: input.roleId,
    createdById: input.createdById,
    totalCount: validRows.length,
  });

  const queue = getJobQueue();

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const candidateId = uuid();
    const itemId = uuid();

    await db.insert(candidates).values({
      id: candidateId,
      organizationId: input.organizationId,
      name: row.name!.trim(),
      email: (row.email ?? "").trim(),
      phone: (row.phone ?? "").trim(),
      source: row.source?.trim() || "bulk_import",
      projectId: input.projectId,
      roleId: input.roleId,
      status: "draft",
      createdById: input.createdById,
      consentAt: row.consent === "yes" ? new Date() : null,
    });

    await ensureCandidateStages(input.organizationId, candidateId, input.projectId);

    await createBulkJobItem({
      id: itemId,
      jobId,
      organizationId: input.organizationId,
      rowIndex: i,
      candidateName: row.name!.trim(),
      candidateEmail: (row.email ?? "").trim(),
      resumeFilename: row.resume_filename ?? row.resumeFilename ?? "",
      candidateId,
    });

    itemIds.push(itemId);

    await queue.enqueueBulkItem({
      jobId,
      itemId,
      organizationId: input.organizationId,
      resumeBuffer: row.resumeBuffer,
      resumeFilename: row.resumeFilename ?? row.resume_filename,
    });
  }

  await queue.enqueueBulkJob(jobId, input.organizationId);

  return { jobId, itemIds, skipped };
}

export function parseBulkCsv(text: string): CsvRow[] {
  return parseCsvRows(text);
}
