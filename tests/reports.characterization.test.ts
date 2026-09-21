import { describe, expect, it } from "vitest";

import { CONTINUOUS_IMPROVEMENT_SEED_RECORDS } from "@/features/five-s/continuous-improvement/store";
import { FIVE_S_AUDITS } from "@/features/five-s/data/five-s-data";
import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { GEMBA_SEED_STATE } from "@/features/gemba/gemba-store";
import { RED_FLAG_SEED_FLAGS } from "@/features/red-flag/red-flag-store";
import {
  buildReportLibrary,
  filterReportLibrary,
  getEnabledReportModules,
  type ReportLibraryFilters,
} from "@/features/reports/report-data";
import { REPORT_MODULES, REPORT_TYPE_REGISTRY } from "@/features/reports/report-registry";
import { buildReportSummary, reportSummaryToCsv } from "@/features/reports/report-summary-data";
import { VISUAL_IMPROVEMENT_SEED_RECORDS } from "@/features/visual-improvement/visual-improvement-store";
import { VISUAL_MANAGEMENT_INITIAL_STATE } from "@/features/visual-management/visual-management-store";
import type { OrganizationAccess } from "@/lib/module-entitlements";
import type { AccessCapabilityId } from "@/lib/modules";

const CAPABILITIES: AccessCapabilityId[] = ["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"];
const NOW = new Date("2026-09-14T18:00:00+05:30");

function access(disabled: AccessCapabilityId[] = []): OrganizationAccess {
  return Object.fromEntries(CAPABILITIES.map((id) => [id, !disabled.includes(id)])) as OrganizationAccess;
}

function input(entitlements = access()) {
  return {
    audits: FIVE_S_AUDITS,
    actions: MY_ACTIONS,
    improvements: [...CONTINUOUS_IMPROVEMENT_SEED_RECORDS],
    redFlags: RED_FLAG_SEED_FLAGS,
    visualImprovements: [...VISUAL_IMPROVEMENT_SEED_RECORDS],
    visualManagement: VISUAL_MANAGEMENT_INITIAL_STATE,
    gemba: GEMBA_SEED_STATE,
    access: entitlements,
    now: NOW,
  };
}

describe("Unified OPS reports", () => {
  it("orders report modules by the operational excellence model", () => {
    expect(REPORT_MODULES.map((module) => module.id)).toEqual([
      "gemba", "redFlag", "continuousImprovement", "audit", "actions", "visualManagement",
    ]);
  });

  it("registers every requested report category in one registry", () => {
    expect(REPORT_TYPE_REGISTRY).toHaveLength(14);
    expect(REPORT_TYPE_REGISTRY.map((report) => report.label)).toEqual(expect.arrayContaining([
      "Audit Report", "Non-Compliance Summary", "Before & After Summary", "Action Report", "Completed Action Report",
      "Overdue Action Summary", "Improvement Report", "Benefit / Savings Summary", "Red Flag Report", "Closure Report",
      "Visual Management Meeting Report", "Gemba Walk Report", "Observation Summary", "Gemba Action Summary",
    ]));
    expect(REPORT_TYPE_REGISTRY.map((report) => report.module)).not.toContain("visualImprovement");
    expect(REPORT_TYPE_REGISTRY.every((report) => report.supportsExcel === false)).toBe(true);
  });

  it("builds the report library from all six source modules without duplicating report records", () => {
    const library = buildReportLibrary(input());

    expect(new Set(library.map((report) => report.module))).toEqual(new Set(REPORT_MODULES.map((module) => module.id)));
    expect(library.some((report) => report.previewHref.includes("/5s/audits/") && report.sourceHref.startsWith("/audits?audit="))).toBe(true);
    expect(library.some((report) => report.previewHref.includes("/actions/") && report.previewHref.includes("/report"))).toBe(true);
    expect(library.some((report) => report.reportTypeId === "actionReport" && report.previewHref.startsWith("/reports/action/"))).toBe(true);
    expect(library.some((report) => report.previewHref.includes("/continuous-improvement/") && report.previewHref.includes("/report"))).toBe(true);
    expect(library.some((report) => report.previewHref.includes("/red-flag/") && report.previewHref.includes("/report"))).toBe(true);
    expect(library.some((report) => report.module === "visualManagement" && report.previewHref.includes("/visual-management/meetings/"))).toBe(true);
    expect(library.some((report) => report.module === "visualImprovement")).toBe(false);
    expect(library.some((report) => report.previewHref.includes("/gemba/") && report.previewHref.includes("/report"))).toBe(true);
  });

  it("removes disabled modules from tabs and the report library while preserving the source data", () => {
    const entitlements = access(["gemba", "visualManagement"]);
    const library = buildReportLibrary(input(entitlements));

    expect(getEnabledReportModules(entitlements).map((module) => module.id)).not.toEqual(expect.arrayContaining(["gemba", "visualManagement", "visualImprovement"]));
    expect(library.map((report) => report.module)).not.toEqual(expect.arrayContaining(["gemba", "visualManagement", "visualImprovement"]));
    expect(GEMBA_SEED_STATE.walks.length).toBeGreaterThan(0);
    expect(VISUAL_IMPROVEMENT_SEED_RECORDS.length).toBeGreaterThan(0);
  });

  it("filters search, module, plant, zone, person, date, status, and sort deterministically", () => {
    const library = buildReportLibrary(input());
    const filters: ReportLibraryFilters = {
      search: "Egmore", module: "gemba", plant: "Egmore Plant", zone: "Zone B",
      dateFrom: "2026-09-01", dateTo: "2026-09-30", generatedBy: "Rumesh", status: "Final", sort: "Oldest",
    };
    const filtered = filterReportLibrary(library, filters);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((report) => report.module === "gemba" && report.zone === "Zone B" && report.generatedBy === "Rumesh" && report.status === "Final")).toBe(true);
    expect(filtered.map((report) => report.date)).toEqual([...filtered.map((report) => report.date)].sort());
  });

  it("builds real CSV-backed data summaries and paired evidence", () => {
    const source = input();
    const nonCompliance = buildReportSummary("nonComplianceSummary", source);
    const beforeAfter = buildReportSummary("beforeAfterSummary", source);
    const gembaActions = buildReportSummary("gembaActionSummary", source);

    expect(nonCompliance?.columns.map((column) => column.label)).toEqual([
      "Audit", "Question", "5S Stage / Category", "Zone", "Observation", "Severity", "Action", "Status",
    ]);
    expect(nonCompliance?.rows.length).toBeGreaterThan(0);
    expect(reportSummaryToCsv(nonCompliance!)).toContain("5S Stage / Category");
    expect(beforeAfter?.evidencePairs?.length).toBeGreaterThan(0);
    expect(beforeAfter?.rows[0]).toHaveProperty("before");
    expect(beforeAfter?.rows[0]).toHaveProperty("after");
    expect(gembaActions?.rows.some((row) => row.action.startsWith("ACT-GEM"))).toBe(true);
  });
});
