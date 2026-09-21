import { describe, expect, it } from "vitest";

import { buildOpsDashboardModel } from "@/features/ops-dashboard/ops-dashboard-data";
import { GEMBA_SEED_STATE } from "@/features/gemba/gemba-store";
import { VISUAL_MANAGEMENT_INITIAL_STATE } from "@/features/visual-management/visual-management-store";
import { RED_FLAG_SEED_FLAGS } from "@/features/red-flag/red-flag-store";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { RedFlag } from "@/features/red-flag/types";
import { DEMO_USERS } from "@/lib/current-user";
import type { AccessCapabilityId } from "@/lib/modules";

function access(enabled: AccessCapabilityId[]) {
  const ids: AccessCapabilityId[] = ["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"];
  return Object.fromEntries(ids.map((id) => [id, enabled.includes(id)])) as Record<AccessCapabilityId, boolean>;
}

function model(enabled: AccessCapabilityId[], actions: MyAction[] = [], redFlags: RedFlag[] = [], audits: FiveSAudit[] = []) {
  return buildOpsDashboardModel({
    audits,
    actions,
    improvements: [],
    redFlags,
    gemba: GEMBA_SEED_STATE,
    visualManagement: VISUAL_MANAGEMENT_INITIAL_STATE,
    access: access(enabled),
    currentUser: DEMO_USERS.auditor,
    filters: { plant: "All", zone: "All", period: "90d" },
    now: new Date("2026-09-14T12:00:00+05:30"),
  });
}

describe("OPS dashboard module entitlement composition", () => {
  it("shows the complete cross-module view when every module is enabled", () => {
    const dashboard = model(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"]);
    expect(dashboard.moduleHealth.map((item) => item.id)).toEqual(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba"]);
    expect(dashboard.actionSources.map((item) => item.id)).toEqual(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba"]);
    expect(dashboard.primaryKpis.map((item) => item.id)).toContain("active-red-flags");
    expect(dashboard.secondaryKpis.map((item) => item.id)).toContain("gemba-observations");
  });

  it("collapses cleanly to Audit and Actions only", () => {
    const dashboard = model(["audit", "actions"]);
    expect(dashboard.moduleHealth.map((item) => item.id)).toEqual(["audit"]);
    expect(dashboard.actionSources.map((item) => item.id)).toEqual(["audit"]);
    expect(dashboard.primaryKpis.map((item) => item.id)).toEqual(["score", "open-actions", "overdue-actions"]);
    expect(dashboard.secondaryKpis.map((item) => item.id)).toEqual(["audits-completed", "audit-score", "actions-closed"]);
  });

  it("shows Audit, CI, and Actions without gaps from disabled modules", () => {
    const dashboard = model(["audit", "continuousImprovement", "actions", "reports"]);
    expect(dashboard.moduleHealth.map((item) => item.id)).toEqual(["audit", "continuousImprovement"]);
    expect(dashboard.actionSources.map((item) => item.id)).toEqual(["audit", "continuousImprovement"]);
    expect(dashboard.primaryKpis.map((item) => item.id)).toContain("monthly-improvements");
    expect(dashboard.primaryKpis.map((item) => item.id)).not.toContain("active-red-flags");
    expect(dashboard.secondaryKpis.map((item) => item.id)).not.toContain("visual-management-meetings");
  });

  it("derives Action KPIs and source totals only from the canonical Action population", () => {
    const base: MyAction = {
      id: "ACT-CI-TEST", title: "Improve flow", description: "Remove waiting", source: "Continuous Improvement", sourceTitle: "CI-TEST",
      sourceModule: "continuousImprovement", sourceId: "CI-TEST", sourceLabel: "Continuous Improvement",
      plant: "Egmore Plant", department: "Production", area: "Zone B", assignedTo: "Siva Kumar", status: "In Progress", priority: "Medium",
      dueDate: "2026-09-20", createdAt: "2026-09-12", evidence: [],
    };
    const dashboard = model(["audit", "continuousImprovement", "actions"], [
      base,
      { ...base, id: "ACT-AUDIT-TEST", source: "5S Audit", sourceTitle: "AUD-TEST", sourceModule: "audit", sourceId: "AUD-TEST", sourceLabel: "Audit", status: "Completed", completedAt: "2026-09-13" },
    ]);
    expect(dashboard.actionStats).toEqual({ open: 1, overdue: 0, awaitingReview: 0, completed: 1 });
    expect(dashboard.actionSources).toEqual([
      expect.objectContaining({ id: "audit", value: 0 }),
      expect.objectContaining({ id: "continuousImprovement", value: 1 }),
    ]);
  });

  it("derives Red Flag KPIs only from the canonical Red Flag population", () => {
    const dashboard = model(["redFlag"], [], RED_FLAG_SEED_FLAGS);
    expect(dashboard.primaryKpis.find((item) => item.id === "active-red-flags")?.value).toBe("4");
    expect(dashboard.moduleHealth.find((item) => item.id === "redFlag")?.href).toBe("/red-flag");
    expect(dashboard.activity.every((item) => !item.href.startsWith("/5s/red"))).toBe(true);
  });

  it("shows honest empty audit states instead of fixture scores or trends", () => {
    const dashboard = model(["audit"]);
    expect(dashboard.primaryKpis.find((item) => item.id === "score")?.value).toBe("—");
    expect(dashboard.secondaryKpis.find((item) => item.id === "audit-score")?.value).toBe("—");
    expect(dashboard.moduleHealth.find((item) => item.id === "audit")?.primary).toBe("No completed audits");
    expect(dashboard.performanceTrend).toEqual([]);
    expect(dashboard.activity).toEqual([]);
  });

  it("derives audit score and trend from completed audits in the selected period", () => {
    const audit: FiveSAudit = { id: "AUD-LIVE", title: "Live audit", plant: "Egmore Plant", department: "Production", area: "Zone A", auditor: "Lakshman", status: "Completed", score: 60, maxScore: 75, completionPercentage: 100, startedAt: "2026-09-10T09:00:00.000Z", completedAt: "2026-09-10T10:00:00.000Z", dueDate: "2026-09-10", sections: [] };
    const dashboard = model(["audit"], [], [], [audit]);
    expect(dashboard.secondaryKpis.find((item) => item.id === "audit-score")?.value).toBe("80%");
    expect(dashboard.moduleHealth.find((item) => item.id === "audit")?.primary).toBe("80% avg score");
    expect(dashboard.performanceTrend).toEqual([{ label: "Sep", value: 80 }]);
  });
});
