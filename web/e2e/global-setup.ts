import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

const ROLES = [
  { role: "admin", username: "e2e.admin" },
  { role: "ta", username: "e2e.ta" },
  { role: "interviewer", username: "e2e.interviewer" },
  { role: "manager", username: "e2e.manager" },
  { role: "hr", username: "e2e.hr" },
] as const;

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://127.0.0.1:3000";
  const password = process.env.E2E_TEST_PASSWORD ?? "Kanini@E2E2026";
  const authDir = join(process.cwd(), "e2e", ".auth");
  mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const account of ROLES) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${baseURL}/login`);
      await page.locator("#username").fill(account.username);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /Enter workspace/i }).click();
      await page.waitForURL("**/people", { timeout: 60_000 });
      await context.storageState({ path: join(authDir, `${account.role}.json`) });
      await context.close();
      console.log(`  ✓ Auth saved: ${account.role}`);
    }
  } finally {
    await browser.close();
  }
}
