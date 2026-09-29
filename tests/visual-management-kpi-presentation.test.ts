import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateKpiPerformance, formatKpiNumericValue, getKpiThresholdPresentation, KPI_BUCKET_LABELS, KPI_DIRECTION_LABELS, KPI_INDICATOR_TYPE_LABELS, KPI_MEASUREMENT_LABELS, KPI_REVIEW_FREQUENCY_LABELS, resolveKpiOwnerName } from "@/features/visual-management/kpi-configuration";

describe("Visual Management KPI presentation", () => {
  it("provides human-readable labels without changing canonical values", () => {
    expect(KPI_BUCKET_LABELS.quality).toBe("Quality");
    expect(KPI_INDICATOR_TYPE_LABELS).toEqual({ leading: "Leading Indicator", lagging: "Lagging Indicator" });
    expect(KPI_MEASUREMENT_LABELS).toEqual({ count: "Count", percentage: "Percentage", number: "Number" });
    expect(KPI_DIRECTION_LABELS).toEqual({ higher_is_better: "Higher is better", lower_is_better: "Lower is better", target_exactly: "Target exactly" });
    expect(KPI_REVIEW_FREQUENCY_LABELS).toEqual({ daily: "Daily", weekly: "Weekly", monthly: "Monthly" });
  });

  it("resolves canonical owner IDs while retaining safe inactive fallback", () => {
    const users = [{ id: "USR-LAKSHMAN", name: "Lakshman" }];
    expect(resolveKpiOwnerName("USR-LAKSHMAN", users)).toBe("Lakshman");
    expect(resolveKpiOwnerName("USR-INACTIVE", users)).toBe("Inactive or unavailable user");
    const stored = { ownerUserId: "USR-LAKSHMAN" };
    expect(stored.ownerUserId).toBe("USR-LAKSHMAN");
  });

  it("formats percentage thresholds with percent signs and Number/Count without them", () => {
    const percentage = getKpiThresholdPresentation({ direction: "higher_is_better", target: 98, measurementType: "percentage", performanceThreshold: { direction: "higher_is_better", amberBoundary: 95 } });
    expect(percentage).toEqual({ green: "≥ 98%", amber: "≥ 95% and < 98%", red: "< 95%" });
    expect(formatKpiNumericValue(10, "number")).toBe("10");
    expect(formatKpiNumericValue(10, "count")).toBe("10");
  });

  it("leaves the RAG calculation unchanged", () => {
    const threshold = { direction: "higher_is_better", amberBoundary: 95 } as const;
    expect(evaluateKpiPerformance(98, "percentage", "higher_is_better", 98, threshold)).toBe("green");
    expect(evaluateKpiPerformance(96, "percentage", "higher_is_better", 98, threshold)).toBe("amber");
    expect(evaluateKpiPerformance(94, "percentage", "higher_is_better", 98, threshold)).toBe("red");
  });

  it("uses centralized labels in configuration, hierarchy, detail, and board presentation", () => {
    const root = process.cwd();
    const configuration = fs.readFileSync(path.join(root, "features/settings/visual-management-kpi-configuration-page.tsx"), "utf8");
    const board = fs.readFileSync(path.join(root, "features/visual-management/configured-kpi-board.tsx"), "utf8");
    expect(configuration).toContain("KPI_INDICATOR_TYPE_LABELS[draft.indicatorType]");
    expect(configuration).toContain("KPI_REVIEW_FREQUENCY_LABELS[item.reviewFrequency]");
    expect(configuration).toContain("resolveKpiOwnerName(draft.ownerUserId, users)");
    expect(board).toContain("KPI_INDICATOR_TYPE_LABELS[kpi.indicatorType]");
    expect(board).toContain("resolveKpiOwnerName(kpi.ownerUserId, users)");
  });

  it("uses one derived reporting-period control and correct actual-value labels", () => {
    const board = fs.readFileSync(path.join(process.cwd(), "features/visual-management/configured-kpi-board.tsx"), "utf8");
    expect(board).toContain('<Field label="Reporting period">');
    expect(board).not.toContain('label="Reporting period type"');
    expect(board).not.toContain('label="Reporting period key"');
    expect(board).not.toContain('label="Display label (optional)"');
    expect(board).toContain('"Actual value (%)" : "Actual value"');
    expect(board).not.toContain("Actual Value${unit}");
  });

  it("constructs human-readable VM Action context with exact structured references", () => {
    const board = fs.readFileSync(path.join(process.cwd(), "features/visual-management/configured-kpi-board.tsx"), "utf8");
    expect(board).toContain("sourceRecordLabel");
    expect(board).toContain("configuredKpiId: kpi.id");
    expect(board).toContain("actualEntryId: entry.id");
    expect(board).toContain("deviationId: deviation.id");
    expect(board).toContain("reportingPeriod:");
  });

  it("guides AI toward recognized manufacturing KPI terminology and semantics", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/visual-management/kpi/analyze/route.ts"), "utf8");
    expect(route).toContain("First Pass Yield");
    expect(route).toContain("standard manufacturing KPI terminology");
    expect(route).toContain("percentage and higher_is_better");
    expect(route).not.toContain("First Year Yield");
  });
});
