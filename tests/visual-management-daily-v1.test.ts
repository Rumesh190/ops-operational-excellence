import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateKpiPerformance } from "@/features/visual-management/kpi-configuration";
import { setVisualManagementKpisForTests } from "@/features/visual-management/kpi-configuration-store";
import { assignKpiToBoard, getKpiExecution, moveBoardKpiAssignment, submitKpiActual, setKpiExecutionForTests } from "@/features/visual-management/kpi-execution-store";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const metric = (id: string, direction: "higher_is_better" | "lower_is_better" = "higher_is_better") => ({ id, level: "unit" as const, name: id, originalObjective: id, smartObjective: id, smartAnalysis: { specific: { status: "complete" as const, explanation: "x" }, measurable: { status: "complete" as const, explanation: "x" }, achievable: { status: "complete" as const, explanation: "x" }, relevant: { status: "complete" as const, explanation: "x" }, timely: { status: "complete" as const, explanation: "x" } }, bucket: "quality" as const, indicatorType: "lagging" as const, measurementType: "number" as const, direction, baseline: direction === "higher_is_better" ? 98 : 0, target: direction === "higher_is_better" ? 98 : 0, targetDate: "2026-12-31", performanceThreshold: direction === "higher_is_better" ? { direction, amberBoundary: 95 } : { direction, amberBoundary: 1 }, reviewFrequency: "daily" as const, status: "active" as const, createdAt: "2026-01-01", updatedAt: "2026-01-01" });

beforeEach(() => { let id = 0; vi.stubGlobal("window", undefined); vi.stubGlobal("crypto", { randomUUID: () => `${++id}2345678-daily-v1` }); setVisualManagementKpisForTests([metric("M1"), metric("M2", "lower_is_better")]); setKpiExecutionForTests({ assignments: [], actualEntries: [], deviations: [] }); });

