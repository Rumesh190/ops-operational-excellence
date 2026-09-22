import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ACCESS_CAPABILITIES, DEFAULT_MODULE_ENTITLEMENTS, NAVIGATION_GROUPS, OPERATIONAL_MODULES, SHARED_CAPABILITIES } from "@/lib/modules";
import { crumbsForPath } from "@/components/navigation/breadcrumb-nav";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("OPS product information architecture", () => {
  it("models the approved lifecycle and module descriptions centrally", () => {
    expect(NAVIGATION_GROUPS.map((group) => group.label)).toEqual([
      "Overview", "Operational Excellence", "Execution", "Visualize", "Analytics", "System",
    ]);
    expect(OPERATIONAL_MODULES.map(({ id, navigationGroup, stageLabel, order }) => ({ id, navigationGroup, stageLabel, order }))).toEqual([
      { id: "gemba", navigationGroup: "operationalExcellence", stageLabel: "Observe", order: 10 },
      { id: "redFlag", navigationGroup: "operationalExcellence", stageLabel: "Identify", order: 20 },
      { id: "redTag", navigationGroup: "operationalExcellence", stageLabel: "Item Disposition", order: 25 },
      { id: "continuousImprovement", navigationGroup: "operationalExcellence", stageLabel: "Improve", order: 30 },
      { id: "audit", navigationGroup: "operationalExcellence", stageLabel: "Sustain", order: 40 },
      { id: "visualManagement", navigationGroup: "visualize", stageLabel: undefined, order: 60 },
    ]);
    expect(SHARED_CAPABILITIES.map(({ id, navigationGroup, order }) => ({ id, navigationGroup, order }))).toEqual([
      { id: "actions", navigationGroup: "execution", order: 50 },
      { id: "reports", navigationGroup: "analytics", order: 80 },
    ]);
  });

  it("uses one entitlement-driven sidebar for expanded, collapsed, and mobile navigation", () => {
    const sidebar = source("components/navigation/sidebar-nav.tsx");
    const mobile = source("components/navigation/mobile-nav-drawer.tsx");
    expect(sidebar).toContain("getEnabledNavigationGroups(entitlements)");
    expect(sidebar).toContain('<TooltipContent side="right">{tooltip}</TooltipContent>');
    expect(sidebar).toContain("subtitle={capability.stageLabel}");
    expect(mobile).toContain("<SidebarNav onNavigate=");
  });

  it("hides only disabled operational items and removes the family when all five are disabled", async () => {
    const { DEFAULT_MODULE_ENTITLEMENTS, getEnabledNavigationGroups } = await import("@/lib/modules");
    for (const id of ["gemba", "redFlag", "redTag", "continuousImprovement", "audit"] as const) {
      const groups = getEnabledNavigationGroups({ ...DEFAULT_MODULE_ENTITLEMENTS, [id]: false });
      const operational = groups.find((group) => group.id === "operationalExcellence");
      expect(operational?.items.map((item) => item.id)).not.toContain(id);
      expect(operational?.items).toHaveLength(4);
    }
    const noOperationalModules = getEnabledNavigationGroups({
      ...DEFAULT_MODULE_ENTITLEMENTS,
      gemba: false,
      redFlag: false,
      redTag: false,
      continuousImprovement: false,
      audit: false,
    });
    expect(noOperationalModules.map((group) => group.id)).not.toContain("operationalExcellence");
  });

  it("derives conceptual breadcrumb parents from centralized navigation metadata", () => {
    expect(crumbsForPath("/continuous-improvement").map((crumb) => crumb.label)).toEqual(["Improve", "Continuous Improvement"]);
    expect(crumbsForPath("/gemba").map((crumb) => crumb.label)).toEqual(["Observe", "Gemba"]);
    expect(crumbsForPath("/red-flag").map((crumb) => crumb.label)).toEqual(["Identify", "Red Flag"]);
    expect(crumbsForPath("/5s/red/RT-EGM-ZA-001").map((crumb) => crumb.label)).toEqual(["Item Disposition", "Red Tag", "RT-EGM-ZA-001"]);
    expect(crumbsForPath("/audits").map((crumb) => crumb.label)).toEqual(["Sustain", "Audit"]);
    expect(crumbsForPath("/actions").map((crumb) => crumb.label)).toEqual(["Execution", "Actions"]);
    expect(crumbsForPath("/visual-management").map((crumb) => crumb.label)).toEqual(["Visualize", "Visual Management"]);
    expect(crumbsForPath("/dashboard").map((crumb) => crumb.label)).toEqual(["Dashboard"]);
    expect(crumbsForPath("/reports").map((crumb) => crumb.label)).toEqual(["Analytics", "Reports"]);
  });

  it("exposes one Dashboard and redirects the retired analytics route", () => {
    const dashboard = source("features/ops-dashboard/ops-dashboard-page.tsx");
    const legacyRoute = source("app/(app)/analytics/dashboards/page.tsx");
    const nextConfig = source("next.config.ts");
    const settings = source("features/settings/module-access-page.tsx");
    expect(dashboard).toContain('{ id: "overview", label: "Overview" }');
    expect(dashboard).toContain('{ id: "performance", label: "Performance" }');
    expect(dashboard).toContain('{ id: "modules", label: "Modules" }');
    expect(dashboard).toContain("useAnalyticsDashboardModel(analyticsFilters)");
    expect(dashboard).toContain('analytics.dashboards.filter((item) => item.id !== "executive")');
    expect(dashboard).toContain("filters: { plant, zone, period }");
    expect(dashboard).toContain("const analyticsFilters = useMemo(() => ({ plant, zone, period:");
    expect(legacyRoute).toContain('redirect("/dashboard?view=performance")');
    expect(nextConfig).toContain('source: "/analytics/dashboards"');
    expect(nextConfig).toContain('destination: "/dashboard?view=performance"');
    expect(settings).not.toContain('["dashboards", "reports"]');
    expect(ACCESS_CAPABILITIES.map((item) => item.id)).not.toContain("dashboards");
    expect(DEFAULT_MODULE_ENTITLEMENTS.dashboards).toBe(true);
  });

  it("keeps Analytics only when Reports is entitled", async () => {
    const { DEFAULT_MODULE_ENTITLEMENTS, getEnabledNavigationGroups } = await import("@/lib/modules");
    const enabled = getEnabledNavigationGroups(DEFAULT_MODULE_ENTITLEMENTS);
    expect(enabled.find((group) => group.id === "analytics")?.items.map((item) => item.id)).toEqual(["reports"]);
    const reportsDisabled = getEnabledNavigationGroups({ ...DEFAULT_MODULE_ENTITLEMENTS, reports: false });
    expect(reportsDisabled.map((group) => group.id)).not.toContain("analytics");
  });

  it("orders and authorization-filters the global create menu", () => {
    const dashboard = source("features/ops-dashboard/ops-dashboard-page.tsx");
    const labels = [
      "Start Gemba Walk", "Raise Red Flag", "Create Improvement", "Start Audit", "Create Action", "Start Visual Management Meeting",
    ];
    labels.reduce((previous, label) => {
      const index = dashboard.indexOf(label);
      expect(index).toBeGreaterThan(previous);
      return index;
    }, -1);
    expect(dashboard).toContain("access[item.id] && authorizedCreateTargets[item.id]");
  });

  it("uses the operational excellence product subtitle and Super Admin section labels", () => {
    const desktop = source("components/navigation/sidebar.tsx");
    const mobile = source("components/navigation/mobile-nav-drawer.tsx");
    const superAdmin = source("features/super-admin/super-admin.tsx");
    expect(desktop).toContain("Operational Excellence Platform");
    expect(mobile).toContain("Operational Excellence Platform");
    expect(superAdmin).toContain("Operational Excellence Modules");
    expect(superAdmin).toContain("Shared Platform Capabilities");
  });
});
