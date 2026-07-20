import { expect, test } from "@playwright/test";

test.describe("Regression @regression", () => {
  test("landing page stat grid renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Guided steps")).toBeVisible();
    await expect(page.getByText("Per evaluation")).toBeVisible();
    await expect(page.getByText("Audit trail")).toBeVisible();
  });

  test("landing page hides quality navigation and sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Quality report" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quality proof" })).toHaveCount(0);
    await expect(page.locator("#quality-proof")).toHaveCount(0);
  });

  test("footer sign-in link navigates to login", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page links back to login", async ({ page }) => {
    await page.goto("/register");
    const loginLink = page.getByRole("link", { name: /sign in/i });
    if (await loginLink.count()) {
      await loginLink.first().click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
