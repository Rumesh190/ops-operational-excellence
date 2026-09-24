import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const walkSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-walk-page.tsx"), "utf8");
const componentsSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-components.tsx"), "utf8");

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    clear: () => values.clear(),
    get length() { return values.size; },
  };
}

async function setup(localStorage = storage()) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `horizontal-${++sequence}` });
  const [gemba, organization] = await Promise.all([
    import("@/features/gemba/gemba-store"),
    import("@/lib/organization-store"),
  ]);
  return { gemba, organization, localStorage };
}

afterEach(() => vi.unstubAllGlobals());

const actor = { id: "USR-LAKSHMAN", name: "Lakshman" };
const input = {
  type: "Opportunity" as const,
  title: "Standardize visual tool locations",
  description: "The arrangement can be reused in similar work cells.",
  location: "Assembly Cell 2",
  peopleInvolved: [],
  evidence: [],
};

describe("Team Feedback #7 — Gemba horizontal deployment", () => {
  it("keeps the feature optional and requires another zone only when selected", async () => {
    const { gemba } = await setup();
    expect(gemba.validateGembaHorizontalDeployment("Zone A", false, [])).toBeNull();
    expect(gemba.validateGembaHorizontalDeployment("Zone A", true, [])).toBe("Select at least one other target zone.");
    expect(gemba.validateGembaHorizontalDeployment("Zone A", true, ["ZONE-A"])).toBe("Select at least one other target zone.");
    expect(gemba.validateGembaHorizontalDeployment("Zone A", true, ["ZONE-B", "ZONE-C"])).toBeNull();
  });

  it("persists multiple stable target IDs on the original observation without downstream duplicates", async () => {
    const { gemba, localStorage } = await setup();
    const before = JSON.parse(localStorage.getItem("ops-gemba-v1") ?? "null");
    expect(before).toBeNull();
    const saved = gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-B", "ZONE-C"] } }, actor)!;
    expect(saved.horizontalDeployment?.targetZoneIds).toEqual(["ZONE-B", "ZONE-C"]);
    expect(saved.horizontalDeployment?.recipients.map((item) => item.zoneId)).toEqual(["ZONE-B", "ZONE-C"]);
    expect(saved.actionId).toBeUndefined();
    expect(saved.redTagId).toBeUndefined();
    expect(saved.improvementId).toBeUndefined();
    const state = JSON.parse(localStorage.getItem("ops-gemba-v1")!);
    expect(state.observations.filter((item: { id: string }) => item.id === saved.id)).toHaveLength(1);
  });

  it("resolves active zone leaders through canonical users and creates honest in-app notifications", async () => {
    const { gemba, localStorage } = await setup();
    const saved = gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-B"] } }, actor)!;
    expect(saved.horizontalDeployment?.recipients[0]).toMatchObject({ zoneId: "ZONE-B", leaderUserId: "USR-RUMESH", leaderName: "Rumesh", notificationStatus: "shared" });
    expect(saved.horizontalDeployment?.recipients[0].notificationId).toBeTruthy();
    const notifications = JSON.parse(localStorage.getItem("standalone-5s-notifications")!);
    expect(notifications.some((item: { recipientUserId: string; title: string; message: string }) => item.recipientUserId === "USR-RUMESH" && item.title === "Horizontal Deployment Opportunity" && item.message.includes("for review"))).toBe(true);
  });

  it("handles a missing zone leader without crashing or pretending notification delivery", async () => {
    const { gemba, organization } = await setup();
    organization.setOrganizationStateForTests({
      plants: organization.ORGANIZATION_PLANT_SEEDS.map((item) => ({ ...item })),
      zones: organization.ORGANIZATION_ZONE_SEEDS.map((item) => item.id === "ZONE-B" ? { ...item, leaderId: "USR-MISSING", leaderName: "" } : { ...item }),
    });
    const saved = gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-B"] } }, actor)!;
    expect(saved.horizontalDeployment?.recipients[0]).toMatchObject({ zoneId: "ZONE-B", notificationStatus: "unavailable" });
    expect(saved.horizontalDeployment?.recipients[0].leaderUserId).toBeUndefined();
  });

  it("supports editing target zones and turning deployment off on the same observation", async () => {
    const { gemba, localStorage } = await setup();
    const created = gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-B"] } }, actor)!;
    const edited = gemba.saveGembaObservation("GEM-2026-015", { ...input, title: "Updated opportunity", horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-C", "ZONE-D"] } }, actor, created.id)!;
    expect(edited.id).toBe(created.id);
    expect(edited.horizontalDeployment?.targetZoneIds).toEqual(["ZONE-C", "ZONE-D"]);
    const disabled = gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: false, targetZoneIds: [] } }, actor, created.id)!;
    expect(disabled.horizontalDeployment).toBeUndefined();
    const state = JSON.parse(localStorage.getItem("ops-gemba-v1")!);
    expect(state.observations.filter((item: { id: string }) => item.id === created.id)).toHaveLength(1);
    expect(state.walks.find((item: { id: string }) => item.id === "GEM-2026-015").activity.some((item: { type: string }) => item.type === "horizontal_deployment_removed")).toBe(true);
  });

  it("survives reload and remains backward compatible with observations without metadata", async () => {
    const first = await setup();
    const saved = first.gemba.saveGembaObservation("GEM-2026-015", { ...input, horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-D"] } }, actor)!;
    const reloaded = await setup(first.localStorage);
    expect(reloaded.gemba.getGembaState().observations.find((item) => item.id === saved.id)?.horizontalDeployment?.targetZoneIds).toEqual(["ZONE-D"]);
    expect(reloaded.gemba.getGembaState().observations.find((item) => item.id === "GEM-2026-015-OBS-01")?.horizontalDeployment).toBeUndefined();
  });

  it("keeps current-zone exclusion and required target validation in the canonical add/edit dialog", () => {
    expect(walkSource).toContain('item.name !== zone && item.id !== zone');
    expect(walkSource).toContain("Deployment Opportunity at other Zones");
    expect(walkSource).toContain("Target Zones *");
    expect(walkSource).toContain("Select at least one other target zone.");
    expect(walkSource).toContain("No duplicate observation or follow-up record is created.");
  });

  it("preserves photo, voice, Action, Red Tag, and CI paths", () => {
    expect(walkSource).toContain("isEvidencePhotoRequired(type)");
    expect(walkSource).toContain("VoiceCaptureFlow");
    expect(walkSource).toContain("CreateLinkedActionDialog");
    expect(walkSource).toContain("CreateRedTagFromGembaDialog");
    expect(walkSource).toContain("CreateCIFromGembaDialog");
  });

  it("shows the compact card indicator and conditional detail status", () => {
    expect(componentsSource).toContain("Horizontal Deployment ·");
    expect(componentsSource).toContain("Zone Leader not assigned");
    expect(componentsSource).toContain("Notification unavailable");
    expect(componentsSource).toContain("observation.horizontalDeployment?.enabled &&");
  });
});
