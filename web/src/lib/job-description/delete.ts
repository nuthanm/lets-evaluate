import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { candidates, jobDescriptions, projects, roles } from "@/lib/db/schema";
import { prepareMail } from "@/lib/email";
import { buildMailVars } from "@/lib/email/vars";
import { GraphEmailSender, ManualEmailSender } from "@/lib/infrastructure/email/graph-sender";

export type JobDescriptionDeleteCandidate = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  projectName: string | null;
  roleName: string | null;
};

export type JobDescriptionDeletePreviewMail = {
  candidateId: string;
  candidateName: string;
  to: string;
  subject: string;
  body: string;
};

export type JobDescriptionDeleteImpact = {
  jobDescription: {
    id: string;
    title: string;
    location: string;
    experience: string;
    roleName: string | null;
    projectName: string | null;
  };
  candidates: JobDescriptionDeleteCandidate[];
  notificationPreview: JobDescriptionDeletePreviewMail[];
  hasLinkedProject: boolean;
};

export async function getJobDescriptionDeleteImpact(
  organizationId: string,
  jobDescriptionId: string,
): Promise<JobDescriptionDeleteImpact | null> {
  const [jobDescription] = await db
    .select({
      id: jobDescriptions.id,
      title: jobDescriptions.title,
      location: jobDescriptions.location,
      experience: jobDescriptions.experience,
      projectId: jobDescriptions.projectId,
      projectName: projects.name,
      roleName: roles.name,
    })
    .from(jobDescriptions)
    .leftJoin(projects, eq(jobDescriptions.projectId, projects.id))
    .leftJoin(roles, eq(jobDescriptions.roleId, roles.id))
    .where(
      and(
        eq(jobDescriptions.organizationId, organizationId),
        eq(jobDescriptions.id, jobDescriptionId),
      ),
    )
    .limit(1);

  if (!jobDescription) return null;

  const candidateRows = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      status: candidates.status,
      projectName: projects.name,
      roleName: roles.name,
    })
    .from(candidates)
    .leftJoin(projects, eq(candidates.projectId, projects.id))
    .leftJoin(roles, eq(candidates.roleId, roles.id))
    .where(
      and(
        eq(candidates.organizationId, organizationId),
        eq(candidates.jobDescriptionId, jobDescriptionId),
      ),
    )
    .orderBy(desc(candidates.updatedAt));

  const notificationPreview = await Promise.all(
    candidateRows
      .filter((candidate) => candidate.email?.trim())
      .slice(0, 3)
      .map(async (candidate) => {
        const mail = await prepareMail(
          organizationId,
          "candidate_job_description_deleted",
          buildMailVars({
            candidate: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              status: candidate.status,
            },
            roleName: jobDescription.roleName ?? jobDescription.title,
            projectName: candidate.projectName ?? jobDescription.projectName ?? undefined,
          }),
        );
        if (!mail) return null;
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          to: mail.to,
          subject: mail.subject,
          body: mail.body,
        } satisfies JobDescriptionDeletePreviewMail;
      }),
  );

  return {
    jobDescription: {
      id: jobDescription.id,
      title: jobDescription.title,
      location: jobDescription.location,
      experience: jobDescription.experience,
      roleName: jobDescription.roleName ?? null,
      projectName: jobDescription.projectName ?? null,
    },
    candidates: candidateRows,
    notificationPreview: notificationPreview.filter(
      (item): item is JobDescriptionDeletePreviewMail => Boolean(item),
    ),
    hasLinkedProject: Boolean(jobDescription.projectName),
  };
}

export async function sendJobDescriptionDeleteNotifications(input: {
  organizationId: string;
  impact: JobDescriptionDeleteImpact;
  actorName?: string;
}) {
  const sender = new GraphEmailSender(new ManualEmailSender());
  const results = [] as Array<{ candidateId: string; recipient: string; status: string }>;

  for (const candidate of input.impact.candidates) {
    if (!candidate.email?.trim()) continue;
    const mail = await prepareMail(
      input.organizationId,
      "candidate_job_description_deleted",
      buildMailVars({
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          status: candidate.status,
        },
        roleName: input.impact.jobDescription.roleName ?? input.impact.jobDescription.title,
        projectName: candidate.projectName ?? input.impact.jobDescription.projectName ?? undefined,
        taName: input.actorName,
      }),
    );
    if (!mail) continue;
    const sent = await sender.send({
      organizationId: input.organizationId,
      to: mail.to,
      subject: mail.subject,
      body: mail.body,
      slug: "candidate_job_description_deleted",
      candidateId: candidate.id,
    });
    results.push({
      candidateId: candidate.id,
      recipient: sent.mail.to,
      status: sent.status,
    });
  }

  return results;
}

export async function deleteJobDescriptionRecord(
  organizationId: string,
  jobDescriptionId: string,
) {
  const [deleted] = await db
    .delete(jobDescriptions)
    .where(
      and(
        eq(jobDescriptions.id, jobDescriptionId),
        eq(jobDescriptions.organizationId, organizationId),
      ),
    )
    .returning({ id: jobDescriptions.id, title: jobDescriptions.title });

  return deleted ?? null;
}
