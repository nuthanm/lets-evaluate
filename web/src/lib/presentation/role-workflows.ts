export type RoleWorkflowStep = {
  label: string;
  detail: string;
};

export type RoleWorkflow = {
  id: string;
  role: string;
  tagline: string;
  icon: string;
  tone: "cyan" | "green" | "orange" | "navy";
  steps: RoleWorkflowStep[];
  outcome: string;
};

export const ROLE_WORKFLOWS: RoleWorkflow[] = [
  {
    id: "recruiter",
    role: "Recruiter / TA",
    tagline: "Owns the funnel from import to panel handoff.",
    icon: "◈",
    tone: "cyan",
    steps: [
      { label: "Import candidates", detail: "CSV bulk or single resume upload" },
      { label: "Run AI screening", detail: "Project + role aligned analysis" },
      { label: "Move pipeline", detail: "Kanban stages — screen to offer" },
      { label: "Schedule & assign", detail: "Pick panel, slot, and handoff notes" },
      { label: "Track progress", detail: "See feedback status at every round" },
    ],
    outcome: "One place to screen, assign, and follow every candidate — no spreadsheet side-channels.",
  },
  {
    id: "ta_lead",
    role: "TA Lead",
    tagline: "Sees every recruiter’s pipeline for coverage and hike reviews.",
    icon: "▣",
    tone: "navy",
    steps: [
      { label: "Open scorecard", detail: "Per-recruiter volume, active, hire rate" },
      { label: "Review org funnel", detail: "Screening through offer in one view" },
      { label: "Cover PTO gaps", detail: "Read any recruiter’s candidates without editing" },
      { label: "Spot stalls", detail: "Idle recruiters and stalled openings" },
      { label: "Coach & escalate", detail: "Ask admin to hand off ownership when needed" },
    ],
    outcome: "Performance visibility without letting one recruiter overwrite another’s work.",
  },
  {
    id: "interviewer",
    role: "Interviewer",
    tagline: "Arrives prepared with shared context — no duplicate prep.",
    icon: "✦",
    tone: "green",
    steps: [
      { label: "Receive assignment", detail: "Calendar invite + candidate brief" },
      { label: "Review AI report", detail: "Same screening output TA saw" },
      { label: "Conduct interview", detail: "Structured questions from question bank" },
      { label: "Rate & note", detail: "Per-question feedback in workspace" },
      { label: "Submit decision", detail: "Proceed / Hold / Reject with rationale" },
    ],
    outcome: "No hunting for questions or prior-round feedback — everything is in the workspace.",
  },
  {
    id: "manager",
    role: "Hiring Manager",
    tagline: "Conducts manager rounds and records structured decisions.",
    icon: "▦",
    tone: "orange",
    steps: [
      { label: "Open assignment", detail: "Manager round queue for your interviews" },
      { label: "Review context", detail: "Screening + prior round feedback" },
      { label: "Conduct round", detail: "Structured manager questions" },
      { label: "Submit verdict", detail: "Yes / No with notes and report" },
      { label: "Hand back to TA", detail: "Pipeline advances for the owning recruiter" },
    ],
    outcome: "Manager interviews stay focused on assigned candidates — TA Lead owns team performance views.",
  },
  {
    id: "admin",
    role: "Admin",
    tagline: "Configures the platform and monitors operations.",
    icon: "⚙",
    tone: "navy",
    steps: [
      { label: "Setup projects", detail: "Tech stack, roles, pipeline stages" },
      { label: "Manage users", detail: "Roles, permissions, interviewer pool" },
      { label: "Question library", detail: "Structured bank by role & seniority" },
      { label: "Mail templates", detail: "Branded email assets and placeholders" },
      { label: "Audit log", detail: "Every action — who, what, when, cost" },
    ],
    outcome: "Platform stays aligned to your hiring process — not a generic template.",
  },
  {
    id: "hr",
    role: "HR",
    tagline: "Oversees compliance, templates, and offer coordination.",
    icon: "◎",
    tone: "green",
    steps: [
      { label: "Job descriptions", detail: "AI-assisted JD create, import, export" },
      { label: "Mail templates", detail: "Offer, rejection, and schedule emails" },
      { label: "Candidate timeline", detail: "Full history for compliance review" },
      { label: "Bulk operations", detail: "CSV import and background job tracking" },
      { label: "Reports & export", detail: "PDF reports and audit-ready logs" },
    ],
    outcome: "Compliance-ready records and branded communications — no manual chasing.",
  },
];
