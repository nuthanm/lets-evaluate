import { expect, test } from "@playwright/test";

const protectedPages = [
  ["/people", "Dashboard"],
  ["/candidates", "Candidates"],
  ["/pipeline", "Pipeline"],
  ["/booking", "Booking"],
  ["/library", "Question library"],
  ["/job-descriptions", "Job descriptions"],
  ["/archive", "Archive"],
  ["/setup/projects", "Setup projects"],
] as const;

test.describe("App routes RBAC @regression @rbac", () => {
  for (const [path, label] of protectedPages) {
    test(`${label} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Protected APIs RBAC @regression @rbac", () => {
  const protectedApis = [
    "/api/candidates",
    "/api/projects",
    "/api/roles",
    "/api/questions",
    "/api/job-descriptions",
    "/api/pipeline-stages",
    "/api/interviewers",
    "/api/ai/stats",
  ] as const;

  for (const path of protectedApis) {
    test(`${path} returns 401 without session`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
    });
  }
});
