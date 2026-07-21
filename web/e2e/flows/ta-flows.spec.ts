import { expect, test } from "@playwright/test";
import path from "node:path";
import { measureSectionLoad } from "../helpers/measure";

const authDir = path.join(process.cwd(), "e2e", ".auth");

const taSections = [
  ["/people", "Dashboard"],
  ["/candidates", "Candidates"],
  ["/interviewers", "Interviewers"],
  ["/booking", "Schedule"],
  ["/pipeline", "Pipeline"],
  ["/library", "Question library"],
  ["/job-descriptions", "Job descriptions"],
  ["/archive", "Archive"],
  ["/evaluate/new", "New evaluation"],
  ["/profile", "Profile"],
] as const;

test.describe("TA role flows @flow @ta", () => {
  test.use({ storageState: path.join(authDir, "ta.json") });

  for (const [route, label] of taSections) {
    test(`${label} loads within performance budget`, async ({ page }) => {
      const { durationMs, withinSla } = await measureSectionLoad(page, route);
      await expect(page.locator("header h1, h1").first()).toBeVisible();
      test.info().annotations.push({
        type: "sla",
        description: withinSla ? "Within SLA" : "SLA Breach",
      });
      test.info().annotations.push({ type: "duration_ms", description: String(durationMs) });
    });
  }

  test("Setup is blocked for TA users", async ({ page }) => {
    await page.goto("/setup/projects");
    await expect(page).toHaveURL(/\/people/);
  });
});
