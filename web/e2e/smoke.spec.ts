import { expect, test } from "@playwright/test";

test.describe("Smoke @smoke", () => {
  test("homepage loads with hero and workflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every candidate deserves",
    );
    await expect(page.locator("#workflow")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
