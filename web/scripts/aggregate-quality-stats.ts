import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { v4 as uuid } from "uuid";
import type { LoadScenario } from "../src/lib/quality-stats";
import {
  buildQualityStatsFromCases,
  parseLoadCases,
  parsePlaywrightCases,
  parseVitestCases,
} from "../src/lib/quality/parse-results";
import { persistQualityRun } from "../src/lib/db/quality-queries";
import { aiTestEnvironmentLabel } from "../src/lib/ai/test-mode";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_DIR = join(ROOT, "test-results");
const PUBLIC_STATS = join(ROOT, "public", "quality-stats.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

/** Prevent accidental OpenAI billing during automated quality runs. */
const TEST_PROCESS_ENV: Record<string, string | undefined> = {
  AI_TEST_MODE: "1",
  OPENAI_API_KEY: "",
  PLAYWRIGHT_TEST: "1",
};

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function parseLoadReport(): { baseUrl: string; scenarios: LoadScenario[] } {
  const report = readJson<{ baseUrl?: string; scenarios?: LoadScenario[] }>(
    join(RESULTS_DIR, "load-report.json"),
  );
  return {
    baseUrl: report?.baseUrl ?? BASE_URL,
    scenarios: report?.scenarios ?? [],
  };
}

function runCommand(
  label: string,
  command: string,
  args: string[],
  env?: Record<string, string | undefined>,
  options?: { fatal?: boolean },
) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    const message = `  ⚠ ${label} exited with code ${result.status}`;
    if (options?.fatal) {
      console.error(message);
      process.exit(result.status ?? 1);
    }
    console.warn(message);
  }
  return result.status ?? 1;
}

function sleep(ms: number) {
  spawnSync(process.platform === "win32" ? "powershell" : "sleep", [
    process.platform === "win32" ? "-Command" : ms.toString(),
    process.platform === "win32" ? `Start-Sleep -Milliseconds ${ms}` : "",
  ].filter(Boolean));
}

async function waitForServer(url: string, attempts = 120) {
  console.log(`  Waiting for server at ${url}…`);
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok || res.status < 500) {
        console.log(`  ✓ Server ready (${i + 1}s)`);
        return;
      }
    } catch {
      // still starting
    }
    if (i > 0 && i % 10 === 0) {
      console.log(`  … still waiting (${i}s)`);
    }
    sleep(1000);
  }
  throw new Error(`Server not ready at ${url} after ${attempts}s`);
}

function startProductionServer(): ChildProcess {
  console.log("\n▶ Building production app for load + E2E tests");
  runCommand("Production build", "npm", ["run", "build"], undefined, { fatal: true });
  console.log("\n▶ Starting production server");
  return spawn("npm", ["run", "start"], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
    detached: process.platform !== "win32",
    env: process.env,
  });
}

function stopServer(child: ChildProcess | null) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    child.kill("SIGTERM");
  }
}

async function main() {
  process.env.AI_TEST_MODE = "1";
  process.env.OPENAI_API_KEY = "";

  mkdirSync(RESULTS_DIR, { recursive: true });

  runCommand("Unit tests (Vitest)", "npx", [
    "vitest",
    "run",
    "--reporter=default",
    "--reporter=json",
    "--outputFile=test-results/vitest-report.json",
  ]);

  runCommand("Seed E2E role users", "npm", ["run", "test:seed:e2e"], TEST_PROCESS_ENV);

  const server = startProductionServer();
  try {
    await waitForServer(BASE_URL);
    runCommand("Load test", "node", ["tests/load/load-test.mjs", `--base-url=${BASE_URL}`], TEST_PROCESS_ENV);
    runCommand("Playwright E2E + flows", "npx", ["playwright", "test"], {
      ...TEST_PROCESS_ENV,
      PLAYWRIGHT_SKIP_WEBSERVER: "1",
      PLAYWRIGHT_BASE_URL: BASE_URL,
      PLAYWRIGHT_FLOW_SETUP: "1",
      PLAYWRIGHT_WORKERS: "2",
    });
  } finally {
    stopServer(server);
  }

  const load = parseLoadReport();
  const cases = [
    ...parseVitestCases(RESULTS_DIR),
    ...parsePlaywrightCases(RESULTS_DIR),
    ...parseLoadCases(load.scenarios),
  ];
  const stats = buildQualityStatsFromCases(
    cases.filter((c) => c.suiteType !== "load"),
    load,
    aiTestEnvironmentLabel(process.env.NODE_ENV ?? "production"),
  );

  writeFileSync(PUBLIC_STATS, JSON.stringify(stats, null, 2));
  console.log(`\n✓ Quality stats written to public/quality-stats.json`);

  const runId = uuid();
  try {
    await persistQualityRun({
      runId,
      stats,
      cases,
      loadScenarios: load.scenarios,
      ciRef: process.env.GITHUB_SHA ?? process.env.CI ?? "",
    });
    console.log(`✓ Quality run persisted to database (${runId})`);
  } catch (error) {
    console.warn("⚠ Could not persist to database — run `npm run db:migrate:quality` and ensure DATABASE_URL is set");
    console.warn(error);
  }

  console.log(`  Automation: ${stats.summary.passedTests}/${stats.summary.totalTests} tests passed`);
  console.log(
    `  Load: ${load.scenarios.filter((s) => s.status === "passed").length}/${load.scenarios.length} scenarios passed`,
  );
  console.log(`  Test cases recorded: ${cases.length}`);
  console.log(`  AI mode: mocked (no OpenAI charges during this run)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
