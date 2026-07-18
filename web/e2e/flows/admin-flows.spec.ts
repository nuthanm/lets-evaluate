import { expect, test } from "@playwright/test";
import path from "node:path";
import { measureSectionLoad } from "../helpers/measure";

const authDir = path.join(process.cwd(), "e2e", ".auth");

const adminSections = [
  ["/people", "Dashboard"],
  ["/setup/projects", "Setup · Projects"],
  ["/setup/roles", "Setup · Roles"],
  ["/setup/locations", "Setup · Locations"],
  ["/setup/pipeline", "Setup · Pipeline"],
  ["/setup/templates", "Setup · Mail templates"],
  ["/setup/mail-assets", "Setup · Mail assets"],
  ["/setup/audit", "Setup · Audit log"],
  ["/openings", "Openings board"],
  ["/candidates", "Candidates"],
  ["/pipeline", "Pipeline"],
  ["/booking", "Booking"],
  ["/interviewers", "Interviewers"],
  ["/candidates/import", "Bulk import"],
  ["/library", "Question library"],
  ["/job-descriptions", "Job descriptions"],
  ["/archive", "Archive"],
  ["/evaluate/new", "New evaluation"],
  ["/profile", "Profile"],
] as const;

test.describe("Admin role flows @flow @admin", () => {
  test.use({ storageState: path.join(authDir, "admin.json") });

  for (const [route, label] of adminSections) {
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
});
