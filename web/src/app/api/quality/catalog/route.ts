import { NextResponse } from "next/server";
import {
  getPaidServiceExclusionCount,
  getTestCatalogTotals,
  PAID_SERVICE_EXCLUSIONS,
  TEST_CATALOG,
  TEST_CATALOG_BY_SUITE,
  TEST_COVERAGE_PLANNED,
} from "@/lib/quality/test-catalog";
import { SLA_THRESHOLD_MS } from "@/lib/quality/sla";

export async function GET() {
  return NextResponse.json({
    totals: getTestCatalogTotals(),
    bySuite: TEST_CATALOG_BY_SUITE,
    byModule: TEST_CATALOG,
    paidServiceExclusions: PAID_SERVICE_EXCLUSIONS,
    paidServiceExcludedCount: getPaidServiceExclusionCount(),
    planned: TEST_COVERAGE_PLANNED,
    slaThresholdMs: SLA_THRESHOLD_MS,
  });
}
