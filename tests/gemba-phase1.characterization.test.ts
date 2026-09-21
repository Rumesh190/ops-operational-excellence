import { afterEach, describe, expect, it, vi } from "vitest";

import { formatGembaZoneLabel } from "@/features/gemba/gemba-zone-labels";
import { walkDestination } from "@/features/gemba/gemba-page";
import type { GembaWalk } from "@/features/gemba/types";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    clear: () => values.clear(),
    get length() { return values.size; },
  };
}

async function gembaStore() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
  return import("@/features/gemba/gemba-store");
}

afterEach(() => { vi.unstubAllGlobals(); });

const actor = { id: "USR-RUMESH", name: "Rumesh" };

describe("Gemba Phase 1 — canonical zone labels", () => {
  it("formats Zone A/B/C/D with their canonical area", () => {
    expect(formatGembaZoneLabel("Zone A")).toBe("Zone A · Office");
    expect(formatGembaZoneLabel("Zone B")).toBe("Zone B · Production");
    expect(formatGembaZoneLabel("Zone C")).toBe("Zone C · Warehouse");
    expect(formatGembaZoneLabel("Zone D")).toBe("Zone D · Utility");
  });

  it("does not duplicate the zone name for an unmapped zone (falls back to the raw name only)", () => {
    expect(formatGembaZoneLabel("Zone Z")).toBe("Zone Z");
    expect(formatGembaZoneLabel("Zone Z")).not.toContain("Zone Z · Zone Z");
  });
});

describe("Gemba Phase 1 — scheduling", () => {
  it("Start Now creates a walk with status In Progress", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-20" }, actor, true);
    expect(walk?.status).toBe("In Progress");
    expect(walk?.startedAt).toBeTruthy();
  });

  it("Schedule creates a walk with status Scheduled and no startedAt", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-25", scheduledTime: "09:00" }, actor, false);
    expect(walk?.status).toBe("Scheduled");
    expect(walk?.startedAt).toBeUndefined();
    expect(walk?.scheduledTime).toBe("09:00");
  });

  it("Scheduled walk transitions to In Progress via Start Walk", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-25", scheduledTime: "09:00" }, actor, false)!;
    store.startGembaWalk(walk.id, actor);
    expect(store.getGembaWalk(walk.id)?.status).toBe("In Progress");
  });
});

describe("Gemba Phase 1 — legacy status compatibility", () => {
  it("normalizes a legacy 'Draft' walk to 'Scheduled' on load, without touching other walks", async () => {
    const localStorage = storage();
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [
        { id: "GEM-2026-020", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "Legacy draft", scheduledDate: "2026-09-14", status: "Draft", createdAt: "t", updatedAt: "t", observationIds: [], actionIds: [], activity: [] },
        { id: "GEM-2026-021", plant: "Egmore Plant", zone: "Zone B", leadId: "L", leadName: "Lakshman", participants: [], purpose: "Completed walk", scheduledDate: "2026-09-10", status: "Completed", createdAt: "t", updatedAt: "t", observationIds: [], actionIds: [], activity: [] },
      ],
      observations: [],
    }));
    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/gemba/gemba-store");

    expect(store.getGembaWalk("GEM-2026-020")?.status).toBe("Scheduled");
    expect(store.getGembaWalk("GEM-2026-021")?.status).toBe("Completed");

    const raw = JSON.parse(localStorage.getItem("ops-gemba-v1")!);
    expect(raw.walks.find((walk: GembaWalk) => walk.id === "GEM-2026-020").status).toBe("Scheduled");
  });
});

describe("Gemba Phase 1 — outside-zone participants", () => {
  it("persists participants with a homeZone marker alongside regular zone participants", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({
      plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name,
      participants: [
        { id: "USR-ZONE-MEMBER", name: "In-zone Member", role: "Zone Member" },
        { id: "USR-OUTSIDE", name: "Outside Member", role: "Zone Member", homeZone: "Zone C" },
      ],
      purpose: "Observe", scheduledDate: "2026-09-20",
    }, actor, true);
    expect(walk?.participants).toHaveLength(2);
    expect(walk?.participants.find((person) => person.id === "USR-OUTSIDE")?.homeZone).toBe("Zone C");
    expect(walk?.participants.find((person) => person.id === "USR-ZONE-MEMBER")?.homeZone).toBeUndefined();
  });
});

describe("Gemba Phase 1 — row/navigation destination by status", () => {
  const base: GembaWalk = {
    id: "GEM-2026-030", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [],
    purpose: "P", scheduledDate: "2026-09-20", status: "Scheduled", createdAt: "t", updatedAt: "t", observationIds: [], actionIds: [], activity: [],
  };

  it("Scheduled walk opens the walk detail page", () => {
    expect(walkDestination({ ...base, status: "Scheduled" }, true)).toBe("/gemba/GEM-2026-030");
  });

  it("In Progress walk (with conduct rights) continues into active capture", () => {
    expect(walkDestination({ ...base, status: "In Progress" }, true)).toBe("/gemba/GEM-2026-030/walk");
  });

  it("In Progress walk without conduct rights opens the detail page instead", () => {
    expect(walkDestination({ ...base, status: "In Progress" }, false)).toBe("/gemba/GEM-2026-030");
  });

  it("Completed walk opens the existing detail destination (which itself offers View Report)", () => {
    expect(walkDestination({ ...base, status: "Completed" }, true)).toBe("/gemba/GEM-2026-030");
  });
});

describe("Gemba Phase 1 — In Progress setup protection", () => {
  it("allows updating setup fields while a walk is still Scheduled", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-25", scheduledTime: "09:00" }, actor, false)!;
    const updated = store.updateGembaWalkSetup(walk.id, { purpose: "Revised purpose" }, actor);
    expect(updated?.purpose).toBe("Revised purpose");
  });

  it("rejects setup edits once the walk is In Progress, leaving the walk unchanged", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-20" }, actor, true)!;
    expect(walk.status).toBe("In Progress");
    const result = store.updateGembaWalkSetup(walk.id, { purpose: "Should not apply" }, actor);
    expect(result).toBeNull();
    expect(store.getGembaWalk(walk.id)?.purpose).toBe("Observe");
  });

  it("rejects setup edits once the walk is Completed", async () => {
    const store = await gembaStore();
    const walk = store.createGembaWalk({ plant: "Egmore Plant", zone: "Zone A", leadId: actor.id, leadName: actor.name, participants: [], purpose: "Observe", scheduledDate: "2026-09-20" }, actor, true)!;
    store.completeGembaWalk(walk.id, actor);
    const result = store.updateGembaWalkSetup(walk.id, { purpose: "Should not apply" }, actor);
    expect(result).toBeNull();
  });
});

describe("Gemba Phase 1 — existing record compatibility", () => {
  it("existing In Progress and Completed walks are unaffected by the status normalization", async () => {
    const store = await gembaStore();
    const state = store.getGembaState();
    expect(state.walks.some((walk) => walk.status === "In Progress")).toBe(true);
    expect(state.walks.some((walk) => walk.status === "Completed")).toBe(true);
    expect(state.walks.some((walk) => walk.status === "Draft")).toBe(false);
  });
});
