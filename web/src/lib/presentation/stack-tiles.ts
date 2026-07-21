export type StackTileTone = "cyan" | "green" | "orange" | "neutral" | "planned";

export type StackTile = {
  id: string;
  category: string;
  name: string;
  version: string;
  note: string;
  tone: StackTileTone;
  top: string;
  left: string;
  width?: number;
  delay: number;
};

/** Platform stack tiles — versions from web/package.json & deployment docs. */
export const STACK_TILES: StackTile[] = [
  { id: "next", category: "Frontend", name: "Next.js", version: "16.2.10", note: "App Router", tone: "cyan", top: "6%", left: "2%", delay: 0 },
  { id: "react", category: "Frontend", name: "React", version: "19.2.4", note: "UI runtime", tone: "cyan", top: "4%", left: "18%", delay: -1.2 },
  { id: "ts", category: "Frontend", name: "TypeScript", version: "5.x", note: "Strict typing", tone: "cyan", top: "10%", left: "34%", delay: -2.4 },
  { id: "tailwind", category: "Styling", name: "Tailwind CSS", version: "4.x", note: "Brand tokens", tone: "cyan", top: "3%", left: "50%", delay: -0.8 },
  { id: "xyflow", category: "Planned UI", name: "React Flow", version: "@xyflow/react 12.x", note: "Workflow + swimlanes", tone: "planned", top: "8%", left: "66%", delay: -3.1 },

  { id: "api", category: "Backend", name: "Next.js API", version: "16.2.10", note: "Routes + actions", tone: "green", top: "24%", left: "4%", delay: -1.8 },
  { id: "drizzle", category: "ORM", name: "Drizzle ORM", version: "0.45.2", note: "Schema migrations", tone: "green", top: "26%", left: "20%", delay: -4 },
  { id: "zod", category: "Validation", name: "Zod", version: "4.4.3", note: "API + env schemas", tone: "green", top: "22%", left: "36%", delay: -2.2 },
  { id: "inngest", category: "Jobs", name: "Inngest", version: "4.12.1", note: "Bulk + screening", tone: "green", top: "28%", left: "52%", delay: -0.5 },
  { id: "dndkit", category: "Planned UI", name: "dnd-kit", version: "core + sortable", note: "Kanban drag-drop", tone: "planned", top: "24%", left: "68%", delay: -3.6 },

  { id: "pg", category: "Database", name: "PostgreSQL", version: "15+", note: "Primary datastore", tone: "neutral", top: "42%", left: "1%", delay: -2.8 },
  { id: "neon", category: "Database Dev", name: "Neon", version: "Serverless PG", note: "@neondatabase 1.1.0", tone: "neutral", top: "40%", left: "16%", delay: -1.4 },
  { id: "azure-pg", category: "Database Prod", name: "Azure PostgreSQL", version: "Flexible Server", note: "Neon → Azure path", tone: "neutral", top: "44%", left: "32%", delay: -4.4 },
  { id: "postgresjs", category: "Driver", name: "postgres.js", version: "3.4.9", note: "Drizzle client", tone: "neutral", top: "38%", left: "48%", delay: -0.3 },
  { id: "authjs", category: "Auth", name: "Auth.js", version: "5.0.0-beta.31", note: "Credentials + sessions", tone: "neutral", top: "42%", left: "64%", delay: -3.3 },

  { id: "entra", category: "SSO", name: "Microsoft Entra ID", version: "OIDC v2.0", note: "Group → role map", tone: "cyan", top: "40%", left: "80%", delay: -2 },
  { id: "gpt4o", category: "AI Analysis", name: "OpenAI gpt-4o", version: "OPENAI_ANALYSIS_MODEL", note: "Resume screening", tone: "cyan", top: "58%", left: "6%", delay: -1.1 },
  { id: "gpt4mini", category: "AI Utility", name: "gpt-4o-mini", version: "OPENAI_MODEL", note: "Questions, notes, JD", tone: "cyan", top: "60%", left: "22%", delay: -3.9 },
  { id: "openai-sdk", category: "AI SDK", name: "openai", version: "6.45.0", note: "Direct SDK", tone: "cyan", top: "56%", left: "38%", delay: -2.6 },
  { id: "s3", category: "Storage", name: "S3-compatible", version: "AWS SDK 3.1080.0", note: "R2 / Azure / S3", tone: "green", top: "58%", left: "54%", delay: -0.7 },

  { id: "pdflib", category: "Documents", name: "pdf-lib", version: "1.17.1", note: "Evaluation PDFs", tone: "green", top: "60%", left: "70%", delay: -4.1 },
  { id: "resume", category: "Resume parse", name: "pdf-parse + mammoth", version: "2.4.5 / 1.12.0", note: "PDF + DOCX", tone: "green", top: "56%", left: "84%", delay: -1.6 },
  { id: "mail", category: "Email", name: "In-app templates", version: "Manual send", note: "Copy / mail client", tone: "orange", top: "74%", left: "8%", delay: -3.4 },
  { id: "graph", category: "Email (opt)", name: "Microsoft Graph", version: "Scaffolded", note: "Enterprise auto-send", tone: "orange", top: "76%", left: "26%", delay: -2.3 },
  { id: "vercel", category: "Hosting", name: "Vercel", version: "Node 22", note: "App deployment", tone: "neutral", top: "72%", left: "44%", delay: -0.9 },

  { id: "gha", category: "CI", name: "GitHub Actions", version: "quality.yml", note: "Playwright + Vitest", tone: "neutral", top: "74%", left: "58%", width: 132, delay: -2.1 },
  { id: "playwright", category: "Testing", name: "Playwright", version: "1.58.2", note: "E2E suites", tone: "neutral", top: "76%", left: "72%", width: 132, delay: -1.7 },
  { id: "vitest", category: "Testing", name: "Vitest", version: "4.1.10", note: "Unit tests", tone: "neutral", top: "12%", left: "82%", width: 124, delay: -3.2 },
  { id: "sentry", category: "Observability", name: "Sentry", version: "Planned P1", note: "Error monitoring", tone: "orange", top: "58%", left: "88%", width: 124, delay: -0.6 },
  { id: "edge", category: "CDN / TLS", name: "Vercel Edge", version: "Custom domain", note: "White-label per org", tone: "neutral", top: "30%", left: "84%", width: 124, delay: -4.3 },
];
