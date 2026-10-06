import { afterEach, describe, expect, it, vi } from "vitest";

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

async function actionStore(localStorage = storage()) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "step-persistence" });
  return { store: await import("@/lib/actions/action-store"), localStorage };
}

afterEach(() => vi.unstubAllGlobals());

describe("canonical Action step persistence", () => {
  it("preserves Overview, evidence, assignment, and source metadata through reload and lifecycle transitions", async () => {
    const { store, localStorage } = await actionStore();
    const owner = { id: "USR-RITIKA", name: "Ritika" };
    const reviewer = { id: "USR-LAKSHMAN", name: "Lakshman" };
    const action = store.createAction({
      title: "Repair fixture", description: "Replace damaged fixture", source: "Gemba", sourceTitle: "GEM-001",
      sourceModule: "gemba", sourceId: "GEM-001", sourceObservationId: "OBS-001", sourceObservation: "Fixture is damaged",
      sourceLocation: "Egmore Plant · Zone A · Cell 1", originalFinding: "Fixture is damaged", plant: "Egmore Plant",
      department: "Production", area: "Zone A", assignedTo: owner.name, responsiblePersonId: owner.id,
      responsiblePersonName: owner.name, assignedByUserId: reviewer.id, assignedByName: reviewer.name,
      zoneLeaderId: reviewer.id, zoneLeaderName: reviewer.name, createdByUserId: reviewer.id, createdByName: reviewer.name,
      auditor: reviewer.name, status: "Assigned", priority: "Medium", dueDate: "2026-10-10", actionCategory: "Repair",
      issueEvidence: [],
    });

    store.startAssignedAction(action.id, owner);
    store.updateAction(action.id, {
      actionTakenDescription: "Replace damaged fixture", resolutionObservation: "Replace damaged fixture",
      correctiveActionCategory: "Design / Equipment Modification", costSaving: 5000, currency: "INR",
    });
    store.addActionEvidence(action.id, { id: "AFTER-1", name: "after.jpg", type: "image", uploadedAt: "2026-10-05", uploadedBy: owner.name, url: "data:image/jpeg;base64,after" }, owner);
    store.updateAction(action.id, { costSaving: 5500 });

    const afterEvidence = store.getActionById(action.id)!;
    expect(afterEvidence).toMatchObject({ resolutionObservation: "Replace damaged fixture", correctiveActionCategory: "Design / Equipment Modification", costSaving: 5500, sourceId: "GEM-001", responsiblePersonId: owner.id });
    expect(afterEvidence.evidence).toHaveLength(1);

    const reloaded = (await actionStore(localStorage)).store;
    expect(reloaded.getActionById(action.id)).toMatchObject({ resolutionObservation: "Replace damaged fixture", correctiveActionCategory: "Design / Equipment Modification", costSaving: 5500, evidence: [expect.objectContaining({ id: "AFTER-1" })] });
    expect(reloaded.submitActionForReview(action.id, owner, { observation: "Replace damaged fixture", correctiveActionCategory: "Design / Equipment Modification", costSaving: 5000 })).toMatchObject({ status: "Pending Auditor Review", sourceId: "GEM-001", responsiblePersonId: owner.id });
    expect(reloaded.closeReviewedAction(action.id, reviewer)).toMatchObject({ status: "Completed", resolutionObservation: "Replace damaged fixture", correctiveActionCategory: "Design / Equipment Modification", costSaving: 5000, evidence: [expect.objectContaining({ id: "AFTER-1" })] });
  });
});

describe("canonical linked Action assignment", () => {
  it("normalizes current-user IDs and keeps Responsible, Assigned By, and Zone Leader distinct", async () => {
    await actionStore();
    const { findEligibleActionMember, createCanonicalLinkedAction } = await import("@/features/actions/create-linked-action-dialog");
    expect(findEligibleActionMember([{ id: "USR-SIVA-KUMAR", name: "Siva Kumar" }], " usr-siva-kumar ")).toMatchObject({ name: "Siva Kumar" });
    const action = createCanonicalLinkedAction({
      source: "Red Tag", sourceModule: "redTag", sourceId: "RT-EGM-ZB-005", sourceObservation: "Decision · Relocate · Reason · Unused old fixture",
      title: "Relocate fixture", description: "Unused old fixture", plant: "Egmore Plant", zone: "Zone B", location: "Production", evidence: [], sourceEvidenceCount: 1,
    }, " usr-siva-kumar ", { id: "USR-SIVA-KUMAR", name: "Siva Kumar" }, "Organization & Layout");
    expect(action).toMatchObject({ responsiblePersonId: "USR-SIVA-KUMAR", responsiblePersonName: "Siva Kumar", assignedByUserId: "USR-SIVA-KUMAR", assignedByName: "Siva Kumar", zoneLeaderId: "USR-RUMESH", zoneLeaderName: "Rumesh" });
  });
});
