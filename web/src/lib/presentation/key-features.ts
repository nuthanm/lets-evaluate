export type KeyFeature = {
  id: string;
  title: string;
  description: string;
  badge: string;
  tone: "cyan" | "green" | "orange" | "navy";
  size: "normal" | "wide" | "tall";
};

export const KEY_FEATURES: KeyFeature[] = [
  {
    id: "ai-screening",
    title: "AI resume screening",
    description: "Project + role aligned analysis with Proceed / Hold / Reject and tailored questions.",
    badge: "Core",
    tone: "cyan",
    size: "wide",
  },
  {
    id: "pipeline",
    title: "Hiring pipeline",
    description: "Kanban from first import through offer — one view for TA and leadership.",
    badge: "Workflow",
    tone: "green",
    size: "normal",
  },
  {
    id: "booking",
    title: "Booking & assignment",
    description: "Interviewer workload, handoff notes, and .ics calendar downloads.",
    badge: "Coordination",
    tone: "orange",
    size: "normal",
  },
  {
    id: "panel",
    title: "Panel workspace",
    description: "Shared AI report, structured ratings, and auto-generated PDF for leadership.",
    badge: "Interview",
    tone: "cyan",
    size: "tall",
  },
  {
    id: "bulk",
    title: "Bulk CSV import",
    description: "Import hundreds of candidates with background job progress tracking.",
    badge: "Scale",
    tone: "navy",
    size: "normal",
  },
  {
    id: "jd",
    title: "Job descriptions",
    description: "AI-assisted JD generation, import, and export to PDF/DOCX.",
    badge: "Content",
    tone: "green",
    size: "normal",
  },
  {
    id: "library",
    title: "Question library",
    description: "Structured interview bank aligned to roles and seniority levels.",
    badge: "Quality",
    tone: "navy",
    size: "normal",
  },
  {
    id: "audit",
    title: "Audit log",
    description: "Every action logged — who, what, when — export-ready for compliance.",
    badge: "Trust",
    tone: "orange",
    size: "wide",
  },
];
