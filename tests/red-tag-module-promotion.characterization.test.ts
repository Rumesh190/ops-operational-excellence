import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_MODULE_ENTITLEMENTS, getEnabledNavigationGroups, getOperationalModule, isModuleRouteActive, OPERATIONAL_MODULES } from "@/lib/modules";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Red Tag first-class OPS module", () => {
  it("registers Red Tag independently below Red Flag with its canonical route", () => {
    const redFlag = getOperationalModule("redFlag");
    const redTag = getOperationalModule("redTag");
    expect(redTag).toMatchObject({ id: "redTag", label: "Red Tag", route: "/5s/red", stageLabel: "Item Disposition", enabled: true, order: 25 });
    expect(redTag.id).not.toBe(redFlag.id);
    expect(redTag.route).not.toBe(redFlag.route);
    expect(OPERATIONAL_MODULES.map((item) => item.id)).toEqual(["gemba", "redFlag", "redTag", "continuousImprovement", "audit", "visualManagement"]);
  });

  it("shows or hides only Red Tag from centralized entitlements", () => {
    const enabled = getEnabledNavigationGroups({ ...DEFAULT_MODULE_ENTITLEMENTS, redTag: true });
    expect(enabled.find((group) => group.id === "operationalExcellence")?.items.map((item) => item.id)).toEqual(["gemba", "redFlag", "redTag", "continuousImprovement", "audit"]);

    const disabled = getEnabledNavigationGroups({ ...DEFAULT_MODULE_ENTITLEMENTS, redTag: false });
    const ids = disabled.find((group) => group.id === "operationalExcellence")?.items.map((item) => item.id);
    expect(ids).not.toContain("redTag");
    expect(ids).toContain("redFlag");
  });

  it("keeps Red Tag active across landing, detail, print, and settings routes", () => {
    const redTagModule = getOperationalModule("redTag");
    for (const path of ["/5s/red", "/5s/red/RT-EGM-ZA-001", "/5s/red/RT-EGM-ZA-001/print", "/5s/red/settings"]) {
      expect(isModuleRouteActive(path, redTagModule)).toBe(true);
    }
    expect(isModuleRouteActive("/red-flag", redTagModule)).toBe(false);
  });

  it("uses the independent entitlement in the existing gate and Super Admin registry UI", () => {
    const layout = source("app/(app)/5s/red/layout.tsx");
    const superAdmin = source("features/super-admin/super-admin.tsx");
    const settingsAccess = source("features/settings/module-access-page.tsx");
    const sidebar = source("components/navigation/sidebar-nav.tsx");
    expect(layout).toContain('<ModuleGate id="redTag">');
    expect(layout).not.toContain('<ModuleGate id="redFlag">');
    expect(superAdmin).toContain('capabilities={OPERATIONAL_MODULES}');
    expect(superAdmin).toContain("saveOrganizationAccess(organizationId, draft)");
    expect(settingsAccess).toContain('["gemba", "redFlag", "redTag", "continuousImprovement", "audit"]');
    expect(sidebar).toContain("getEnabledNavigationGroups(entitlements)");
  });
});
