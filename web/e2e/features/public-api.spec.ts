import { expect, test } from "@playwright/test";

test.describe("Public assets API @regression @email", () => {
  test("rejects keys outside Assets/ prefix", async ({ request }) => {
    const response = await request.get("/api/public/assets/secrets/logo.png");
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Registration API @sanity @auth", () => {
  test("rejects empty registration payload", async ({ request }) => {
    const response = await request.post("/api/register", {
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
