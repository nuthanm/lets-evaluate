import { getBrand } from "@/lib/brand";
import type { MailVars } from "./placeholders";

export function appBaseUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function caseFileUrl(candidateId: string) {
  return `${appBaseUrl()}/evaluate/${candidateId}`;
}

export function buildMailVars(input: {
  candidate?: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    id?: string;
  };
  roleName?: string;
  projectName?: string;
  taName?: string;
  interviewDate?: string;
  interviewStage?: string;
  interviewer?: { name?: string; email?: string };
  handoffNote?: string;
  screeningComments?: string;
  techMatchScore?: string | number;
}): MailVars {
  const brand = getBrand();
  return {
    candidateName: input.candidate?.name,
    candidateEmail: input.candidate?.email ?? undefined,
    candidatePhone: input.candidate?.phone ?? undefined,
    candidateSource: input.candidate?.source ?? undefined,
    roleName: input.roleName,
    projectName: input.projectName,
    orgName: brand.orgName,
    taName: input.taName,
    interviewDate: input.interviewDate,
    interviewStage: input.interviewStage,
    interviewerName: input.interviewer?.name,
    interviewerEmail: input.interviewer?.email,
    handoffNote: input.handoffNote,
    screeningComments: input.screeningComments,
    techMatchScore: input.techMatchScore,
    caseUrl: input.candidate?.id ? caseFileUrl(input.candidate.id) : undefined,
  };
}
