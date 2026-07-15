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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(text: string) {
  return text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;line-height:1.7;color:#22313a;font-size:14px;white-space:pre-wrap;">${escapeHtml(block).replaceAll("\n", "<br />")}</p>`,
    )
    .join("");
}

export function renderStructuredMail(input: {
  header?: string;
  body: string;
  footer?: string;
  tagline?: string;
  attachments?: string[];
  vars: MailVars;
}) {
  const header = renderTemplateText(input.header ?? "", input.vars).trim();
  const body = renderTemplateText(input.body, input.vars).trim();
  const footer = renderTemplateText(input.footer ?? "", input.vars).trim();
  const tagline = renderTemplateText(input.tagline ?? "", input.vars).trim();
  const attachments = (input.attachments ?? [])
    .map((item) => renderTemplateText(item, input.vars).trim())
    .filter(Boolean);

  const plainTextParts = [header, body];
  if (tagline) plainTextParts.push(`Tagline: ${tagline}`);
  if (attachments.length) {
    plainTextParts.push(
      ["Attachments / links:", ...attachments.map((item) => `- ${item}`)].join("\n"),
    );
  }
  if (footer) plainTextParts.push(footer);

  const attachmentsHtml = attachments.length
    ? `<div style="padding:0 24px 20px;"><div style="margin:0 0 10px;color:#52636b;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Attachments / links</div><ul style="margin:0;padding-left:18px;color:#22313a;font-size:14px;line-height:1.6;">${attachments
        .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
        .join("")}</ul></div>`
    : "";

  const html = [
    '<div style="background:#f4efe4;padding:24px;font-family:Segoe UI,Arial,sans-serif;">',
    '<div style="margin:0 auto;max-width:680px;overflow:hidden;border:1px solid #e5d9bf;border-radius:22px;background:#ffffff;box-shadow:0 18px 40px rgba(34,49,58,0.08);">',
    header
      ? `<div style="background:linear-gradient(135deg,#12343b,#1f5a63);padding:24px 28px;color:#ffffff;"><div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.72;margin:0 0 8px;">Configured header</div><div style="font-size:24px;font-weight:700;line-height:1.35;white-space:pre-wrap;">${escapeHtml(header).replaceAll("\n", "<br />")}</div></div>`
      : "",
    `<div style="padding:28px 28px 12px;">${textToHtml(body)}</div>`,
    tagline
      ? `<div style="padding:0 28px 20px;color:#45626a;font-size:13px;font-style:italic;line-height:1.6;">${escapeHtml(tagline).replaceAll("\n", "<br />")}</div>`
      : "",
    attachmentsHtml,
    footer
      ? `<div style="border-top:1px solid #efe5cf;background:#fbf8f1;padding:22px 28px;">${textToHtml(footer)}</div>`
      : "",
    "</div>",
    "</div>",
  ].join("");

  return {
    header,
    body,
    footer,
    tagline,
    attachments,
    plainText: plainTextParts.filter(Boolean).join("\n\n"),
    html,
  };
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
  bodyHtml: string;
  attachments: string[];
  mailto: string;
};
