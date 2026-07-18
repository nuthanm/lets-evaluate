/**
 * Lightweight HTTP load test — simulates concurrent virtual users against public routes.
 * Usage: node tests/load/load-test.mjs [--base-url=http://127.0.0.1:3000]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VU_LEVELS = [5, 10, 15, 20, 50];
const ROUTES = ["/", "/login", "/register"];
const DURATION_SEC = 15;
const THINK_TIME_MS = 50;
const COOLDOWN_SEC = 5;
const PASS_P95_MS = 3000;
const PASS_ERROR_RATE = 0.05;

function parseBaseUrl() {
  const arg = process.argv.find((a) => a.startsWith("--base-url="));
  return (arg?.split("=")[1] ?? process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function fetchRoute(baseUrl, route) {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}${route}`, { redirect: "follow" });
    const elapsed = performance.now() - start;
    const ok = res.status >= 200 && res.status < 500;
    return { ok, elapsed, status: res.status };
  } catch {
    return { ok: false, elapsed: performance.now() - start, status: 0 };
  }
}

async function runScenario(baseUrl, virtualUsers) {
  const endAt = Date.now() + DURATION_SEC * 1000;
  const latencies = [];
  let errors = 0;
  let total = 0;

  async function worker(workerIndex) {
    let requestIndex = workerIndex;
    while (Date.now() < endAt) {
      const route = ROUTES[requestIndex % ROUTES.length];
      requestIndex += virtualUsers;
      const result = await fetchRoute(baseUrl, route);
      latencies.push(result.elapsed);
      if (!result.ok) errors += 1;
      total += 1;
      if (THINK_TIME_MS > 0) {
        await new Promise((r) => setTimeout(r, THINK_TIME_MS));
      }
    }
  }

  const workers = Array.from({ length: virtualUsers }, (_, i) => worker(i));
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const errorRate = total === 0 ? 1 : errors / total;
  const avgResponseMs = latencies.length
    ? latencies.reduce((s, v) => s + v, 0) / latencies.length
    : 0;
  const p95ResponseMs = percentile(latencies, 95);
  const p99ResponseMs = percentile(latencies, 99);
  const requestsPerSec = total / DURATION_SEC;
  const passed = errorRate <= PASS_ERROR_RATE && p95ResponseMs <= PASS_P95_MS;

  return {
    virtualUsers,
    durationSec: DURATION_SEC,
    totalRequests: total,
    requestsPerSec: Math.round(requestsPerSec * 10) / 10,
    avgResponseMs: Math.round(avgResponseMs),
    p95ResponseMs: Math.round(p95ResponseMs),
    p99ResponseMs: Math.round(p99ResponseMs),
    errorRate: Math.round(errorRate * 10000) / 100,
    status: passed ? "passed" : "failed",
  };
}

async function main() {
  const baseUrl = parseBaseUrl();
  console.log(`Load test target: ${baseUrl}`);
  console.log(`VU levels: ${VU_LEVELS.join(", ")} · ${DURATION_SEC}s each\n`);

  try {
    const probe = await fetch(baseUrl, { redirect: "follow" });
    if (probe.status >= 500) {
      throw new Error(`server returned ${probe.status}`);
    }
  } catch {
    console.error(
      `\n✗ Cannot reach ${baseUrl}\n` +
        "  Start the app first:  npm run dev\n" +
        "  Or use:               npm run test:load   (auto-starts dev server)\n",
    );
    process.exit(1);
  }

  const scenarios = [];
  for (const [index, vu] of VU_LEVELS.entries()) {
    process.stdout.write(`  ${vu} users… `);
    const result = await runScenario(baseUrl, vu);
    scenarios.push(result);
    console.log(
      `${result.status.toUpperCase()} · ${result.requestsPerSec} req/s · p95 ${result.p95ResponseMs}ms · errors ${result.errorRate}%`,
    );
    if (index < VU_LEVELS.length - 1 && COOLDOWN_SEC > 0) {
      await new Promise((r) => setTimeout(r, COOLDOWN_SEC * 1000));
    }
  }

  const outDir = join(__dirname, "../../test-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "load-report.json");
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, scenarios }, null, 2),
  );
  console.log(`\nReport written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
