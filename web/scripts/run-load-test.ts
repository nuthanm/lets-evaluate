/**
 * Runs load tests against a running app. Builds and starts production server
 * when nothing is reachable (dev server cannot handle concurrent load well).
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BASE_URL = process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const USE_DEV = process.env.LOAD_TEST_USE_DEV === "1";

function sleep(ms: number) {
  spawnSync(process.platform === "win32" ? "powershell" : "sleep", [
    process.platform === "win32" ? "-Command" : ms.toString(),
    process.platform === "win32" ? `Start-Sleep -Milliseconds ${ms}` : "",
  ].filter(Boolean));
}

async function isServerUp(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

function runBuild() {
  console.log("▶ Building production app for load test…");
  const result = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function startServer(): ChildProcess {
  const command = USE_DEV ? "dev" : "start";
  console.log(`▶ Starting ${USE_DEV ? "dev" : "production"} server for load test…`);
  return spawn("npm", ["run", command], {
    cwd: ROOT,
    stdio: "ignore",
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

async function waitForServer(url: string, attempts = 120) {
  for (let i = 0; i < attempts; i += 1) {
    if (await isServerUp(url)) return;
    sleep(1000);
  }
  throw new Error(`Server not ready at ${url} after ${attempts}s`);
}

async function main() {
  const alreadyUp = await isServerUp(BASE_URL);
  let server: ChildProcess | null = null;
  let startedByScript = false;

  if (!alreadyUp) {
    if (!USE_DEV) runBuild();
    server = startServer();
    startedByScript = true;
    try {
      await waitForServer(BASE_URL);
    } catch (err) {
      stopServer(server);
      throw err;
    }
  } else {
    console.log(`▶ Using existing server at ${BASE_URL}`);
    if (USE_DEV) {
      console.warn(
        "  Tip: dev server may fail at 10+ users. Set LOAD_TEST_USE_DEV=0 (default) to use production.",
      );
    }
  }

  const result = spawnSync(
    "node",
    ["tests/load/load-test.mjs", `--base-url=${BASE_URL}`],
    { cwd: ROOT, stdio: "inherit", shell: true, env: process.env },
  );

  if (startedByScript) stopServer(server);

  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
