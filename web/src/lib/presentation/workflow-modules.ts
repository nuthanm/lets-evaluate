export type WorkflowStep = {
  label: string;
  detail: string;
};

export type WorkflowModule = {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  tone: "cyan" | "green" | "orange" | "navy";
  steps: WorkflowStep[];
  outcome: string;
};

export const WORKFLOW_MODULES: WorkflowModule[] = [
  {
    id: "configure",
    title: "Configure",
    tagline: "Set up projects, roles, and interview process before a single resume arrives.",
    icon: "⚙",
    tone: "navy",
    steps: [
      { label: "Projects", detail: "Tech stack & delivery context" },
      { label: "Roles", detail: "Seniority, skills, must-haves" },
      { label: "Pipeline", detail: "Stages from screen to offer" },
      { label: "Question bank", detail: "Structured interview library" },
    ],
    outcome: "AI and panel always evaluate against your stack — not generic JD text.",
  },
  {
    id: "screen",
    title: "Screen with AI",
    tagline: "Import candidates and get project-aligned analysis in minutes.",
    icon: "◈",
    tone: "cyan",
    steps: [
      { label: "Import", detail: "CSV bulk or single resume" },
      { label: "Parse", detail: "Resume → structured profile" },
      { label: "Match", detail: "Score vs project + role" },
      { label: "Recommend", detail: "Proceed · Hold · Reject" },
    ],
    outcome: "TA decides — AI surfaces evidence, cost, and tailored questions.",
  },
  {
    id: "pipeline",
    title: "Track pipeline",
    tagline: "Every candidate visible from first screen through final decision.",
    icon: "▦",
    tone: "green",
    steps: [
      { label: "New", detail: "Fresh imports & screens" },
      { label: "In review", detail: "TA + hiring manager" },
      { label: "Interviewing", detail: "Panel rounds in progress" },
      { label: "Decision", detail: "Offer, hold, or archive" },
    ],
    outcome: "No more spreadsheet side-channels — one kanban for the whole team.",
  },
  {
    id: "booking",
    title: "Schedule & assign",
    tagline: "Match interviewers to slots with full handoff context.",
    icon: "◷",
    tone: "orange",
    steps: [
      { label: "Workload", detail: "See interviewer capacity" },
      { label: "Assign", detail: "Panel + round selection" },
      { label: "Handoff", detail: "AI report + TA notes" },
      { label: "Calendar", detail: "Download .ics invite" },
    ],
    outcome: "Interviewers arrive prepared — no duplicate prep or mystery context.",
  },
  {
    id: "interview",
    title: "Panel workspace",
    tagline: "Structured interviews with shared AI output — zero duplicate cost.",
    icon: "✦",
    tone: "cyan",
    steps: [
      { label: "Brief", detail: "Shared screening report" },
      { label: "Questions", detail: "Rate structured prompts" },
      { label: "Notes", detail: "Per-question feedback" },
      { label: "Report", detail: "Auto PDF for leadership" },
    ],
    outcome: "Humans decide; AI assists once and everyone sees the same truth.",
  },
  {
    id: "audit",
    title: "Audit & lead",
    tagline: "Leadership sees funnel health, AI spend, and every action logged.",
    icon: "◎",
    tone: "green",
    steps: [
      { label: "Dashboard", detail: "Funnel + open roles" },
      { label: "AI cost", detail: "USD per screen visible" },
      { label: "Timeline", detail: "Full candidate history" },
      { label: "Export", detail: "Compliance-ready log" },
    ],
    outcome: "Transparent operations — not a black-box ATS subscription.",
  },
];
