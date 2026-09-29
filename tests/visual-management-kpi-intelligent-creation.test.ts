import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyConfirmedKpiAnswers, formatKpiNumericValue, getKpiThresholdPresentation, parseKpiAnalysis, validateKpiDefinition, type KpiAnalysisResult, type VisualManagementKpiDefinition } from "@/features/visual-management/kpi-configuration";

const smart: KpiAnalysisResult["smart"] = Object.fromEntries(["specific", "measurable", "achievable", "relevant", "timely"].map((key) => [key, { status: "complete", explanation: "Supported" }])) as KpiAnalysisResult["smart"];
const response = (overrides: Record<string, unknown> = {}) => ({ smart, complete: false, suggestedKpiName: "Customer Complaint Rate", suggestedBucket: "quality", suggestedIndicatorType: "lagging", suggestedMeasurementType: "number", suggestedDirection: "lower_is_better", suggestedReviewFrequency: "weekly", extractedFacts: { baseline: null, target: null, targetDate: null, measurementContext: null }, missingFacts: ["baseline", "target", "targetDate", "measurementContext"], followUpQuestions: [
  { id: "baseline", factKey: "baseline", label: "What is the current rate?", inputType: "number", required: true },
  { id: "target", factKey: "target", label: "What rate do you want to achieve?", inputType: "number", required: true },
  { id: "date", factKey: "targetDate", label: "By when?", inputType: "date", required: true },
  { id: "context", factKey: "measurementContext", label: "How is it measured?", inputType: "text", required: true },
], draftSmartObjective: "Reduce customer complaints.", ...overrides });

describe("intelligent KPI creation", () => {
  it("separates inferred semantics from missing business facts", () => {
    const parsed = parseKpiAnalysis(response());
    expect(parsed).toMatchObject({ suggestedKpiName: "Customer Complaint Rate", suggestedBucket: "quality", suggestedIndicatorType: "lagging", suggestedMeasurementType: "number", suggestedDirection: "lower_is_better", extractedFacts: { baseline: null, target: null, targetDate: null }, complete: false });
    expect(parsed?.questions.map((question) => question.factKey)).toEqual(["baseline", "target", "targetDate", "measurementContext"]);
  });

  it("accepts complete facts extracted from an objective without follow-up", () => {
    const parsed = parseKpiAnalysis(response({ complete: true, extractedFacts: { baseline: 4.2, target: 2, targetDate: "2027-03-31", measurementContext: "complaints per 1,000 units" }, missingFacts: [], followUpQuestions: [] }));
    expect(parsed).toMatchObject({ complete: true, extractedFacts: { baseline: 4.2, target: 2, targetDate: "2027-03-31" }, questions: [] });
  });

  it("keeps confirmed follow-up answers authoritative during re-analysis", () => {
    const parsed = parseKpiAnalysis(response({ extractedFacts: { baseline: 999, target: 999, targetDate: "2099-01-01", measurementContext: null } }));
    expect(parsed).not.toBeNull();
    const merged = applyConfirmedKpiAnswers(parsed!, { baseline: "4.2", target: "2", targetDate: "2027-03-31", measurementContext: "complaints per 1,000 units" });
    expect(merged.extractedFacts).toEqual({ baseline: 4.2, target: 2, targetDate: "2027-03-31", measurementContext: "complaints per 1,000 units" });
    expect(merged).toMatchObject({ complete: true, missingFacts: [], questions: [] });
  });

  it("derives presentation only from a user-confirmed valid threshold and never renders NaN", () => {
    expect(formatKpiNumericValue(Number.NaN, "number")).toBe("Not provided");
    expect(getKpiThresholdPresentation({ direction: "lower_is_better", target: 2, measurementType: "number", performanceThreshold: { direction: "lower_is_better", amberBoundary: 3 } })).toEqual({ green: "≤ 2", amber: "> 2 and ≤ 3", red: "> 3" });
    expect(getKpiThresholdPresentation({ direction: "lower_is_better", target: Number.NaN, measurementType: "number", performanceThreshold: { direction: "lower_is_better", amberBoundary: 3 } })).toBeNull();
  });

  it("blocks domain creation when facts, owner, or threshold are missing", () => {
    const candidate = { id: "preview", level: "functional", name: "First Pass Yield", originalObjective: "Improve FPY", smartObjective: "Improve FPY.", smartAnalysis: smart, bucket: "quality", indicatorType: "leading", measurementType: "percentage", direction: "higher_is_better", baseline: Number.NaN, target: Number.NaN, targetDate: "", parentKpiId: "missing", functionName: "Quality", ownerUserId: "", reviewFrequency: "weekly", status: "active", createdAt: "", updatedAt: "" } as VisualManagementKpiDefinition;
    const errors = validateKpiDefinition(candidate, []);
    expect(errors).toMatchObject({ baseline: expect.any(String), target: expect.any(String), targetDate: expect.any(String), performanceThreshold: expect.any(String), parentKpiId: expect.any(String), ownerUserId: expect.any(String) });
  });

  it("keeps objective-first UI, optional manual editing, functional context, and viewport-safe dialog", () => {
    const root = process.cwd(); const page = fs.readFileSync(path.join(root, "features/settings/visual-management-kpi-configuration-page.tsx"), "utf8"); const route = fs.readFileSync(path.join(root, "app/api/visual-management/kpi/analyze/route.ts"), "utf8");
    expect(page).toContain("Describe your objective"); expect(page).toContain("Generated KPI"); expect(page).toContain("Edit details"); expect(page).toContain("Continue manually"); expect(page).toContain("max-h-[calc(100dvh-1rem)]"); expect(page).toContain("overflow-y-auto");
    expect(page).toContain("functionName"); expect(page).toContain("parent:"); expect(route).toContain("Never copy numeric values or dates from examples"); expect(route).toContain("can contribute to");
  });
});
