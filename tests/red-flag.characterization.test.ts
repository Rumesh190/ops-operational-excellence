import { afterEach, describe, expect, it, vi } from "vitest";

import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { RED_FLAG_SEED_FLAGS, getRedFlagSummary, isRedFlagOverdue } from "@/features/red-flag/red-flag-store";
import { getActionSourceHref } from "@/lib/actions/action-config";
import { OPERATIONAL_MODULES } from "@/lib/modules";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("OPS Red Flag domain", () => {
  it("keeps Red Flag canonical without claiming the 5S Red Tag route", () => {
    const registryEntry = OPERATIONAL_MODULES.find((item) => item.id === "redFlag");
    expect(registryEntry?.route).toBe("/red-flag");
    expect(registryEntry?.legacyRoutes ?? []).not.toContain("/5s/red");
  });

  it("seeds the full lifecycle, evidence variants, linked actions, and recurring examples", () => {
    expect(new Set(RED_FLAG_SEED_FLAGS.map((flag) => flag.status))).toEqual(new Set(["Open", "In Progress", "Awaiting Closure", "Closed"]));
    expect(new Set(RED_FLAG_SEED_FLAGS.map((flag) => flag.severity))).toEqual(new Set(["Critical", "High", "Medium", "Low"]));
    expect(RED_FLAG_SEED_FLAGS.some((flag) => flag.evidence.length > 0)).toBe(true);
    expect(RED_FLAG_SEED_FLAGS.some((flag) => !flag.actionId)).toBe(true);
    expect(RED_FLAG_SEED_FLAGS.filter((flag) => /hydraulic|oil/i.test(`${flag.title} ${flag.description}`)).length).toBeGreaterThanOrEqual(3);
  });

  it("summarizes open, critical, overdue, closed-this-month, and resolution time", () => {
    const now = new Date("2026-09-14T12:00:00+05:30");
    const summary = getRedFlagSummary(RED_FLAG_SEED_FLAGS, now);
    expect(summary.open.length).toBe(4);
    expect(summary.critical.length).toBe(1);
    expect(summary.closedThisMonth.length).toBe(1);
    expect(summary.averageResolutionHours).toBeGreaterThan(0);
    expect(isRedFlagOverdue(RED_FLAG_SEED_FLAGS.find((flag) => flag.id === "RF-2026-014")!, now)).toBe(false);
  });

  it("routes new RF action sources to OPS while preserving legacy Red Tag links", () => {
    const newAction = MY_ACTIONS.find((action) => action.id === "ACT-RF-013")!;
    expect(getActionSourceHref(newAction)).toBe("/red-flag/RF-2026-013");
    expect(getActionSourceHref({ ...newAction, sourceId: "RT-EGM-ZA-001", sourceTitle: "RT-EGM-ZA-001" })).toBe("/5s/red/RT-EGM-ZA-001");
    expect(getActionSourceHref({ ...newAction, source: "Red Tag", sourceModule: "redTag", sourceId: "RT-EGM-ZA-001", sourceTitle: "RT-EGM-ZA-001" })).toBe("/5s/red/RT-EGM-ZA-001");
  });

  it("moves a Red Flag to awaiting closure when its Action completes without auto-closing it", async () => {
    vi.resetModules();
    const localStorage = storage();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00+05:30"));
    const store = await import("@/features/red-flag/red-flag-store");
    const actor = { id: "USR-LAKSHMAN", name: "Lakshman" };
    const flag = store.createRedFlag({ title: "Test safety issue", description: "Test condition", plant: "Egmore Plant", zone: "Zone A", location: "Test Cell", severity: "High", immediateActionTaken: true, containmentNote: "Area isolated", evidence: [] }, actor)!;
    expect(flag.id).toBe("RF-2026-015");
    store.linkRedFlagAction(flag.id, "ACT-RF-010", actor);
    store.reconcileRedFlagActions(MY_ACTIONS);
    expect(store.getRedFlag(flag.id)?.status).toBe("Awaiting Closure");
    expect(store.getRedFlag(flag.id)?.status).not.toBe("Closed");
    expect(store.getRedFlag(flag.id)?.activity.some((event) => event.type === "awaiting_closure")).toBe(true);
    expect(store.closeRedFlag(flag.id, "Verified at the source", actor)?.status).toBe("Closed");
    expect(store.reopenRedFlag(flag.id, "Guard is loose again", actor)?.status).toBe("In Progress");
  });
});
