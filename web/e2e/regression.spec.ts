import { expect, test } from "@playwright/test";

test.describe("Regression @regression", () => {
  test("landing page stat grid renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Guided steps")).toBeVisible();
    await expect(page.getByText("Per evaluation")).toBeVisible();
    await expect(page.getByText("Audit trail")).toBeVisible();
  });

  test("quality proof section renders when present", async ({ page }) => {
    await page.goto("/#quality-proof");
    await expect(page.locator("#quality-proof")).toBeVisible();
    await expect(
      page.locator("#quality-proof").getByRole("heading", { level: 2 }),
    ).toContainText("Tested, measured, and verified");
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
