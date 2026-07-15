/** Built-in mail template slugs — stored per org and editable by admins. */
export type MailTemplateSlug =
  | "candidate_proceed"
  | "candidate_hold"
  | "candidate_reject"
  | "candidate_clarification"
  | "candidate_scheduled"
  | "candidate_technical_round"
  | "candidate_manager_round"
  | "candidate_hr_round"
  | "candidate_selected"
  | "candidate_final_reject"
  | "candidate_deleted_pre_analysis"
  | "candidate_deleted_post_analysis"
  | "candidate_deleted_post_interview"
  | "interviewer_assigned"
  | "interviewer_technical_assigned"
  | "interviewer_manager_assigned"
  | "interviewer_hr_assigned"
  | "interviewer_sla_reminder";

export type DefaultMailTemplate = {
  slug: MailTemplateSlug;
  name: string;
  audience: "candidate" | "interviewer" | "internal";
  description: string;
  header: string;
  subject: string;
  body: string;
  footer: string;
  tagline: string;
  attachments: string[];
};

export const MAIL_PLACEHOLDERS = [
  "{{candidate_name}}",
  "{{candidate_email}}",
  "{{candidate_phone}}",
  "{{candidate_source}}",
  "{{role}}",
  "{{project}}",
  "{{org_name}}",
  "{{ta_name}}",
  "{{interview_date}}",
  "{{interview_stage}}",
  "{{interviewer_name}}",
  "{{interviewer_email}}",
  "{{handoff_note}}",
  "{{screening_comments}}",
  "{{tech_match_score}}",
  "{{case_url}}",
] as const;

const DEFAULT_CANDIDATE_HEADER = `{{org_name}}\nHiring update for {{role}}`;
const DEFAULT_CANDIDATE_FOOTER = `Regards,\n{{org_name}} Talent Team`;
const DEFAULT_CANDIDATE_TAGLINE =
  "This message was prepared from your configured recruiting workflow.";

const DEFAULT_INTERVIEWER_HEADER = `{{org_name}}\nInterview panel coordination`;
const DEFAULT_INTERVIEWER_FOOTER = `Thanks,\n{{org_name}} Hiring Operations`;
const DEFAULT_INTERVIEWER_TAGLINE =
  "Please use the candidate workspace link below to keep progress visible to the team.";

function makeTemplate(
  input: Omit<DefaultMailTemplate, "header" | "footer" | "tagline" | "attachments"> & {
    header?: string;
    footer?: string;
    tagline?: string;
    attachments?: string[];
  },
): DefaultMailTemplate {
  const isCandidate = input.audience === "candidate";
  return {
    ...input,
    header: input.header ?? (isCandidate ? DEFAULT_CANDIDATE_HEADER : DEFAULT_INTERVIEWER_HEADER),
    footer: input.footer ?? (isCandidate ? DEFAULT_CANDIDATE_FOOTER : DEFAULT_INTERVIEWER_FOOTER),
    tagline: input.tagline ?? (isCandidate ? DEFAULT_CANDIDATE_TAGLINE : DEFAULT_INTERVIEWER_TAGLINE),
    attachments: input.attachments ?? [],
  };
}

