import { QualityDashboardClient } from "@/components/quality/QualityDashboardClient";
import { getBrand } from "@/lib/brand";
import {
  getLatestRunForDate,
  getQualityTrend,
  listQualityRunDates,
} from "@/lib/db/quality-queries";
import { FEATURE_LABELS, type FeatureArea } from "@/lib/quality/feature-areas";
import { computeSlaStatus, slaLabel, summarizeSlaStatuses } from "@/lib/quality/sla";

export const metadata = {
  title: "Quality Report",
  description: "Public test results and quality metrics published daily.",
};

export default async function QualityReportPage() {
  const brand = getBrand();

  let dates: Awaited<ReturnType<typeof listQualityRunDates>> = [];
  let trend: Awaited<ReturnType<typeof getQualityTrend>> = [];
  let initialDetail = null;
  let initialDate = new Date().toISOString().slice(0, 10);

  try {
    dates = await listQualityRunDates(120);
    trend = await getQualityTrend(30);
    if (dates[0]?.runDate) {
      initialDate = dates[0].runDate;
      const detail = await getLatestRunForDate(initialDate);
      if (detail) {
        const cases = detail.cases.map((testCase) => {
          const slaStatus = computeSlaStatus(testCase.durationMs, testCase.status, testCase.suiteType);
          return {
            id: testCase.id,
            featureArea: testCase.featureArea,
            featureLabel: FEATURE_LABELS[testCase.featureArea as FeatureArea] ?? testCase.featureArea,
            suiteType: testCase.suiteType,
            name: testCase.name,
            status: testCase.status,
            durationMs: testCase.durationMs,
            errorMessage: testCase.errorMessage,
            slaStatus,
            slaLabel: slaLabel(slaStatus),
          };
        });
        const loadSlaStatuses = detail.loadScenarios.map((scenario) =>
          computeSlaStatus(scenario.p95ResponseMs, scenario.status, "load"),
        );
        const slaSummary = summarizeSlaStatuses([
          ...cases.map((c) => c.slaStatus),
          ...loadSlaStatuses,
        ]);

        initialDetail = {
          run: {
            runDate: detail.run.runDate,
            generatedAt: detail.run.generatedAt.toISOString(),
            environment: detail.run.environment,
            totalTests: detail.run.totalTests,
            passedTests: detail.run.passedTests,
            failedTests: detail.run.failedTests,
            totalDurationMs: detail.run.totalDurationMs,
            automationPassRate: detail.run.automationPassRate / 10_000,
            loadPassRate: detail.run.loadPassRate / 10_000,
            slaThresholdMs: detail.run.slaThresholdMs,
            slaCompliantCount: slaSummary.compliant,
            slaBreachCount: slaSummary.breach,
            slaExcludedCount: slaSummary.excluded,
          },
          slaThresholdMs: detail.run.slaThresholdMs,
          cases,
          featureSummary: Object.entries(
            detail.cases.reduce<Record<string, { passed: number; failed: number; total: number }>>(
              (acc, testCase) => {
                const bucket = acc[testCase.featureArea] ?? { passed: 0, failed: 0, total: 0 };
                bucket.total += 1;
                if (testCase.status === "passed") bucket.passed += 1;
                else if (testCase.status === "failed") bucket.failed += 1;
                acc[testCase.featureArea] = bucket;
                return acc;
              },
              {},
            ),
          ).map(([featureArea, counts]) => ({
            featureArea,
            label: FEATURE_LABELS[featureArea as FeatureArea] ?? featureArea,
            ...counts,
          })),
        };
      }
    }
  } catch {
    // DB may be unavailable during static build — client fetches via API when live
  }

  return (
    <QualityDashboardClient
      brandOrgName={brand.orgName}
      initialDate={initialDate}
      initialDates={dates}
      initialTrend={trend}
      initialDetail={initialDetail}
    />
  );
}