describe("Visual Management Daily V1", () => {
  it("evaluates numeric and event/count metrics deterministically", () => {
    expect(evaluateKpiPerformance(98, "number", "higher_is_better", 98, { direction: "higher_is_better", amberBoundary: 95 })).toBe("green");
    expect(evaluateKpiPerformance(96, "number", "higher_is_better", 98, { direction: "higher_is_better", amberBoundary: 95 })).toBe("amber");
    expect(evaluateKpiPerformance(94, "number", "higher_is_better", 98, { direction: "higher_is_better", amberBoundary: 95 })).toBe("red");
    expect(evaluateKpiPerformance(0, "count", "lower_is_better", 0, { direction: "lower_is_better", amberBoundary: 1 })).toBe("green");
  });

  it("stores No Production / Holiday as an explicit neutral immutable entry", () => {
    assignKpiToBoard("BOARD", "M1", "USER");
    const result = submitKpiActual({ boardId: "BOARD", kpiId: "M1", value: 0, reportingPeriod: { type: "daily", key: "2026-10-03", label: "3 October 2026" }, reportedByUserId: "USER", neutralReason: "no_production_holiday" });
    expect(result).toMatchObject({ success: true, entry: { statusSnapshot: "unavailable", neutralReason: "no_production_holiday" } });
    expect(getKpiExecution().deviations).toHaveLength(0);
  });

  it("reorders board metrics without changing their definitions", () => {
    assignKpiToBoard("BOARD", "M1", "USER"); assignKpiToBoard("BOARD", "M2", "USER"); moveBoardKpiAssignment("BOARD", "M2", -1);
    expect(getKpiExecution().assignments.sort((a, b) => a.displayOrder - b.displayOrder).map((item) => item.kpiId)).toEqual(["M2", "M1"]);
  });

  it("reuses one definition with different board-specific targets and thresholds", () => {
    assignKpiToBoard("ZONE-A", "M1", "USER", { target: 98, performanceThreshold: { direction: "higher_is_better", amberBoundary: 95 } });
    assignKpiToBoard("ZONE-B", "M1", "USER", { target: 97, performanceThreshold: { direction: "higher_is_better", amberBoundary: 94 } });
    const a = submitKpiActual({ boardId: "ZONE-A", kpiId: "M1", value: 97, reportingPeriod: { type: "daily", key: "2026-10-03", label: "3 October 2026" }, reportedByUserId: "USER", deviationComment: "Rework", correctiveActionRequired: true });
    const b = submitKpiActual({ boardId: "ZONE-B", kpiId: "M1", value: 97, reportingPeriod: { type: "daily", key: "2026-10-03", label: "3 October 2026" }, reportedByUserId: "USER" });
    expect(a).toMatchObject({ success: true, entry: { targetSnapshot: 98, statusSnapshot: "amber" } });
    expect(b).toMatchObject({ success: true, entry: { targetSnapshot: 97, statusSnapshot: "green" } });
    expect(new Set(getKpiExecution().assignments.map((item) => item.kpiId))).toEqual(new Set(["M1"]));
  });

  it("uses one-screen meeting validation and canonical Action creation", () => {
    const source = read("features/visual-management/daily-management-meeting-workspace.tsx");
    expect(source).toContain("assigned.map"); expect(source).toContain("evaluateKpiPerformance"); expect(source).toContain("No Production / Holiday"); expect(source).toContain("Complete the following:"); expect(source).toContain("createCanonicalLinkedAction"); expect(source).toContain("linkDeviationAction"); expect(source).toContain("visualManagementSource"); expect(source).toContain("Select an Action owner.");
    expect(source).not.toMatch(/reporting period key|actual-entry ID|deviation ID/i);
  });

  it("uses the meeting-board card layout and only expands exception fields for Amber or Red", () => {
    const source = read("features/visual-management/daily-management-meeting-workspace.tsx");
    expect(source).toContain("const grouped = useMemo");
    expect(source).toContain("assigned.forEach");
    expect(source).toContain("metrics.map");
    expect(source).toContain("needsException");
    expect(source).toContain("Attendance");
    expect(source).toContain("KPI Review");
    expect(source).toContain("Meeting Summary");
    expect(source).toContain("Previous Actions");
    expect(source).toContain("2xl:grid-cols-5");
    expect(source).toContain('CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"');
    expect(source).toContain('<p className="mt-3 text-sm text-muted-foreground">{kpi.name}</p>');
    expect(source).not.toContain("VMK-DM-");
    expect(source).not.toContain("PageFormActionBar");
  });

  it("uses an explicit neutral-state checkbox instead of an Actual state dropdown", () => {
    const source = read("features/visual-management/daily-management-meeting-workspace.tsx");
    expect(source).toContain("<Checkbox");
    expect(source).toContain("checked={neutral}");
    expect(source).toContain("disabled={Boolean(existing)}");
    expect(source).toContain("No Production / Holiday");
    expect(source).not.toContain("DropdownMenuTrigger");
    expect(source).not.toContain("Ellipsis");
    expect(source).toContain('className="h-11 w-full"');
    expect(source).not.toContain('<SelectItem value="actual">Actual</SelectItem>');
  });

  it("keeps regular KPI cards compact and uses one Action owner selector for exceptions", () => {
    const source = read("features/visual-management/daily-management-meeting-workspace.tsx");
    expect(source).toContain("What happened? *");
    expect(source).toContain("Briefly explain why this KPI is outside target.");
    expect(source).toContain("Select action owner");
    expect(source).toContain("— Assign to me");
    expect(source).toContain("board.members.find((member) => member.id === draft.responsibleId)?.name");
    expect(source).not.toContain("selectedKpiByBucket");
    expect(source).not.toContain('min-h-[520px]');
  });

  it("ships idempotent, additive Zone A and Zone B demo execution data", () => {
    const source = read("features/visual-management/kpi-execution-store.ts");
    expect(source).toContain('const PRIMARY_DEMO_IDS');
    expect(source).toContain('const ZONE_B_DEMO_IDS');
    expect(source).toContain('function mergeDemoState');
    expect(source).toContain('VMKAE-DEMO-');
    expect(source).toContain('VMK-DM-FPY');
    expect(source).toContain('no_production_holiday');
    expect(source).toContain('!current.assignments.some');
    expect(source).toContain('!current.actualEntries.some');
  });

  it("uses one wide board workspace with inline metric configuration", () => {
    const source = read("features/settings/visual-management-settings-pages.tsx");
    expect(source).toContain("BoardMetricsManager"); expect(source).toContain("Add Metric"); expect(source).toContain("Event / Incident"); expect(source).toContain("moveBoardKpiAssignment");
    const editor = source.slice(source.indexOf("function BoardEditor"), source.indexOf("function SettingsSections"));
    expect(editor).toContain("Configure the board and metrics used in meetings.");
    expect(editor).toContain("Board Metrics");
    expect(editor).toContain('w-[calc(100vw-3rem)]');
    expect(editor).toContain('max-w-[60rem]');
    expect(editor).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(editor).toContain("InlineBoardMetricEditor");
    expect(editor).not.toContain("BoardMetricDialog");
    expect(editor).not.toContain('Dialog open onOpenChange={(open) => { if (!open) onClose(); }}');
    expect(editor).toContain("Select a zone to derive the department");
    expect(editor).toContain("entry.name");
    expect(editor).toContain("user.name");
    expect(editor).toContain(">Edit</Button>");
    expect(editor).toContain(">Remove</Button>");
    expect(editor).not.toMatch(/Field label="Tier"|Field label="Plant"|KPI hierarchy|SMART/);
  });

  it("uses one wide, human-readable reusable KPI form for both creation and editing", () => {
    const source = read("features/settings/visual-management-settings-pages.tsx");
    const dialog = source.slice(source.indexOf("function ReusableMetricDialog"), source.indexOf("export function VisualManagementTierSettingsPage"));
    expect(dialog).toContain('w-[calc(100vw-3rem)]');
    expect(dialog).toContain('max-w-[56rem]');
    expect(dialog).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(dialog).toContain('grid gap-x-6 gap-y-4 sm:grid-cols-2');
    expect(dialog).toContain('placeholder="Percentage (%), Count, Units / shift"');
    expect(dialog).toContain("KPI_BUCKET_LABELS[value]");
    expect(dialog).toContain("KPI_MEASUREMENT_LABELS[value]");
    expect(dialog).toContain("KPI_DIRECTION_LABELS[value]");
    expect(dialog).toContain('value="numeric">Numeric');
    expect(dialog).toContain('value="event">Event / Incident');
    expect(dialog).toContain("Enter a metric name.");
    expect(dialog).toContain("Enter a unit.");
    expect(dialog).toContain("saveReusableVisualManagementMetric({ id: created ? undefined : item.id, name, category, metricType, measurementType, unit, direction })");
  });

  it("derives daily, weekly, and monthly dashboard summaries from actual entries", () => {
    const source = read("features/visual-management/configured-kpi-board.tsx");
    expect(source).toContain("aggregateMetric"); expect(source).toContain('periodView === "weekly"'); expect(source).toContain('kpi.aggregation === "sum"'); expect(source).toContain("!entry.neutralReason"); expect(source).toContain("HistoryDialog");
  });
});
