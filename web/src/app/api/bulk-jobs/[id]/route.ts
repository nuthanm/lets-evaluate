import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import {
  getBulkJob,
  getBulkJobItem,
  getBulkJobItems,
  getOrgEmailConfig,
  updateBulkJobItem,
} from "@/lib/db/repositories/bulk-job-repository";
import { retryFailedItems } from "@/lib/infrastructure/jobs/job-queue-factory";
import { db } from "@/lib/db";
import { emailDeliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const job = await getBulkJob(session.user.organizationId, id);
  if (!job) return apiError("Not found", 404);

  const items = await getBulkJobItems(id);
  const emailConfig = await getOrgEmailConfig(session.user.organizationId);

  return NextResponse.json({
    job,
    items,
    emailConfigured: emailConfig?.configured ?? false,
    graphEnabled: emailConfig?.graphEnabled ?? false,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const job = await getBulkJob(session.user.organizationId, id);
  if (!job) return apiError("Not found", 404);

  const body = (await req.json()) as { action: string; itemId?: string };

  if (body.action === "retry_failed") {
    await retryFailedItems(id, session.user.organizationId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_email_sent" && body.itemId) {
    const item = await getBulkJobItem(body.itemId);
    if (!item || item.jobId !== id) {
      return apiError("Item not found for this job", 404);
    }

    await updateBulkJobItem(body.itemId, {
      currentStep: "awaiting_interview",
      status: "running",
    });

    const [delivery] = await db
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.bulkJobItemId, body.itemId))
      .limit(1);
    if (delivery) {
      await db
        .update(emailDeliveries)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailDeliveries.id, delivery.id));
    }

    return NextResponse.json({ ok: true });
  }

  return apiError("Unknown action", 400);
}
