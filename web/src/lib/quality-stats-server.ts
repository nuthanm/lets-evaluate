import { getLatestQualityStats } from "@/lib/db/quality-queries";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { QualityStats } from "./quality-stats";

const FALLBACK: QualityStats = {
  generatedAt: new Date(0).toISOString(),
  environment: "unknown",
  summary: {
    automationPassRate: 0,
    loadPassRate: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    totalDurationMs: 0,
  },
  automation: { suites: [] },
  load: { baseUrl: "", scenarios: [] },
};

function readJsonFallback(): QualityStats {
  try {
    const path = join(process.cwd(), "public", "quality-stats.json");
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as QualityStats;
  } catch {
    return FALLBACK;
  }
}

/** Prefer database (persistent history); fall back to committed JSON artifact. */
export async function getQualityStats(): Promise<QualityStats> {
  try {
    const fromDb = await getLatestQualityStats();
    if (fromDb && fromDb.summary.totalTests > 0) return fromDb;
  } catch {
    // DATABASE_URL may be unset at build time
  }
  return readJsonFallback();
}
