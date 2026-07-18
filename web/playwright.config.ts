import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isQualityRun = !!process.env.PLAYWRIGHT_FLOW_SETUP;
const useSharedServer = isQualityRun || !!process.env.PLAYWRIGHT_SKIP_WEBSERVER;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: isQualityRun ? "./e2e/global-setup.ts" : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI || isQualityRun ? 1 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : useSharedServer || process.env.CI
      ? 2
      : undefined,
  timeout: useSharedServer ? 60_000 : 30_000,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-report.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: useSharedServer ? 45_000 : 30_000,
  },
  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "sanity",
      grep: /@sanity/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "regression",
      grep: /@regression/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "flow",
      grep: /@flow/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
