import { prepareMail } from "@/lib/email/prepare";
import { buildMailto } from "@/lib/email/placeholders";
import type { EmailSender, SendMailInput, SendMailResult } from "@/lib/ports/email-sender";
import { getOrgEmailConfig, createEmailDelivery } from "@/lib/db/repositories/bulk-job-repository";
import { v4 as uuid } from "uuid";
import { getBrand } from "@/lib/brand";

/** Returns prepared mail for recruiter manual send (default). */
export class ManualEmailSender implements EmailSender {
  async send(input: SendMailInput): Promise<SendMailResult> {
    const brand = getBrand();
    const mail = {
      slug: input.slug,
      to: input.to,
      subject: input.subject,
      body: input.body,
      bodyHtml: "",
      attachments: [],
      mailto: buildMailto(input.to, input.subject, input.body),
    };

    await createEmailDelivery({
      id: uuid(),
      organizationId: input.organizationId,
      candidateId: input.candidateId,
      bulkJobItemId: input.bulkJobItemId,
      slug: input.slug,
      recipient: input.to,
      subject: input.subject,
      body: input.body,
      status: "prepared",
      provider: "manual",
    });

    return { status: "prepared", provider: "manual", mail };
  }
}

/**
 * Microsoft Graph sender — implemented but disabled unless org enables it.
 * Requires AZURE_AD_* env vars and org_email_config.graph_enabled = true.
 */
export class GraphEmailSender implements EmailSender {
  constructor(private fallback: EmailSender = new ManualEmailSender()) {}

  async send(input: SendMailInput): Promise<SendMailResult> {
    const config = await getOrgEmailConfig(input.organizationId);
    const graphEnabled =
      config?.graphEnabled &&
      config?.configured &&
      process.env.EMAIL_GRAPH_ENABLED === "true";

    if (!graphEnabled) {
      return this.fallback.send(input);
    }

    try {
      const token = await this.getAccessToken(config!);
      // sendMail returns 202 with an empty body and no message id.
      // Create a draft first to obtain an id, then send that draft.
      const createRes = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: input.subject,
          body: { contentType: "Text", content: input.body },
          toRecipients: [{ emailAddress: { address: input.to } }],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        const fallback = await this.fallback.send(input);
        return { ...fallback, error: `Graph create failed: ${err}` };
      }

      const created = (await createRes.json()) as { id?: string };
      const graphMessageId = created.id;
      if (!graphMessageId) {
        const fallback = await this.fallback.send(input);
        return { ...fallback, error: "Graph create returned no message id" };
      }

      const sendRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(graphMessageId)}/send`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!sendRes.ok) {
        const err = await sendRes.text();
        const fallback = await this.fallback.send(input);
        return { ...fallback, error: `Graph send failed: ${err}` };
      }

      const mail = {
        slug: input.slug,
        to: input.to,
        subject: input.subject,
        body: input.body,
        bodyHtml: "",
        attachments: [],
        mailto: buildMailto(input.to, input.subject, input.body),
      };

      const deliveryId = uuid();
      await createEmailDelivery({
        id: deliveryId,
        organizationId: input.organizationId,
        candidateId: input.candidateId,
        bulkJobItemId: input.bulkJobItemId,
        slug: input.slug,
        recipient: input.to,
        subject: input.subject,
        body: input.body,
        status: "sent",
        provider: "graph",
        graphMessageId,
      });

      return { status: "sent", provider: "graph", mail, graphMessageId };
    } catch (e) {
      const fallback = await this.fallback.send(input);
      return {
        ...fallback,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async getAccessToken(config: {
    tenantId: string | null;
    clientId: string | null;
    clientSecret: string | null;
  }): Promise<string> {
    const tenantId = config.tenantId || process.env.AZURE_AD_TENANT_ID;
    const clientId = config.clientId || process.env.AZURE_AD_CLIENT_ID;
    const clientSecret =
      config.clientSecret || process.env.AZURE_AD_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Graph credentials not configured");
    }

    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      },
    );
    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) {
      throw new Error(data.error ?? "Failed to obtain Graph token");
    }
    return data.access_token;
  }
}

export async function sendScreeningInvite(input: {
  organizationId: string;
  candidateId: string;
  bulkJobItemId?: string;
  candidateName: string;
  candidateEmail: string;
  roleName: string;
  projectName: string;
  screeningLink: string;
  taName?: string;
}): Promise<SendMailResult> {
  const vars = {
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    roleName: input.roleName,
    projectName: input.projectName,
    orgName: getBrand().orgName,
    taName: input.taName,
    screeningLink: input.screeningLink,
    caseUrl: input.screeningLink,
  };

  const rendered = await prepareMail(
    input.organizationId,
    "ai_screening_invite",
    {
      candidateName: vars.candidateName,
      candidateEmail: vars.candidateEmail,
      roleName: vars.roleName,
      projectName: vars.projectName,
      orgName: vars.orgName,
      taName: vars.taName,
      caseUrl: vars.screeningLink,
    },
  );

  if (!rendered) {
    throw new Error("ai_screening_invite template not found");
  }

  const sender = new GraphEmailSender(new ManualEmailSender());
  return sender.send({
    organizationId: input.organizationId,
    to: input.candidateEmail,
    subject: rendered.subject,
    body: rendered.body,
    slug: "ai_screening_invite",
    candidateId: input.candidateId,
    bulkJobItemId: input.bulkJobItemId,
  });
}
