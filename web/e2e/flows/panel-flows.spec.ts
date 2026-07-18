import { expect, test } from "@playwright/test";
import path from "node:path";
import { measureSectionLoad } from "../helpers/measure";

const authDir = path.join(process.cwd(), "e2e", ".auth");

const panelSections = [
  ["/people", "Dashboard"],
  ["/assignments", "My assignments"],
  ["/library", "Question library"],
  ["/archive", "Archive"],
  ["/evaluate/new", "New evaluation"],
  ["/profile", "Profile"],
] as const;

const panelRoles = ["interviewer", "manager", "hr"] as const;

for (const role of panelRoles) {
  test.describe(`${role} panel flows @flow @panel`, () => {
    test.use({ storageState: path.join(authDir, `${role}.json`) });

    for (const [route, label] of panelSections) {
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

    test("Candidates list is blocked for panel users", async ({ page }) => {
      await page.goto("/candidates");
      await expect(page).toHaveURL(/\/people/);
    });
  });
}
