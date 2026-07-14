export type BulkPipelineEvent = {
  jobId: string;
  itemId: string;
  organizationId: string;
  step?: string;
  resumeBuffer?: Buffer;
  resumeFilename?: string;
};

export interface JobQueue {
  enqueueBulkItem(event: BulkPipelineEvent): Promise<void>;
  enqueueBulkJob(jobId: string, organizationId: string): Promise<void>;
  enqueueEvaluateSession(sessionId: string): Promise<void>;
}
