import { expect, test } from "@playwright/test";

test.describe("Sanity @sanity", () => {
  test("landing nav links and CTAs work", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Open a case file/i })).toBeVisible();
    await page.goto("/#workflow");
    await expect(page.locator("#workflow")).toBeInViewport();
  });

  test("workflow section shows four steps", async ({ page }) => {
    await page.goto("/#workflow");
    const steps = page.locator("#workflow article");
    await expect(steps).toHaveCount(4);
    await expect(steps.first()).toContainText("Configure context");
  });

  test("login form has username and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });
});
