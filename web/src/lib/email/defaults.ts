/** Built-in mail template slugs — stored per org and editable by admins. */
export type MailTemplateSlug =
  | "candidate_proceed"
  | "candidate_hold"
  | "candidate_reject"
  | "candidate_scheduled"
  | "candidate_selected"
  | "candidate_final_reject"
  | "candidate_clarification"
  | "interviewer_assigned"
  | "interviewer_sla_reminder";

export type DefaultMailTemplate = {
  slug: MailTemplateSlug;
  name: string;
  audience: "candidate" | "interviewer" | "internal";
  description: string;
  subject: string;
  body: string;
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

export const DEFAULT_MAIL_TEMPLATES: DefaultMailTemplate[] = [
  {
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
  },
  {
    slug: "candidate_hold",
    name: "Screening — on hold",
    audience: "candidate",
    description: "Sent when TA pauses a candidate during screening.",
    subject: "Update on your application — {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for applying for the {{role}} role. We are reviewing your profile and will update you once we have a decision.

Best regards,
{{org_name}} Talent Team`,
  },
  {
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
  },
  {
    slug: "candidate_scheduled",
    name: "Interview scheduled",
    audience: "candidate",
    description: "Sent when an interview slot is booked.",
    subject: "Interview scheduled — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

Your {{interview_stage}} for the {{role}} role ({{project}}) is scheduled for {{interview_date}}.

We look forward to speaking with you. If you need to reschedule, please reply to this email.

Best regards,
{{org_name}} Talent Team`,
  },
  {
    slug: "candidate_selected",
    name: "Final — selected",
    audience: "candidate",
    description: "Sent when the candidate is selected after all rounds.",
    subject: "Congratulations — {{role}} at {{org_name}}",
    body: `Hi {{candidate_name}},

We are pleased to inform you that you have been selected for the {{role}} role on the {{project}} project.

Our team will reach out with next steps shortly.

Congratulations,
{{org_name}} Talent Team`,
  },
  {
    slug: "candidate_final_reject",
    name: "Final — not selected",
    audience: "candidate",
    description: "Sent when the candidate is rejected after interviews.",
    subject: "Update on your application — {{org_name}}",
    body: `Hi {{candidate_name}},

Thank you for taking the time to interview for the {{role}} role. After careful consideration, we will not be moving forward with your application.

We appreciate your interest in {{org_name}} and wish you success in your search.

Best regards,
{{org_name}} Talent Team`,
  },
  {
    slug: "candidate_clarification",
    name: "Pre-screen clarification",
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
  },
  {
    slug: "interviewer_assigned",
    name: "Interviewer — new assignment",
    audience: "interviewer",
    description: "Sent to the panel member when a round is booked.",
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
  },
  {
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
  },
];

export const MAIL_SLUG_FOR_DECISION: Record<
  "proceed" | "hold" | "reject",
  MailTemplateSlug
> = {
  proceed: "candidate_proceed",
  hold: "candidate_hold",
  reject: "candidate_reject",
};
