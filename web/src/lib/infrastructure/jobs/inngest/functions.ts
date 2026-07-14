import { inngest } from "@/lib/infrastructure/jobs/inngest/queue";
import {
  processPipelineStep,
  evaluateAiInterviewSession,
} from "@/lib/application/bulk/process-pipeline-step";
import { takeResumePayload } from "@/lib/infrastructure/jobs/resume-payload-store";

export const bulkPipelineStep = inngest.createFunction(
  {
    id: "bulk-pipeline-step",
    retries: 3,
    triggers: [{ event: "bulk/pipeline.step" }],
  },
  async ({ event, step }) => {
    const { itemId, organizationId } = event.data as {
      jobId: string;
      itemId: string;
      organizationId: string;
    };

    await step.run("process-step", async () => {
      const payload = takeResumePayload(itemId);
      await processPipelineStep({
        itemId,
        organizationId,
        createdById: "",
        resumeBuffer: payload.resumeBuffer,
        resumeFilename: payload.resumeFilename,
      });
    });
  },
);

export const screeningEvaluate = inngest.createFunction(
  {
    id: "screening-evaluate",
    retries: 3,
    triggers: [{ event: "screening/evaluate" }],
  },
  async ({ event, step }) => {
    const { sessionId } = event.data as { sessionId: string };
    await step.run("evaluate", async () => {
      await evaluateAiInterviewSession(sessionId);
    });
  },
);

export const inngestFunctions = [bulkPipelineStep, screeningEvaluate];
