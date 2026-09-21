import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

function installBrowser() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  vi.stubGlobal("crypto", { randomUUID: () => "vm-test-id" });
  return values;
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Visual Management Settings", () => {
  it("preserves the six default Boards, three Tiers, and five KPI Sections without duplication", async () => {
    installBrowser();
    const config = await import("@/features/visual-management/visual-management-configuration-store");
    expect(config.getVisualManagementConfiguration().boards.map((item) => item.name)).toEqual(["Zone A Daily Management", "Zone B Daily Management", "Zone C Daily Management", "Zone D Daily Management", "Plant Operations", "Leadership Review"]);
    expect(config.getVisualManagementConfiguration().tiers).toHaveLength(3);
    expect(config.getVisualManagementConfiguration().kpiSections.map((item) => item.name)).toEqual(["Safety", "Quality", "Delivery", "Cost", "People"]);
  });

  it("validates owners, Tier 1 scope, KPI assignment, circular escalation, and used Tier deactivation", async () => {
    installBrowser();
    const config = await import("@/features/visual-management/visual-management-configuration-store");
    const board = { ...config.DEFAULT_VISUAL_MANAGEMENT_BOARDS[0], name: "", zoneId: undefined, ownerId: "INACTIVE", kpiSectionIds: ["inactive"] };
    expect(config.validateVisualManagementBoard(board, { activeUserIds: ["USR-LAKSHMAN"], tierOneId: "tier-1", activeKpiIds: ["safety"] })).toMatchObject({ name: expect.any(String), zoneId: expect.any(String), ownerId: expect.any(String), kpiSectionIds: expect.any(String) });
    const circular = config.DEFAULT_VISUAL_MANAGEMENT_TIERS.map((item) => item.id === "tier-3" ? { ...item, nextTierId: "tier-1" } : { ...item });
    expect(config.validateVisualManagementTiers(circular)["tier-1.nextTierId"]).toContain("Circular");
    const disabled = config.DEFAULT_VISUAL_MANAGEMENT_TIERS.map((item) => item.id === "tier-1" ? { ...item, active: false } : { ...item });
    expect(config.validateVisualManagementTiers(disabled)["tier-1.active"]).toContain("active Board");
  });

  it("applies Board and KPI changes to future meetings while preserving an existing meeting snapshot", async () => {
    const values = installBrowser();
    const config = await import("@/features/visual-management/visual-management-configuration-store");
    const productivity = config.addVisualManagementKpiSection({ name: "Productivity", shortLabel: "PR", description: "Output performance" })!;
    const context = { activeUserIds: ["USR-LAKSHMAN", "USR-RUMESH", "USR-SIVA-KUMAR"], tierOneId: "tier-1", activeKpiIds: ["safety", productivity.id] };
    const added = config.saveVisualManagementBoard({ id: "VM-TEST-T1", name: "Zone B Productivity", tierId: "tier-1", plantId: "PLANT-EGM", zoneId: "ZONE-B", ownerId: "USR-LAKSHMAN", memberIds: ["USR-LAKSHMAN", "USR-SIVA-KUMAR"], meetingFrequency: "Daily", meetingTime: "11:00", kpiSectionIds: ["safety", productivity.id], status: "Active", createdAt: "", updatedAt: "" }, context);
    expect(added.success).toBe(true);
    const runtime = await import("@/features/visual-management/visual-management-store");
    const meeting = runtime.startVisualManagementMeeting("VM-TEST-T1", { id: "USR-LAKSHMAN", name: "Lakshman" })!;
    expect(meeting).toMatchObject({ boardName: "Zone B Productivity", lead: { id: "USR-LAKSHMAN" } });
    expect(meeting.kpiEntries.map((item) => item.section)).toEqual(["Safety", "Productivity"]);
    const saved = added.success ? added.board : undefined;
    expect(config.saveVisualManagementBoard({ ...saved!, name: "Renamed Future Board", ownerId: "USR-RUMESH", memberIds: ["USR-RUMESH"], kpiSectionIds: ["safety"] }, context).success).toBe(true);
    const historical = runtime.getVisualManagementMeeting(meeting.id)!;
    expect(historical.boardName).toBe("Zone B Productivity");
    expect(historical.lead.id).toBe("USR-LAKSHMAN");
    expect(historical.kpiEntries.map((item) => item.section)).toEqual(["Safety", "Productivity"]);
    expect(runtime.getVisualManagementBoard("VM-TEST-T1")).toMatchObject({ name: "Renamed Future Board", owner: { id: "USR-RUMESH" } });
    expect(values.has("ops-visual-management-configuration-v1")).toBe(true);
  });

  it("uses configured Tier links for escalation targets and blocks inactive Boards from new meetings", async () => {
    installBrowser();
    const config = await import("@/features/visual-management/visual-management-configuration-store");
    const tiers = config.DEFAULT_VISUAL_MANAGEMENT_TIERS.map((item) => item.id === "tier-1" ? { ...item, nextTierId: "tier-3" } : { ...item });
    expect(config.saveVisualManagementTiers(tiers).success).toBe(true);
    const runtime = await import("@/features/visual-management/visual-management-store");
    expect(runtime.getEscalationTargets("VM-ZD-T1").map((item) => item.id)).toEqual(["VM-LEAD-T3"]);
    expect(config.setVisualManagementBoardStatus("VM-ZD-T1", "Inactive")).toBe(true);
    expect(runtime.startVisualManagementMeeting("VM-ZD-T1", { id: "USR-RITIKA", name: "Ritika" })).toBeNull();
  });

  it("protects Settings routes with role and module-entitlement checks", () => {
    const page = read("features/settings/visual-management-settings-pages.tsx");
    expect(page).toContain("access.canManageConfiguration");
    expect(page).toContain("modules.visualManagement || access.isSuperAdmin");
    expect(page).toContain("SettingsAccessDenied");
    // VM settings migrated to canonical module route; global Settings no longer has a VM group.
    // Verify the canonical VM settings page carries its own module-entitlement gate.
    const vmSettings = read("app/(app)/visual-management/settings/page.tsx");
    expect(vmSettings).toContain("modules.visualManagement || access.isSuperAdmin");
    // And verify legacy /settings/visual-management/* redirects to the canonical location.
    const legacyRedirect = read("app/(app)/settings/visual-management/boards/page.tsx");
    expect(legacyRedirect).toContain("permanentRedirect");
    expect(legacyRedirect).toContain("/visual-management/settings/boards");
  });
});
