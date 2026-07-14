import type { JobQueue, BulkPipelineEvent } from "@/lib/ports/job-queue";
import { processPipelineStep, evaluateAiInterviewSession } from "@/lib/application/bulk/process-pipeline-step";
import { getBulkJobItems } from "@/lib/db/repositories/bulk-job-repository";
import { stashResumePayload, takeResumePayload } from "@/lib/infrastructure/jobs/resume-payload-store";

/** In-process async runner — used when Inngest cloud is not configured. */
class LocalJobQueue implements JobQueue {
  async enqueueBulkItem(event: BulkPipelineEvent): Promise<void> {
    if (event.resumeBuffer) {
      stashResumePayload(event.itemId, {
        resumeBuffer: event.resumeBuffer,
        resumeFilename: event.resumeFilename,
      });
    }
    setTimeout(() => {
      void this.runItem(event).catch((e) =>
        console.error("[bulk-pipeline] item failed", event.itemId, e),
      );
    }, 10);
  }

  async enqueueBulkJob(_jobId: string, _organizationId: string): Promise<void> {
    // Items are enqueued individually
  }

  async enqueueEvaluateSession(sessionId: string): Promise<void> {
    setTimeout(() => {
      void evaluateAiInterviewSession(sessionId).catch((e) =>
        console.error("[bulk-pipeline] evaluate failed", sessionId, e),
      );
    }, 10);
  }

  private async runItem(event: BulkPipelineEvent) {
    const payload = takeResumePayload(event.itemId);
    await processPipelineStep({
      itemId: event.itemId,
      organizationId: event.organizationId,
      createdById: "",
      resumeBuffer: payload.resumeBuffer,
      resumeFilename: payload.resumeFilename,
    });
  }
}

let queue: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queue) {
    if (process.env.INNGEST_EVENT_KEY) {
      // Lazy import avoids loading Inngest when using local queue
      const { InngestJobQueue } = require("@/lib/infrastructure/jobs/inngest/queue") as {
        InngestJobQueue: new () => JobQueue;
      };
      queue = new InngestJobQueue();
    } else {
      queue = new LocalJobQueue();
    }
  }
  return queue;
}

export async function retryFailedItems(jobId: string, organizationId: string) {
  const items = await getBulkJobItems(jobId);
  const q = getJobQueue();
  for (const item of items) {
    if (item.status === "failed" || item.status === "retry_pending") {
      await q.enqueueBulkItem({
        jobId,
        itemId: item.id,
        organizationId,
      });
    }
  }
}

export { takeResumePayload };