export const DEFAULT_MAIL_TEMPLATES: DefaultMailTemplate[] = [
  makeTemplate({
    slug: "candidate_proceed",
    name: "Screening — proceed",
    audience: "candidate",
    description: "Sent after TA marks a candidate ready for interviews.",
    subject: "Next steps — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for your interest in the {{role}} role on the {{project}} project.

Your profile has passed our initial screening. We will be in touch shortly to schedule your technical interview.

Best regards,
{{org_name}} Talent Team`,
  }),
  makeTemplate({
    slug: "candidate_hold",
    name: "Screening — on hold",
    audience: "candidate",
    description: "Sent when TA pauses a candidate during screening.",
    subject: "Update on your application — {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for applying for the {{role}} role. We are reviewing your profile and will update you once we have a decision.

Best regards,
{{org_name}} Talent Team`,
    tagline:
      "This hold template can include review cadence, expected response time, or a TA callback note.",
  }),
  makeTemplate({
    slug: "candidate_reject",
    name: "Screening — reject",
    audience: "candidate",
    description: "Sent when TA rejects a candidate after screening.",
    subject: "Update on your application — {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for your interest in the {{role}} role at {{org_name}}. After careful review, we will not be moving forward with your application at this time.

We appreciate your time and wish you the best in your search.

Best regards,
{{org_name}} Talent Team`,
  }),
  makeTemplate({
    slug: "candidate_clarification",
    name: "Screening — clarification",
    audience: "candidate",
    description: "Request additional details before proceeding.",
    subject: "Quick follow-up — {{role}} application",
    body: `Hi {{candidate_name}},

Thank you for sharing your profile for the {{role}} role. Before we proceed, we'd like a bit more context on your experience.

{{screening_comments}}

A short note on project context, your responsibilities, and production usage would help us evaluate accurately.

Thank you,
{{ta_name}}
{{org_name}}`,
    tagline:
      "Use this template when AI or TA screening needs supporting details before moving the profile forward.",
  }),
  makeTemplate({
    slug: "candidate_scheduled",
    name: "Interview scheduled — generic",
    audience: "candidate",
    description: "Fallback candidate scheduling mail used when a stage does not have a dedicated round template.",
    subject: "Interview scheduled — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Your {{interview_stage}} for the {{role}} role ({{project}}) is scheduled for {{interview_date}}.

We look forward to speaking with you. If you need to reschedule, please reply to this email.

Best regards,
{{org_name}} Talent Team`,
    attachments: ["Meeting link or calendar invite details", "Candidate preparation notes"],
  }),
  makeTemplate({
    slug: "candidate_technical_round",
    name: "Technical round — candidate timeline",
    audience: "candidate",
    description: "Sent to the candidate when a technical round is booked.",
    subject: "Technical interview scheduled — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Your {{interview_stage}} for the {{role}} role on {{project}} is scheduled for {{interview_date}}.

During this round, our team will focus on hands-on technical depth, delivery examples, and problem-solving approach.

If anything changes on your side, please reply so we can adjust the timeline.`,
    tagline:
      "Include preparation points, coding environment notes, or timeline expectations here.",
    attachments: ["Technical interview link", "Coding instructions or portfolio note"],
  }),
  makeTemplate({
    slug: "candidate_manager_round",
    name: "Manager round — candidate timeline",
    audience: "candidate",
    description: "Sent to the candidate when a manager round is booked.",
    subject: "Manager discussion scheduled — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Your {{interview_stage}} discussion for the {{role}} role is scheduled for {{interview_date}}.

This round typically focuses on ownership, communication, delivery expectations, and team alignment.

We will keep you updated on the next milestone after this discussion.`,
    tagline:
      "Use this area for hiring timeline commitments or role-level expectations.",
    attachments: ["Meeting link", "Role charter or team context"],
  }),
  makeTemplate({
    slug: "candidate_hr_round",
    name: "HR round — candidate timeline",
    audience: "candidate",
    description: "Sent to the candidate when an HR round is booked.",
    subject: "HR discussion scheduled — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Your {{interview_stage}} for the {{role}} role is scheduled for {{interview_date}}.

This conversation usually covers notice period, location, compensation fit, and joining considerations.

We will share the next update after the discussion is complete.`,
    tagline:
      "Use this section for compensation, location, or document-readiness guidance.",
    attachments: ["Meeting link", "Any forms or policy documents to review"],
  }),
  makeTemplate({
    slug: "candidate_selected",
    name: "Final confirmation — selected",
    audience: "candidate",
    description: "Sent when the candidate is selected after all rounds.",
    subject: "Congratulations — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

We are pleased to inform you that you have been selected for the {{role}} role on the {{project}} project.

Our team will reach out with next steps shortly.

Congratulations,
{{org_name}} Talent Team`,
    tagline:
      "Use this final confirmation template for offer communication, documentation instructions, or joining checkpoints.",
    attachments: ["Offer or confirmation checklist", "Document submission instructions"],
  }),
  makeTemplate({
    slug: "candidate_final_reject",
    name: "Interview performance — reject",
    audience: "candidate",
    description: "Sent when the candidate is rejected after interviews.",
    subject: "Update on your application — {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for taking the time to interview for the {{role}} role. After careful consideration, we will not be moving forward with your application.

We appreciate your interest in {{org_name}} and wish you success in your search.

Best regards,
{{org_name}} Talent Team`,
    tagline:
      "Use this post-interview outcome template when the final performance decision is to not proceed.",
  }),
  makeTemplate({
    slug: "candidate_deleted_pre_analysis",
    name: "Deletion — pre-analysis",
    audience: "candidate",
    description: "Sent when a candidate is removed before any AI or recruiter analysis.",
    subject: "Your application record has been removed — {{org_name}}",
    body: `Hi {{candidate_name}},

Your application record for the {{role}} role has been removed from our active system.

Important: no further profile, screening, or interview information is associated with this application.

If you believe this was done in error, please reply to this message.

Regards,
{{org_name}} Talent Team`,
  }),
  makeTemplate({
    slug: "candidate_deleted_post_analysis",
    name: "Deletion — after screening",
    audience: "candidate",
    description: "Sent when a screened candidate is removed after an AI or recruiter decision.",
    subject: "Update to your application record — {{org_name}}",
    body: `Hi {{candidate_name}},

We have removed your application record for the {{role}} role from our active system.

Important: the profile, screening notes, and interview records are no longer retained in the working application view.

If you would like a clarification, please reply to this email.

Regards,
{{org_name}} Talent Team`,
  }),
  makeTemplate({
    slug: "candidate_deleted_post_interview",
    name: "Deletion — after interview rounds",
    audience: "candidate",
    description: "Sent when a later-stage candidate is removed after interview rounds have begun.",
    subject: "Application record closed — {{org_name}}",
    body: `Hi {{candidate_name}},

We have closed and removed your application record for the {{role}} role.

Important: the application trail, interview notes, and attached details are no longer available in our active records.

Thank you for your time,
{{org_name}} Talent Team`,
  }),
  makeTemplate({
    slug: "interviewer_assigned",
    name: "Interviewer — new assignment (generic)",
    audience: "interviewer",
    description: "Fallback interviewer assignment mail used when a stage does not have a dedicated round template.",
    subject: "Interview assigned: {{candidate_name}} — {{interview_stage}}",
    body: `Hi {{interviewer_name}},

You have been assigned to interview {{candidate_name}} for the {{role}} role ({{project}}).

Stage: {{interview_stage}}
Scheduled: {{interview_date}}

Handoff from TA:
{{handoff_note}}

Review the screening report and prepare questions in Let's Evaluate:
{{case_url}}

— {{org_name}}`,
    attachments: ["Candidate workspace link", "Round-specific scorecard or notes"],
  }),
  makeTemplate({
    slug: "interviewer_technical_assigned",
    name: "Technical round — interviewer assignment",
    audience: "interviewer",
    description: "Sent to the interviewer when a technical round is booked.",
    subject: "Technical interview assigned: {{candidate_name}} — {{interview_stage}}",
    body: `Hi {{interviewer_name}},

You have been assigned to a technical round for {{candidate_name}} for the {{role}} role on {{project}}.

Stage: {{interview_stage}}
Scheduled: {{interview_date}}

Handoff from TA:
{{handoff_note}}

Please review the candidate workspace and be prepared to submit evaluation feedback after the discussion:
{{case_url}}`,
    attachments: ["Candidate workspace link", "Technical assessment rubric"],
  }),
  makeTemplate({
    slug: "interviewer_manager_assigned",
    name: "Manager round — interviewer assignment",
    audience: "interviewer",
    description: "Sent when a manager round is booked.",
    subject: "Manager round assigned: {{candidate_name}} — {{interview_stage}}",
    body: `Hi {{interviewer_name}},

You have been assigned to the manager discussion for {{candidate_name}} for the {{role}} role on {{project}}.

Stage: {{interview_stage}}
Scheduled: {{interview_date}}

Handoff from TA:
{{handoff_note}}

Please review the case context and submit your decision promptly after the interview:
{{case_url}}`,
    attachments: ["Candidate workspace link", "Manager evaluation prompts"],
  }),
  makeTemplate({
    slug: "interviewer_hr_assigned",
    name: "HR round — interviewer assignment",
    audience: "interviewer",
    description: "Sent when an HR round is booked.",
    subject: "HR discussion assigned: {{candidate_name}} — {{interview_stage}}",
    body: `Hi {{interviewer_name}},

You have been assigned to the HR discussion for {{candidate_name}} for the {{role}} role on {{project}}.

Stage: {{interview_stage}}
Scheduled: {{interview_date}}

Handoff from TA:
{{handoff_note}}

Please update the candidate record with compensation, joining, and policy-fit notes after the discussion:
{{case_url}}`,
    attachments: ["Candidate workspace link", "HR discussion checklist"],
  }),
  makeTemplate({
    slug: "interviewer_sla_reminder",
    name: "Interviewer — SLA reminder",
    audience: "internal",
    description: "Reminder when a panel round is overdue.",
    subject: "Reminder: {{candidate_name}} — {{interview_stage}} overdue",
    body: `Hi {{interviewer_name}},

The {{interview_stage}} for {{candidate_name}} ({{role}}) was scheduled for {{interview_date}} and is awaiting your evaluation.

Please complete the interview workspace and submit your report:
{{case_url}}

— {{org_name}}`,
  }),
];

export const MAIL_SLUG_FOR_DECISION: Record<
  "proceed" | "hold" | "reject",
  MailTemplateSlug
> = {
  proceed: "candidate_proceed",
  hold: "candidate_hold",
  reject: "candidate_reject",
};
