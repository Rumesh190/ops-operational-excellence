import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatNaturalKpiDate, normalizeKpiAnalysisForContext, parseDriverSuggestions, parseKpiAnalysis, resolveKpiOwnerName, validateKpiDefinition, type KpiAnalysisResult, type VisualManagementKpiDefinition } from "@/features/visual-management/kpi-configuration";

const smart: KpiAnalysisResult["smart"] = Object.fromEntries(["specific", "measurable", "achievable", "relevant", "timely"].map((key) => [key, { status: "complete", explanation: "Supported" }])) as KpiAnalysisResult["smart"];
function analysis(overrides: Record<string, unknown> = {}) { return parseKpiAnalysis({ smart, complete: true, suggestedKpiName: "First Pass Yield", suggestedBucket: "quality", suggestedIndicatorType: "lagging", suggestedMeasurementType: "number", suggestedDirection: "lower_is_better", suggestedReviewFrequency: "monthly", extractedFacts: { baseline: 94.5, target: 98, targetDate: "2026-12-31", measurementContext: "All production lines" }, missingFacts: [], followUpQuestions: [], draftSmartObjective: "Increase First Pass Yield from 94.5% to 98% by 2026-12-31.", relationshipExplanation: "Higher FPY directly reduces complaints.", ...overrides })!; }

describe("Functional KPI manual acceptance fixes", () => {
  it("normalizes an upstream Functional FPY driver to Leading, Percentage, and Higher is better", () => {
    const result = normalizeKpiAnalysisForContext(analysis(), { level: "functional", driver: "First Pass Yield", parentName: "Customer Complaint Rate", functionName: "Quality" });
    expect(result).toMatchObject({ suggestedIndicatorType: "leading", suggestedMeasurementType: "percentage", suggestedDirection: "higher_is_better", suggestedReviewFrequency: "monthly" });
  });

  it("keeps Unit indicator inference and canonical ISO storage unchanged", () => {
    const result = normalizeKpiAnalysisForContext(analysis(), { level: "unit" });
    expect(result.suggestedIndicatorType).toBe("lagging");
    expect(result.extractedFacts.targetDate).toBe("2026-12-31");
  });

  it("uses natural dates in generated prose", () => {
    const result = normalizeKpiAnalysisForContext(analysis(), { level: "functional", driver: "First Pass Yield", parentName: "Customer Complaint Rate" });
    expect(formatNaturalKpiDate("2026-12-31")).toBe("31 December 2026");
    expect(result.draftSmartObjective).toContain("31 December 2026");
    expect(result.draftSmartObjective).not.toContain("2026-12-31");
  });

  it("neutralizes unsupported hints but allows the safe percent unit for FPY", () => {
    const raw = analysis({ complete: false, extractedFacts: { baseline: null, target: null, targetDate: null, measurementContext: null }, missingFacts: ["baseline", "target", "measurementContext"], followUpQuestions: [
      { id: "b", factKey: "baseline", label: "Current", helperText: "complaints per month", unitHint: "complaints/month", inputType: "number", required: true },
      { id: "t", factKey: "target", label: "Target", helperText: "percentage reduction", unitHint: "%", inputType: "number", required: true },
      { id: "m", factKey: "measurementContext", label: "Context", helperText: "per 1,000 units", inputType: "text", required: true },
    ] });
    const result = normalizeKpiAnalysisForContext(raw, { level: "functional", driver: "First Pass Yield", parentName: "Customer Complaint Rate" });
    expect(result.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ factKey: "baseline", helperText: "Enter the current value", unitHint: "%" }),
      expect.objectContaining({ factKey: "target", helperText: "Enter the target value", unitHint: "%" }),
      expect.objectContaining({ factKey: "measurementContext", helperText: "Describe how this KPI is measured", unitHint: undefined }),
    ]));
    expect(JSON.stringify(result.questions)).not.toMatch(/per month|complaints\/month|per 1,000/);
  });

  it("softens deterministic driver and relationship wording", () => {
    expect(parseDriverSuggestions({ suggestions: [{ name: "First Pass Yield", description: "Directly reducing customer complaints and ensures quality." }] })?.[0].description).toBe("can contribute to reducing customer complaints and can support quality.");
    const result = normalizeKpiAnalysisForContext(analysis(), { level: "functional", driver: "First Pass Yield", parentName: "Customer Complaint Rate" });
    expect(result.relationshipExplanation).toContain("can contribute to reducing");
    expect(result.relationshipExplanation).not.toMatch(/directly reduces|guarantees|ensures/i);
  });

  it("requires explicit canonical owner selection before review or creation", () => {
    const candidate = { id: "preview", level: "functional", name: "First Pass Yield", originalObjective: "Improve First Pass Yield", smartObjective: "Increase First Pass Yield by 31 December 2026.", smartAnalysis: smart, bucket: "quality", indicatorType: "leading", measurementType: "percentage", direction: "higher_is_better", baseline: 94.5, target: 98, targetDate: "2026-12-31", performanceThreshold: { direction: "higher_is_better", amberBoundary: 95 }, parentKpiId: "UNIT", functionName: "Quality", ownerUserId: "", reviewFrequency: "monthly", status: "active", createdAt: "", updatedAt: "" } as VisualManagementKpiDefinition;
    const parent = { ...candidate, id: "UNIT", level: "unit", parentKpiId: undefined, ownerUserId: undefined, reviewFrequency: undefined } as VisualManagementKpiDefinition;
    expect(validateKpiDefinition(candidate, [parent]).ownerUserId).toBeTruthy();
    expect(validateKpiDefinition({ ...candidate, ownerUserId: "USR-LAKSHMAN" }, [parent]).ownerUserId).toBeUndefined();
    expect(resolveKpiOwnerName("USR-LAKSHMAN", [{ id: "USR-LAKSHMAN", name: "Lakshman" }])).toBe("Lakshman");
  });

  it("keeps canonical selector values internal and waits for an explicit driver choice", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "features/settings/visual-management-kpi-configuration-page.tsx"), "utf8");
    expect(page).toContain('value={draft.parentKpiId || null}');
    expect(page).toContain('`${parent.name} · ${KPI_BUCKET_LABELS[parent.bucket]} · Unit KPI`');
    expect(page).toContain('const [selectedDriver, setSelectedDriver] = useState("")');
    expect(page).toContain('setSelectedDriver(item.name)');
    expect(page).toContain('"Describe the result this Functional KPI should achieve."');
    expect(page).not.toContain('placeholder={draft.level === "unit" ? "Reduce customer complaints from 4.2 complaints per 1,000 units to 2.0 or fewer by March 2027." : "Increase First Pass Yield');
    expect(page).toContain('value={draft.ownerUserId || null}');
    expect(page).toContain('placeholder="Select owner"');
  });
});
