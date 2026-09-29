import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseDriverSuggestions, parseKpiAnalysis, type KpiAnalysisResult, type VisualManagementKpiDefinition } from "@/features/visual-management/kpi-configuration";
import { archiveVisualManagementKpi, getVisualManagementKpis, saveVisualManagementKpi, setVisualManagementKpisForTests } from "@/features/visual-management/kpi-configuration-store";

const smart: KpiAnalysisResult["smart"] = {
  specific: { status: "complete", explanation: "Clear outcome" }, measurable: { status: "complete", explanation: "Numeric target" }, achievable: { status: "complete", explanation: "Baseline supplied" }, relevant: { status: "complete", explanation: "Quality objective" }, timely: { status: "complete", explanation: "Target date supplied" },
};
const base = { name: "Customer Complaint Rate", originalObjective: "Reduce complaints", smartObjective: "Reduce complaints from 4.2 to 2.0 by 31 March 2027.", smartAnalysis: smart, bucket: "quality", indicatorType: "lagging", measurementType: "number", direction: "lower_is_better", baseline: 4.2, target: 2, targetDate: "2027-03-31", performanceThreshold: { direction: "lower_is_better", amberBoundary: 3 }, status: "active" } as const;

beforeEach(() => { vi.stubGlobal("window", undefined); setVisualManagementKpisForTests([]); });

describe("Visual Management V2 KPI configuration", () => {
  it("creates stable Unit and Functional levels with multiple children", () => {
    const unit = saveVisualManagementKpi({ ...base, level: "unit" }); expect(unit.success).toBe(true); if (!unit.success) return;
    const child = (name: string) => saveVisualManagementKpi({ ...base, level: "functional" as const, name, parentKpiId: unit.record.id, functionName: "Quality", ownerUserId: "USR-RUMESH", reviewFrequency: "daily", indicatorType: "leading", measurementType: "percentage", direction: "higher_is_better", baseline: 94.5, target: 98, performanceThreshold: { direction: "higher_is_better" as const, amberBoundary: 95 } });
    expect(child("First Pass Yield").success).toBe(true); expect(child("Process Compliance").success).toBe(true);
    expect(getVisualManagementKpis().filter((item) => item.parentKpiId === unit.record.id)).toHaveLength(2);
    const originalId = unit.record.id; const edited = saveVisualManagementKpi({ ...unit.record, name: "Complaint Rate" });
    expect(edited.success && edited.record.id).toBe(originalId);
  });

  it("rejects orphan Functional KPIs, unsupported measurements, and invalid percentages", () => {
    const orphan = saveVisualManagementKpi({ ...base, level: "functional", parentKpiId: "missing", functionName: "Quality", ownerUserId: "USR-RUMESH", reviewFrequency: "weekly" });
    expect(orphan.success).toBe(false); if (!orphan.success) expect(orphan.errors.parentKpiId).toBeTruthy();
    const unsupported = saveVisualManagementKpi({ ...base, level: "unit", measurementType: "currency" as VisualManagementKpiDefinition["measurementType"] });
    expect(unsupported.success).toBe(false);
    const percentage = saveVisualManagementKpi({ ...base, level: "unit", measurementType: "percentage", baseline: 101 }); expect(percentage.success).toBe(false);
  });

  it("prevents parent changes and blocks archiving a Unit KPI with active children", () => {
    const first = saveVisualManagementKpi({ ...base, level: "unit" }); const second = saveVisualManagementKpi({ ...base, level: "unit", name: "Second" }); if (!first.success || !second.success) return;
    const child = saveVisualManagementKpi({ ...base, level: "functional", name: "FPY", parentKpiId: first.record.id, functionName: "Quality", ownerUserId: "USR-RUMESH", reviewFrequency: "monthly" }); if (!child.success) return;
    expect(saveVisualManagementKpi({ ...child.record, parentKpiId: second.record.id }).success).toBe(false);
    expect(archiveVisualManagementKpi(first.record.id)).toMatchObject({ success: false, error: "This Unit KPI has Functional KPIs connected." });
  });

  it("strictly validates structured SMART output and driver suggestions", () => {
    const valid = { smart, complete: false, extractedFacts: { baseline: 4.2, target: null, targetDate: null, measurementContext: "complaints per 1,000 units" }, missingFacts: ["target", "targetDate"], followUpQuestions: [{ id: "target", factKey: "target", label: "What target is required?", inputType: "number", required: true }], suggestedKpiName: "Complaint Rate", suggestedBucket: "quality", suggestedIndicatorType: "lagging", suggestedMeasurementType: "number", suggestedDirection: "lower_is_better", draftSmartObjective: "Reduce complaints." };
    expect(parseKpiAnalysis(valid)).toMatchObject({ complete: false, suggestedBucket: "quality", extractedFacts: { baseline: 4.2, target: null }, questions: [{ factKey: "target" }] });
    expect(parseKpiAnalysis({ ...valid, suggestedBucket: "invented" })).toBeNull();
    expect(parseKpiAnalysis("invalid JSON shape")).toBeNull();
    expect(parseDriverSuggestions({ suggestions: [{ name: "First Pass Yield", description: "Reduces escaped defects." }] })).toHaveLength(1);
  });

  it("keeps AI server-side, settings primary, and existing VM persistence independent", () => {
    const root = process.cwd(); const route = fs.readFileSync(path.join(root, "app/api/visual-management/kpi/analyze/route.ts"), "utf8"); const page = fs.readFileSync(path.join(root, "features/settings/visual-management-kpi-configuration-page.tsx"), "utf8"); const store = fs.readFileSync(path.join(root, "features/visual-management/kpi-configuration-store.ts"), "utf8");
    expect(route).toContain("getGroqApiKey"); expect(route).not.toContain("NEXT_PUBLIC_GROQ"); expect(route).toContain("AI analysis is temporarily unavailable.");
    expect(page).toContain("Unit KPIs"); expect(page).toContain("Functional KPIs"); expect(page).toContain("Preview");
    expect(store).toContain("ops-visual-management-kpis-v1"); expect(store).not.toContain("ops-visual-management-v1");
  });
});
