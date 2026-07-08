export type MailVars = {
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateSource?: string;
  roleName?: string;
  projectName?: string;
  orgName?: string;
  taName?: string;
  interviewDate?: string;
  interviewStage?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  handoffNote?: string;
  screeningComments?: string;
  techMatchScore?: string | number;
  caseUrl?: string;
};

const PLACEHOLDER_MAP: Record<string, (v: MailVars) => string> = {
  "{{candidate_name}}": (v) => v.candidateName ?? "",
  "{{candidate_email}}": (v) => v.candidateEmail ?? "",
  "{{candidate_phone}}": (v) => v.candidatePhone ?? "",
  "{{candidate_source}}": (v) => v.candidateSource ?? "",
  "{{role}}": (v) => v.roleName ?? "",
  "{{project}}": (v) => v.projectName ?? "",
  "{{org_name}}": (v) => v.orgName ?? "",
  "{{ta_name}}": (v) => v.taName ?? "",
  "{{interview_date}}": (v) => v.interviewDate ?? "TBD",
  "{{interview_stage}}": (v) => v.interviewStage ?? "",
  "{{interviewer_name}}": (v) => v.interviewerName ?? "",
  "{{interviewer_email}}": (v) => v.interviewerEmail ?? "",
  "{{handoff_note}}": (v) => v.handoffNote ?? "",
  "{{screening_comments}}": (v) => v.screeningComments ?? "",
  "{{tech_match_score}}": (v) =>
    v.techMatchScore !== undefined ? String(v.techMatchScore) : "",
  "{{case_url}}": (v) => v.caseUrl ?? "",
};

export function renderTemplateText(template: string, vars: MailVars) {
  let out = template;
  for (const [key, fn] of Object.entries(PLACEHOLDER_MAP)) {
    out = out.replaceAll(key, fn(vars));
  }
  return out;
}

export function buildMailto(to: string, subject: string, body: string) {
  if (!to.trim()) return "";
  // The address must stay raw in a mailto: URI — percent-encoding the "@"
  // breaks several desktop clients (notably on Windows). Only the query
  // parameters are encoded, and we use %20 (not "+") for spaces so the body
  // renders correctly in every client.
  const enc = (s: string) => encodeURIComponent(s).replace(/%0A/g, "%0D%0A");
  const parts: string[] = [];
  if (subject) parts.push(`subject=${enc(subject)}`);
  if (body) parts.push(`body=${enc(body)}`);
  const qs = parts.join("&");
  return `mailto:${to.trim()}${qs ? `?${qs}` : ""}`;
}

export type RenderedMail = {
  slug: string;
  to: string;
  subject: string;
  body: string;
  mailto: string;
};
