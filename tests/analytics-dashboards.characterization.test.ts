import { describe, expect, it } from "vitest";

import { buildAnalyticsModel, buildUnifiedPerformanceView } from "@/features/analytics/analytics-data";
import { CONTINUOUS_IMPROVEMENT_SEED_RECORDS } from "@/features/five-s/continuous-improvement/store";
import { FIVE_S_AUDITS } from "@/features/five-s/data/five-s-data";
import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { GEMBA_SEED_STATE } from "@/features/gemba/gemba-store";
import { RED_FLAG_SEED_FLAGS } from "@/features/red-flag/red-flag-store";
import { VISUAL_IMPROVEMENT_SEED_RECORDS } from "@/features/visual-improvement/visual-improvement-store";
import { VISUAL_MANAGEMENT_INITIAL_STATE } from "@/features/visual-management/visual-management-store";
import type { AccessCapabilityId } from "@/lib/modules";

const IDS: AccessCapabilityId[] = ["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"];

function access(enabled: AccessCapabilityId[]) {
  return Object.fromEntries(IDS.map((id) => [id, enabled.includes(id)])) as Record<AccessCapabilityId, boolean>;
}

function model(enabled: AccessCapabilityId[], plant = "All") {
  return buildAnalyticsModel({
    audits: FIVE_S_AUDITS,
    actions: MY_ACTIONS,
    improvements: CONTINUOUS_IMPROVEMENT_SEED_RECORDS,
    redFlags: RED_FLAG_SEED_FLAGS,
    visualImprovements: VISUAL_IMPROVEMENT_SEED_RECORDS,
    visualManagement: VISUAL_MANAGEMENT_INITIAL_STATE,
    gemba: GEMBA_SEED_STATE,
    access: access(enabled),
    filters: { plant, zone: "All", period: "90d" },
    now: new Date("2026-09-14T18:00:00+05:30"),
  });
}

describe("Analytics dashboards", () => {
  it("provides every requested dashboard and analysis when all modules are enabled", () => {
    const analytics = model(IDS);

    expect(analytics.dashboards.map((item) => item.id)).toEqual([
      "executive",
      "audit",
      "gemba",
      "redFlag",
      "continuousImprovement",
      "actions",
      "visualManagement",
    ]);
    expect(analytics.views.executive?.modulePerformance?.map((item) => item.id)).toEqual([
      "audit",
      "actions",
      "continuousImprovement",
      "redFlag",
      "visualManagement",
      "gemba",
    ]);
    expect(analytics.views.audit?.charts).toHaveLength(5);
    expect(analytics.views.actions?.charts).toHaveLength(6);
    expect(analytics.views.actions?.charts.map((item) => item.id)).toContain("actions-closure-trend");
    expect(analytics.views.continuousImprovement?.charts).toHaveLength(4);
    expect(analytics.views.redFlag?.charts).toHaveLength(5);
    expect(analytics.views.visualManagement?.charts).toHaveLength(8);
    expect(analytics.views.visualManagement?.charts.map((item) => item.id)).toEqual(expect.arrayContaining(["vm-escalation-trend", "vm-kpi-status-trend"]));
    expect(analytics.views.gemba?.charts).toHaveLength(5);
    expect(analytics.views.actions?.kpiRows.flat().map((item) => item.id)).toContain("actions-review");
    expect(analytics.views.visualImprovement).toBeUndefined();
  });

  it("collapses to Executive, Audit, and Actions without leaking disabled module data", () => {
    const analytics = model(["audit", "actions", "dashboards"]);

    expect(analytics.dashboards.map((item) => item.id)).toEqual(["executive", "audit", "actions"]);
    expect(Object.keys(analytics.views).sort()).toEqual(["actions", "audit", "executive"]);
    expect(analytics.views.executive?.modulePerformance?.map((item) => item.id)).toEqual(["audit", "actions"]);
    expect(analytics.views.executive?.kpiRows.flat().map((item) => item.id)).not.toEqual(expect.arrayContaining([
      "critical-flags",
      "active-ci",
      "gemba-observations",
      "visual-management-meetings",
    ]));
    const actionSources = analytics.views.actions?.charts.find((item) => item.id === "actions-source")?.data.map((item) => item.label);
    expect(actionSources).not.toEqual(expect.arrayContaining(["Continuous Improvement", "Red Flag", "Visual Management", "Gemba"]));
  });

  it("supports Audit, Continuous Improvement, and Actions while retaining their shared filters", () => {
    const analytics = model(["audit", "continuousImprovement", "actions", "dashboards"], "Egmore Plant");

    expect(analytics.dashboards.map((item) => item.id)).toEqual(["executive", "audit", "continuousImprovement", "actions"]);
    expect(analytics.zones).toEqual(expect.arrayContaining(["Zone A", "Zone B", "Zone C", "Zone D"]));
    expect(analytics.views.executive?.kpiRows.flat().map((item) => item.id)).toEqual(expect.arrayContaining(["audit-compliance", "active-ci", "actual-savings"]));
    expect(analytics.views.redFlag).toBeUndefined();
    expect(analytics.views.gemba).toBeUndefined();
  });

  it("removes only Gemba when all other modules remain entitled", () => {
    const analytics = model(IDS.filter((id) => id !== "gemba"));

    expect(analytics.dashboards.map((item) => item.id)).not.toContain("gemba");
    expect(analytics.views.gemba).toBeUndefined();
    expect(analytics.views.executive?.modulePerformance?.map((item) => item.id)).not.toContain("gemba");
    expect(analytics.views.executive?.kpiRows.flat().map((item) => item.id)).not.toContain("gemba-observations");
  });

  it("keeps unified Dashboard analytics available when the legacy dashboards entitlement is off", () => {
    const analytics = model(IDS.filter((id) => id !== "dashboards"));
    expect(analytics.dashboards.map((item) => item.id)).toContain("executive");
    expect(analytics.dashboards.map((item) => item.id)).toContain("audit");
    expect(analytics.views.gemba).toBeDefined();
  });

  it("composes the Performance tab from existing enabled-module analytics", () => {
    const performance = buildUnifiedPerformanceView(model(IDS));
    expect(performance.charts.map((item) => item.id)).toEqual([
      "operational-trend",
      "audit-plant",
      "audit-zone",
      "audit-compliance",
      "actions-closure-trend",
      "ci-savings",
      "rf-flow",
      "gemba-trend",
      "vm-meeting-trend",
    ]);
    expect(performance.modulePerformance?.every((item) => item.href.startsWith("/dashboard?view=modules&module="))).toBe(true);

    const withoutGemba = buildUnifiedPerformanceView(model(IDS.filter((id) => id !== "gemba")));
    expect(withoutGemba.charts.map((item) => item.id)).not.toContain("gemba-trend");
  });
});
