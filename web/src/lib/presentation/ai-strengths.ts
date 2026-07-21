export type AIStrength = {
  id: string;
  title: string;
  description: string;
  contrast: string;
  icon: string;
  highlight?: boolean;
};

export const AI_STRENGTHS: AIStrength[] = [
  {
    id: "project-aligned",
    title: "Project-aligned screening",
    description:
      "Resume scored against your actual tech stack and delivery context — not generic keyword matching.",
    contrast: "Generic ATS: opaque enterprise AI tier",
    icon: "◈",
    highlight: true,
  },
  {
    id: "transparent-cost",
    title: "Every rupee visible",
    description:
      "Token usage and USD cost per candidate on the leadership dashboard — budget with confidence.",
    contrast: "Typical ATS: bundled, unauditable AI",
    icon: "₹",
    highlight: true,
  },
  {
    id: "shared-report",
    title: "Screen once, reuse everywhere",
    description:
      "TA runs AI once; interviewers inherit the same report. No duplicate API calls per panel member.",
    contrast: "Typical flow: re-parse per interviewer",
    icon: "↻",
  },
  {
    id: "human-decides",
    title: "Human-in-the-loop",
    description:
      "Proceed / Hold / Reject recommendations — never auto-reject. AI assists; hiring managers decide.",
    contrast: "Black-box auto-scores",
    icon: "✓",
    highlight: true,
  },
  {
    id: "tailored-questions",
    title: "Tailored interview questions",
    description:
      "AI generates role-specific prompts from the resume gap analysis — ready for the panel workspace.",
    contrast: "Generic question banks",
    icon: "?",
  },
  {
    id: "audit-trail",
    title: "Full AI audit trail",
    description:
      "Who triggered screening, when, at what cost — logged alongside every human action.",
    contrast: "No leadership visibility",
    icon: "◎",
  },
];
