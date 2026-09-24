import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getActionSourceHref } from "@/lib/actions/action-config";
import { getPriorityDueDate } from "@/lib/actions/action-configuration-store";

const dialogSource = readFileSync(resolve(process.cwd(), "features/actions/create-linked-action-dialog.tsx"), "utf8");
const walkSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-walk-page.tsx"), "utf8");
const detailSource = readFileSync(resolve(process.cwd(), "features/five-s/action-detail-page.tsx"), "utf8");

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

async function stores() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "gemba-action-test" });
  const [actions, gemba] = await Promise.all([
    import("@/lib/actions/action-store"),
    import("@/features/gemba/gemba-store"),
  ]);
  return { actions, gemba };
}

afterEach(() => vi.unstubAllGlobals());

const actor = { id: "USR-LAKSHMAN", name: "Lakshman" };

function createGembaAction(actions: Awaited<ReturnType<typeof stores>>["actions"], observationId: string, priority: "Low" | "High" = "Low") {
  return actions.createAction({
    title: "Improve point-of-use storage",
    description: "Move label stock closer to the workstation.",
    source: "Gemba",
    sourceTitle: "GEM-2026-015",
    sourceModule: "gemba",
    sourceId: "GEM-2026-015",
    sourceLabel: "Gemba",
    sourceLocation: "Egmore Plant · Zone A · CNC-03",
    sourceObservationId: observationId,
    sourceObservation: "Label stock is too far away",
    originalFinding: "Label stock is too far away",
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone A",
    assignedTo: "Ritika",
    responsiblePersonId: "USR-RITIKA",
    responsiblePersonName: "Ritika",
    createdByUserId: actor.id,
    createdByName: actor.name,
    auditor: actor.name,
    status: "Assigned",
    priority,
    dueDate: getPriorityDueDate(priority, new Date(2026, 8, 21)),
    actionCategory: "Process",
    issueEvidence: [],
  });
}

describe("Gemba → Action priority behavior", () => {
  it("marks Opportunity context as hidden/fixed Low and still derives its due date canonically", () => {
    expect(walkSource).toContain('defaultPriority: observation.type === "Opportunity" ? "Low" : undefined');
    expect(walkSource).toContain('hidePriority: observation.type === "Opportunity"');
    expect(dialogSource).toContain('context?.hidePriority');
    expect(dialogSource).toContain('context.defaultPriority ?? "Low"');
    expect(dialogSource).toContain('!context.hidePriority && <Field label="Priority *"');
    expect(dialogSource).toContain("getPriorityDueDate(effectivePriority)");
    expect(getPriorityDueDate("Low", new Date(2026, 8, 21))).toBe("2026-09-24");
  });

  it("keeps the normal selectable priority path for Issue context", () => {
    expect(dialogSource).toContain("setPriority");
    expect(dialogSource).toContain("actionPriorities.map");
    expect(walkSource).toContain('defaultPriority: observation.type === "Opportunity" ? "Low" : undefined');
  });
});

describe("Gemba → canonical Action traceability", () => {
  it("creates the canonical Action, links its ID to the observation, and resolves both directions", async () => {
    const { actions, gemba } = await stores();
    const observation = gemba.saveGembaObservation("GEM-2026-015", {
      type: "Opportunity", title: "Label stock is too far away", description: "Move it closer.", location: "CNC-03", peopleInvolved: [], evidence: [], noActionReason: "Pending decision",
    }, actor)!;
    const action = createGembaAction(actions, observation.id);
    expect(gemba.linkGembaAction("GEM-2026-015", observation.id, action.id, actor)).toBe(true);

    expect(actions.getActionById(action.id)).toMatchObject({ id: action.id, priority: "Low", sourceModule: "gemba", sourceId: "GEM-2026-015", sourceObservationId: observation.id });
    expect(gemba.getGembaState().observations.find((item) => item.id === observation.id)).toMatchObject({ actionId: action.id, noActionReason: undefined });
    expect(getActionSourceHref(action)).toBe(`/gemba/GEM-2026-015?tab=observations#${observation.id}`);
  });

  it("prevents duplicate links and rolls back a newly-created canonical Action when linking fails", async () => {
    const { actions, gemba } = await stores();
    const action = createGembaAction(actions, "MISSING-OBSERVATION", "High");
    expect(gemba.linkGembaAction("GEM-2026-015", "MISSING-OBSERVATION", action.id, actor)).toBe(false);
    expect(actions.rollbackCreatedAction(action.id)).toBe(true);
    expect(actions.getActionById(action.id)).toBeUndefined();
    expect(gemba.getGembaWalk("GEM-2026-015")?.actionIds).not.toContain(action.id);
  });

  it("renders the canonical Action detail with one compact, clickable Gemba source reference", () => {
    expect(detailSource).toContain('[source.label, action.sourceId ?? action.sourceTitle, action.sourceObservationId].filter(Boolean).join(" · ")');
    expect(detailSource).toContain('render={<Link href={sourceHref} />}');
    expect(detailSource).toContain("action.sourceObservation ?? action.originalFinding ?? action.description");
  });

  it("does not offer or persist Why no Action when an observation already has a linked Action", () => {
    expect(walkSource).toContain('correctiveActionNeeded === false && !observation?.actionId && <Field label="Reason corrective action is not required (optional)"');
    expect(walkSource).toContain('correctiveActionNeeded: type === "Positive" ? undefined : observation?.actionId ? true : correctiveActionNeeded');
    expect(walkSource).toContain('correctiveActionNeeded === false && !observation?.actionId ? noActionReason.trim() || undefined : undefined');
  });
});
