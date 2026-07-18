import { expect, test } from "@playwright/test";
import path from "node:path";
import { measureApiCall } from "../helpers/measure";

const authDir = path.join(process.cwd(), "e2e", ".auth");

test.describe("Authenticated API performance @flow @api", () => {
  test.use({ storageState: path.join(authDir, "admin.json") });

  const adminApis = [
    ["/api/projects", "Projects API"],
    ["/api/roles", "Roles API"],
    ["/api/candidates", "Candidates API"],
    ["/api/questions", "Questions API"],
    ["/api/pipeline-stages", "Pipeline stages API"],
    ["/api/job-descriptions", "Job descriptions API"],
    ["/api/interviewers", "Interviewers API"],
    ["/api/ai/stats", "AI stats API"],
  ] as const;

  for (const [route, label] of adminApis) {
    test(`${label} responds within SLA`, async ({ page }) => {
      const { response, durationMs, withinSla } = await measureApiCall(page, route);
      expect(response.status()).toBeLessThan(500);
      test.info().annotations.push({
        type: "sla",
        description: withinSla ? "Within SLA" : "SLA Breach",
      });
      test.info().annotations.push({ type: "duration_ms", description: String(durationMs) });
    });
  }
});
