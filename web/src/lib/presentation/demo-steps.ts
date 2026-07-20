export type DemoStep = {
  id: string;
  path: string;
  title: string;
  hint: string;
  role?: "ta" | "interviewer" | "any";
};

export const DEMO_STORAGE_KEY = "le-demo-guide";

export const DEMO_STEPS: DemoStep[] = [
  {
    id: "dashboard",
    path: "/people",
    title: "Leadership dashboard",
    hint: "Pipeline funnel, open roles, and AI cost telemetry.",
    role: "ta",
  },
  {
    id: "new-case",
    path: "/evaluate/new",
    title: "New case file",
    hint: "Upload a resume, pick a job ID, run AI analysis.",
    role: "ta",
  },
  {
    id: "pipeline",
    path: "/pipeline",
    title: "Hiring pipeline",
    hint: "Kanban view — candidate moves stage by stage.",
    role: "ta",
  },
  {
    id: "booking",
    path: "/booking",
    title: "Booking & assignment",
    hint: "Assign an interviewer and download a calendar invite.",
    role: "ta",
  },
  {
    id: "assignments",
    path: "/assignments",
    title: "Panel workspace",
    hint: "Interviewer sees TA notes + shared AI output.",
    role: "interviewer",
  },
  {
    id: "audit",
    path: "/setup/audit",
    title: "Audit trail",
    hint: "Every action logged for compliance and review.",
    role: "ta",
  },
];

export function stepIndexForPath(pathname: string): number {
  const exact = DEMO_STEPS.findIndex((s) => s.path === pathname);
  if (exact >= 0) return exact;
  if (pathname.startsWith("/evaluate/") && pathname !== "/evaluate/new") {
    return DEMO_STEPS.findIndex((s) => s.id === "new-case");
  }
  if (pathname.startsWith("/booking/")) {
    return DEMO_STEPS.findIndex((s) => s.id === "booking");
  }
  return -1;
}
