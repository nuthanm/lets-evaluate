import type { RenderedMail } from "@/lib/email/placeholders";

export type SendMailInput = {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
  slug: string;
  candidateId?: string;
  bulkJobItemId?: string;
};

export type SendMailResult = {
  status: "prepared" | "sent" | "failed";
  provider: "none" | "graph" | "manual";
  mail: RenderedMail;
  graphMessageId?: string;
  error?: string;
};

export interface EmailSender {
  send(input: SendMailInput): Promise<SendMailResult>;
}
