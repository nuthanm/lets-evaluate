export type ShowcaseSlide = {
  id: string;
  title: string;
  caption: string;
  highlights: string[];
};

export const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: "dashboard",
    title: "Leadership dashboard",
    caption: "Pipeline funnel, open roles, and AI cost telemetry in one view.",
    highlights: [
      "Real-time pipeline funnel",
      "Est. AI cost (USD) visible",
      "Open roles at a glance",
    ],
  },
  {
    id: "evaluate",
    title: "AI screening workspace",
    caption: "Resume + project-aligned analysis with transparent recommendations.",
    highlights: [
      "Tech match score vs your stack",
      "Proceed / Hold / Reject — human decides",
      "Tailored interview questions",
    ],
  },
  {
    id: "pipeline",
    title: "Hiring pipeline",
    caption: "Kanban board from screening through decision.",
    highlights: [
      "Stage-by-stage visibility",
      "Drag-free status columns",
      "One click to case file",
    ],
  },
  {
    id: "booking",
    title: "Schedule & assignment",
    caption: "Assign interviewers with handoff notes and calendar invites.",
    highlights: [
      "Interviewer workload view",
      "Handoff notes for panel",
      "Download .ics calendar file",
    ],
  },
  {
    id: "assignments",
    title: "Panel workspace",
    caption: "Interviewers reuse TA analysis — no duplicate AI cost.",
    highlights: [
      "Shared AI screening report",
      "Structured question ratings",
      "Auto-generated PDF report",
    ],
  },
  {
    id: "coding",
    title: "Live coding exercise",
    caption: "Share a token link — candidate codes in-browser; panel sees live activity.",
    highlights: [
      "No candidate login — secure token URL",
      "AI or library scenarios · save & reuse",
      "Live editor mirror + paste/blur tracking",
    ],
  },
  {
    id: "audit",
    title: "Audit trail",
    caption: "Every action logged for compliance and leadership review.",
    highlights: [
      "Who did what, when",
      "Full candidate timeline",
      "Export-ready activity log",
    ],
  },
];
