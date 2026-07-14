import { Inngest } from "inngest";
import type { JobQueue, BulkPipelineEvent } from "@/lib/ports/job-queue";
import { stashResumePayload } from "@/lib/infrastructure/jobs/resume-payload-store";

export const inngest = new Inngest({ id: "lets-evaluate" });

export class InngestJobQueue implements JobQueue {
  async enqueueBulkItem(event: BulkPipelineEvent): Promise<void> {
    if (event.resumeBuffer) {
      stashResumePayload(event.itemId, {
        resumeBuffer: event.resumeBuffer,
        resumeFilename: event.resumeFilename,
      });
    }
    await inngest.send({
      name: "bulk/pipeline.step",
      data: {
        jobId: event.jobId,
        itemId: event.itemId,
        organizationId: event.organizationId,
      },
    });
  }

  async enqueueBulkJob(jobId: string, organizationId: string): Promise<void> {
    await inngest.send({
      name: "bulk/job.started",
      data: { jobId, organizationId },
    });
  }

  async enqueueEvaluateSession(sessionId: string): Promise<void> {
    await inngest.send({
      name: "screening/evaluate",
      data: { sessionId },
    });
  }
}
