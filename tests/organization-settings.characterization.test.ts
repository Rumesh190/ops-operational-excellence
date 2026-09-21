import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.resetModules();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
});

describe("centralized organization configuration", () => {
  it("preserves the manufacturing plant and Zone ownership seeds", async () => {
    const organization = await import("@/lib/organization-store");
    expect(organization.getOrganizationPlants()[0]).toMatchObject({ name: "Egmore Plant", code: "EGM", location: "Chennai", status: "Active", codeLocked: true });
    expect(organization.getOrganizationZones().map((zone) => [zone.name, zone.leaderName])).toEqual([
      ["Zone A", "Lakshman"], ["Zone B", "Rumesh"], ["Zone C", "Manoj Guru"], ["Zone D", "Anand"],
    ]);
    expect(organization.ORGANIZATION_MEMBER_SEEDS.filter((member) => member.zoneId === "ZONE-B").map((member) => member.name)).toEqual(["Siva Kumar", "Suburamiani", "Raj Kumar", "Raman", "Zerome"]);
  });

  it("keeps a historical Plant code locked while allowing current details to change", async () => {
    const organization = await import("@/lib/organization-store");
    const plant = organization.getOrganizationPlants()[0];
    const saved = organization.saveOrganizationPlant({ ...plant, name: "Egmore Operations", code: "NEW", location: "Chennai Central" });
    expect(saved).toMatchObject({ name: "Egmore Operations", code: "EGM", location: "Chennai Central" });
  });

  it("updates the live Zone leader used by Actions and CI without rewriting records", async () => {
    const administration = await import("@/features/five-s/administration/store");
    const organization = await import("@/lib/organization-store");
    const configuration = await import("@/lib/five-s/configuration");
    expect(administration.assignZoneLeader("ZONE-B", "USR-SIVA-KUMAR", "USR-LAKSHMAN")).toBe(true);
    expect(organization.getOrganizationZone("ZONE-B")?.leaderName).toBe("Siva Kumar");
    expect(configuration.getFiveSZoneConfiguration("Zone B")).toMatchObject({ leaderId: "USR-SIVA-KUMAR", leader: "Siva Kumar" });
    expect(administration.getAdminUser("USR-SIVA-KUMAR")?.zoneMemberships).toEqual([{ zone: "Zone B", responsibility: "Leader" }]);
  });

  it("moves members without deleting their account and excludes inactive users from assignment selectors", async () => {
    const administration = await import("@/features/five-s/administration/store");
    const configuration = await import("@/lib/five-s/configuration");
    expect(administration.setUserZoneMembership("USR-RITIKA", "Zone C", "USR-LAKSHMAN")).toBe(true);
    expect(administration.getAdminUser("USR-RITIKA")?.zoneMemberships).toEqual([{ zone: "Zone C", responsibility: "Member" }]);
    expect(configuration.getMembersForZone("Zone A").some((member) => member.id === "USR-RITIKA")).toBe(false);
    expect(configuration.getMembersForZone("Zone C").some((member) => member.id === "USR-RITIKA")).toBe(true);
    expect(administration.setAdminUserActive("USR-RITIKA", false, "USR-LAKSHMAN")).toBe(true);
    expect(administration.getAdminUser("USR-RITIKA")?.status).toBe("Inactive");
    expect(configuration.getMembersForZone("Zone C").some((member) => member.id === "USR-RITIKA")).toBe(false);
  });

  it("retains the Auditor own-Zone prohibition", async () => {
    const { canAuditZone } = await import("@/lib/five-s/configuration");
    expect(canAuditZone({ primaryZone: "Zone A" }, "Zone A")).toBe(false);
    expect(canAuditZone({ primaryZone: "Zone A" }, "Zone B")).toBe(true);
  });

  it("wires live organization selectors into current operational creation flows", async () => {
    const fs = await import("node:fs");
    const paths = [
      "features/five-s/components/FiveSAuditCreate.tsx",
      "features/actions/action-center-page.tsx",
      "features/five-s/continuous-improvement/new-page.tsx",
      "features/gemba/gemba-new-page.tsx",
      "features/red-flag/red-flag-new-page.tsx",
      "features/visual-improvement/visual-improvement-new-page.tsx",
    ];
    paths.forEach((path) => expect(fs.readFileSync(path, "utf8")).toContain("useFiveSZoneConfiguration"));
    const visualManagement = fs.readFileSync("features/visual-management/visual-management-store.ts", "utf8");
    expect(visualManagement).toContain("useOrganizationConfiguration");
    expect(visualManagement).toContain("useAdminUsers");
  });
});
