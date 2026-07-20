import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function run(label: string, command: string, args: string[]) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("Seed E2E role users", "npm", ["run", "test:seed:e2e"]);

process.env.PLAYWRIGHT_FLOW_SETUP = "1";
const flow = spawnSync("npx", ["playwright", "test", "--project=flow"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(flow.status ?? 1);
