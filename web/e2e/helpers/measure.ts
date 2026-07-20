import type { Page } from "@playwright/test";
import { SLA_THRESHOLD_MS } from "../../src/lib/quality/sla";

export async function measureSectionLoad(
  page: Page,
  path: string,
  readySelector = "header h1, h1",
) {
  const start = Date.now();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator(readySelector).first().waitFor({ state: "visible", timeout: 45_000 });
  const durationMs = Date.now() - start;
  return {
    durationMs,
    withinSla: durationMs <= SLA_THRESHOLD_MS,
    thresholdMs: SLA_THRESHOLD_MS,
  };
}

export async function measureApiCall(
  page: Page,
  path: string,
  method: "GET" | "POST" = "GET",
) {
  const start = Date.now();
  const response = await page.request.fetch(path, { method, timeout: 45_000 });
  const durationMs = Date.now() - start;
  return {
    response,
    durationMs,
    withinSla: durationMs <= SLA_THRESHOLD_MS,
    thresholdMs: SLA_THRESHOLD_MS,
  };
}
