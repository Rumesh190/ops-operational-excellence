import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveGembaCorrectiveActionNeeded, type GembaObservation } from "@/features/gemba/types";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const walkSource = source("features/gemba/gemba-walk-page.tsx");
const storeSource = source("features/gemba/gemba-store.ts");
const reportSource = source("features/gemba/gemba-report-page.tsx");
const cardSource = source("features/gemba/gemba-components.tsx");
const actionDialogSource = source("features/actions/create-linked-action-dialog.tsx");

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

async function gembaStore() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "feedback-27" });
  return import("@/features/gemba/gemba-store");
}

const actor = { id: "USR-LAKSHMAN", name: "Lakshman" };
const legacy = (patch: Partial<GembaObservation>): GembaObservation => ({ id: "OBS-LEGACY", gembaId: "GEM-2026-015", type: "Issue", title: "Guard missing", description: "Guard missing", location: "CNC-03", peopleInvolved: [], evidence: [], createdById: actor.id, createdByName: actor.name, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", ...patch });

afterEach(() => vi.unstubAllGlobals());

describe("Team Feedback #27 — Gemba corrective-action decision", () => {
  it("makes the existing Gemba Action/Why-no-Action choice explicit", () => {
    expect(walkSource).toContain("Corrective Action Needed?");
    expect(walkSource).toContain("setCorrectiveActionNeeded(true)");
    expect(walkSource).toContain("setCorrectiveActionNeeded(false)");
    expect(walkSource).toContain("Reason corrective action is not required (optional)");
  });

  it("derives legacy decisions without migrating records", () => {
    expect(resolveGembaCorrectiveActionNeeded(legacy({ actionId: "ACT-001" }))).toBe(true);
    expect(resolveGembaCorrectiveActionNeeded(legacy({ noActionReason: "Corrected immediately" }))).toBe(false);
    expect(resolveGembaCorrectiveActionNeeded(legacy({}))).toBeUndefined();
    expect(resolveGembaCorrectiveActionNeeded(legacy({ type: "Positive" }))).toBeUndefined();
  });

  it("persists Yes and No on the source observation without embedding an Action", async () => {
    const gemba = await gembaStore();
    const yes = gemba.saveGembaObservation("GEM-2026-015", { type: "Opportunity", title: "Move labels", description: "Move labels", location: "CNC-03", peopleInvolved: [], evidence: [], correctiveActionNeeded: true }, actor)!;
    const no = gemba.saveGembaObservation("GEM-2026-015", { type: "Opportunity", title: "Cleaned now", description: "Cleaned now", location: "CNC-04", peopleInvolved: [], evidence: [], correctiveActionNeeded: false, noActionReason: "Corrected immediately" }, actor)!;
    expect(yes).toMatchObject({ correctiveActionNeeded: true });
    expect(yes).not.toHaveProperty("actionId");
    expect(no).toMatchObject({ correctiveActionNeeded: false, noActionReason: "Corrected immediately" });
    expect(no).not.toHaveProperty("actionId");
  });

  it("uses one canonical Action path and prevents duplicate links", async () => {
    const gemba = await gembaStore();
    const observation = gemba.saveGembaObservation("GEM-2026-015", { type: "Opportunity", title: "Move labels", description: "Move labels", location: "CNC-03", peopleInvolved: [], evidence: [], correctiveActionNeeded: true }, actor)!;
    expect(gemba.linkGembaAction("GEM-2026-015", observation.id, "ACT-001", actor)).toBe(true);
    expect(gemba.linkGembaAction("GEM-2026-015", observation.id, "ACT-002", actor)).toBe(false);
    expect(gemba.getGembaState().observations.find((item) => item.id === observation.id)).toMatchObject({ actionId: "ACT-001", correctiveActionNeeded: true, noActionReason: undefined });
    expect(gemba.getGembaWalk("GEM-2026-015")?.actionIds.filter((id) => id === "ACT-001")).toHaveLength(1);
  });

  it("allows decision changes before linking but protects an existing linked Action", () => {
    expect(walkSource).toContain('disabled={Boolean(observation?.actionId)}');
    expect(walkSource).toContain("is already linked and will not be removed");
    expect(storeSource).toContain("if (!walk || !observation || observation.actionId) return false");
    expect(storeSource).not.toContain("unlinkGembaAction");
  });

  it("opens the existing canonical Action workflow only for Yes", () => {
    expect(walkSource).toContain("setCreateAction(true)");
    expect(walkSource).toContain("setCreateAction(false)");
    expect(walkSource).toContain("onSaved(saved, createAction && type !== \"Positive\" && !saved.actionId)");
    expect(actionDialogSource).toContain("createAction(");
    expect(actionDialogSource).toContain("actionPriorities.map");
    expect(actionDialogSource).toContain("getPriorityDueDate(effectivePriority)");
    expect(actionDialogSource).not.toContain('value="Critical"');
  });

  it("shows the compact decision and preserves historically accurate reporting", () => {
    expect(cardSource).toContain("Corrective Action:");
    expect(cardSource).toContain('"Not required"');
    expect(reportSource).toContain("resolveGembaCorrectiveActionNeeded(observation)");
    expect(reportSource).toContain("Reason corrective action is not required");
    expect(reportSource).toContain("observation.actionId");
  });

  it("leaves permissions, relationships, and module lifecycles on their existing paths", () => {
    expect(walkSource).toContain("canConductGembaWalk");
    expect(storeSource).toContain("event(\"action_created\"");
    expect(storeSource).not.toContain("CorrectiveActionV2");
    expect(source("lib/actions/action-store.ts")).toContain("export function createAction");
    expect(source("features/five-s/components/FiveSAuditExecution.tsx")).toContain("Open actions must be completed");
    expect(source("features/five-s/red-tag/red-tag-module.tsx")).toContain("Optional Execution Action");
  });
});
