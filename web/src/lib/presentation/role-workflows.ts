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
    tagline: "Reviews pipeline health and makes final calls.",
    icon: "▦",
    tone: "orange",
    steps: [
      { label: "Review pipeline", detail: "Open roles and candidate stages" },
      { label: "Screen AI output", detail: "Proceed / Hold / Reject at screen stage" },
      { label: "Read panel reports", detail: "Structured PDF + per-round notes" },
      { label: "Compare rounds", detail: "See what was covered vs. gaps remaining" },
      { label: "Final decision", detail: "Offer, hold, or archive with audit trail" },
    ],
    outcome: "Full visibility into what each round covered — know exactly what to probe next.",
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
