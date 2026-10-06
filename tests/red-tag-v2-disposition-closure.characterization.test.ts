import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { MyAction } from "@/features/five-s/types/my-actions";
import { DEMO_USERS } from "@/lib/current-user";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

async function setup() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `phase-3c-${++sequence}` });
  return import("@/features/five-s/red-tag/store");
}

afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });

const creator = DEMO_USERS.auditor;
const reviewer = DEMO_USERS.leader;
const evidence = [{ id: "RTE-3C", name: "complete.jpg", url: "data:image/jpeg;base64,complete", uploadedBy: reviewer.name, uploadedAt: "2026-09-22T08:00:00.000Z" }];

function create(store: Awaited<ReturnType<typeof setup>>, decision: "keep" | "relocate" | "return" | "repair" | "sell_reuse" | "scrap" | "further_evaluation") {
  const tag = store.createRedTagV2({ plant: creator.plant, zone: "Zone A", section: "Bay 2", department: "Production", category: "Equipment", itemName: "Old fixture", quantity: 1, reason: "Undefined Items", remarks: "No longer required", imageUrl: "data:image/jpeg;base64,item", createdById: creator.id, createdByName: creator.name }, creator)!;
  store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator);
  return store.recordRedTagDecision(tag.id, { decision, comments: "Reviewed" }, reviewer)!;
}

function completedAction(id: string, status: MyAction["status"]): MyAction {
  return { id, title: "Execute disposition", description: "Relocate", source: "Red Tag", sourceTitle: "RT", sourceModule: "redTag", sourceId: "RT", plant: creator.plant, department: "Production", area: "Zone A", assignedTo: reviewer.name, status, priority: "Medium", dueDate: "2026-09-30", createdAt: "2026-09-22", evidence: [] };
}

describe("Red Tag V2 executable disposition", () => {
  it("recognizes a derived responsible person and reports only the genuinely missing start field", async () => {
    const { getRedTagDispositionStartErrors } = await import("@/features/five-s/red-tag/red-tag-module");
    expect(getRedTagDispositionStartErrors({ responsiblePersonId: reviewer.id, targetDate: "2026-10-10", executionNotes: "" })).toEqual({
      responsible: "", targetDate: "", executionNotes: "Enter execution notes.",
    });
    expect(getRedTagDispositionStartErrors({ responsiblePersonId: reviewer.id, targetDate: "2026-10-10", executionNotes: "Move the item to the approved storage area." })).toEqual({
      responsible: "", targetDate: "", executionNotes: "",
    });
  });

  it("allows an unstarted handling choice to be corrected", async () => {
    const store = await setup();
    const tag = create(store, "scrap");
    expect(store.setRedTagHandlingMode(tag.id, "direct", reviewer)).toMatchObject({ handlingMode: "direct" });
    expect(store.clearRedTagHandlingMode(tag.id, reviewer)).toMatchObject({ handlingMode: undefined });
    expect(store.setRedTagHandlingMode(tag.id, "linked_action", reviewer)).toMatchObject({ handlingMode: "linked_action" });
    store.linkRedTagAction(tag.id, "ACT-LOCKED", reviewer);
    expect(store.clearRedTagHandlingMode(tag.id, reviewer)).toBeUndefined();
  });

  it("uses linked Action completion as execution and imports its image evidence", async () => {
    const store = await setup();
    const tag = create(store, "repair");
    store.setRedTagHandlingMode(tag.id, "linked_action", reviewer);
    store.linkRedTagAction(tag.id, "ACT-EXECUTION", reviewer);
    const completed = {
      ...completedAction("ACT-EXECUTION", "Completed"),
      evidence: [{ id: "ACTION-AFTER", name: "repair-complete.jpg", type: "image" as const, url: "data:image/jpeg;base64,repaired", uploadedAt: "2026-09-30T08:00:00.000Z", uploadedBy: reviewer.name }],
    };

    store.reconcileRedTagActions([completed]);

    const reconciled = store.getRedTag(tag.id);
    expect(reconciled).toMatchObject({
      status: "Disposition In Progress",
      afterEvidence: [expect.objectContaining({ id: "ACTION-AFTER", url: "data:image/jpeg;base64,repaired" })],
      dispositionDetails: expect.objectContaining({ decision: "repair", responsiblePersonName: reviewer.name }),
    });
  });

  it("uses canonical Action source navigation, excludes image binaries, and returns link failure for rollback", () => {
    const moduleSource = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    const actionConfig = readFileSync(resolve(process.cwd(), "lib/actions/action-config.ts"), "utf8");
    expect(moduleSource).toContain('source: "Red Tag", sourceModule: "redTag", sourceId: tag.id');
    expect(moduleSource).toContain("Decision · ${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]}");
    expect(moduleSource).toContain("evidence: []");
    expect(moduleSource).toContain("if (!linked) return false");
    expect(moduleSource).toContain('<ReadOnly label="Responsible Person" value={responsible?.name ?? user.name} />');
    expect(moduleSource).toContain("goBackToHandlingChoice");
    expect(moduleSource).toContain('if (tag.handlingMode === "linked_action" && action?.status !== "Completed") return null');
    expect(actionConfig).toContain('if (moduleId === "redTag") return `/5s/red/${encodeURIComponent(sourceId)}`');
  });

  it("keeps disposition completion clickable for form validation and explains lifecycle blockers", () => {
    const moduleSource = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(moduleSource).toContain("Enter completion notes.");
    expect(moduleSource).toContain("Add an After photo to complete the disposition.");
    expect(moduleSource).toContain("Confirm that the disposition work is complete.");
    expect(moduleSource).toContain("completionTargets.current");
    expect(moduleSource).toContain("target?.scrollIntoView");
    expect(moduleSource).toContain("if (completionLock.current) return");
    expect(moduleSource).toContain("disabled={completing}");
    expect(moduleSource).not.toContain('disabled={!completionNotes.trim() || !responsibleConfirmed || !evidence.length');
    expect(moduleSource).toContain("Complete the linked Action {tag.actionId} before closing this disposition.");
    expect(moduleSource.match(/completeRedTagDisposition\(/g)).toHaveLength(1);
  });

  it("keeps direct disposition responsibility derived from one canonical current-user identity", () => {
    const moduleSource = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(moduleSource).toContain('tag.dispositionDetails?.responsiblePersonId ?? (tag.handlingMode === "direct" ? user.id : "")');
    expect(moduleSource).toContain('const effectiveResponsibleId = tag.handlingMode === "direct" ? user.id : responsibleId');
    expect(moduleSource).toContain('value={responsible?.name ?? user.name}');
    expect(moduleSource).toContain('whitespace-pre-line text-sm text-destructive');
  });

  it("closes the direct path from one canonical disposition completion", async () => {
    const store = await setup();
    const tag = create(store, "scrap");
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30", executionNotes: "Move to scrap holding" }, reviewer)).toMatchObject({ status: "Disposition In Progress" });
    expect(store.completeRedTagDisposition(tag.id, [], reviewer)).toBeUndefined();
    const closed = store.completeRedTagDisposition(tag.id, { evidence, completionNotes: "Transferred to approved holding area", responsibleConfirmed: true }, reviewer)!;
    expect(closed).toMatchObject({ status: "Closed", afterEvidence: evidence });
    expect(closed.closure).toBeUndefined();
    expect(closed.closedAt).toBeTruthy();
    expect(closed.dispositionDetails?.completedAt).toBeTruthy();
    expect(closed.history.map((event) => event.type)).toEqual(["created", "review_submitted", "reviewed", "decision_recorded", "disposition_started", "disposition_completed", "closed"]);
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-10-01" }, reviewer)).toBeUndefined();
  });

  it("requires a linked Action to complete while allowing an Action-free disposition", async () => {
    const store = await setup();
    const tag = create(store, "relocate");
    store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30", executionNotes: "Move to approved location" }, reviewer);
    expect(store.linkRedTagAction(tag.id, "ACT-3C-1", reviewer)).toBeTruthy();
    expect(store.linkRedTagAction(tag.id, "ACT-DUPLICATE", reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, evidence, reviewer)).toBeUndefined();
    store.reconcileRedTagActions([completedAction("ACT-3C-1", "Completed")]);
    expect(store.getRedTag(tag.id)?.status).toBe("Disposition In Progress");
    expect(store.completeRedTagDisposition(tag.id, { evidence, completionNotes: "Relocated as approved", responsibleConfirmed: true }, reviewer)).toMatchObject({ status: "Closed", actionId: "ACT-3C-1", syncedActionStatus: "Completed" });

    const direct = create(store, "return");
    store.startRedTagDisposition(direct.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30", executionNotes: "Return to supplier" }, reviewer);
    expect(store.completeRedTagDisposition(direct.id, { evidence, completionNotes: "Returned as approved", responsibleConfirmed: true }, reviewer)).toMatchObject({ status: "Closed" });
    expect(store.getRedTag(direct.id)?.actionId).toBeUndefined();
  });
});

describe("Red Tag V2 special decisions", () => {
  it("closes Keep directly after confirmation without disposition, verification, evidence, or Action", async () => {
    const store = await setup();
    const tag = create(store, "keep");
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    const closed = store.confirmRedTagKeep(tag.id, "", reviewer)!;
    expect(closed.status).toBe("Closed");
    expect(closed.actionId).toBeUndefined();
    expect(closed.dispositionDetails).toBeUndefined();
    expect(closed.afterEvidence).toBeUndefined();
    expect(closed.closure).toBeUndefined();
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Not required", evidence }, creator)).toBeUndefined();
    expect(closed.history.map((event) => event.type)).toContain("keep_confirmed");
  });

  it("blocks Further Evaluation until an audited final decision replaces it", async () => {
    const store = await setup();
    const tag = create(store, "further_evaluation");
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    expect(store.confirmRedTagKeep(tag.id, "Keep", reviewer)).toBeUndefined();
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "No" }, reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();
    expect(store.updateFurtherEvaluationDecision(tag.id, "relocate", "Engineering review complete", reviewer)).toMatchObject({ status: "Decision Made", decisionRecord: { type: "relocate" } });
    const updated = store.getRedTag(tag.id)!;
    expect(updated.history.find((event) => event.type === "decision_recorded")?.label).toContain("further_evaluation");
    expect(updated.history.find((event) => event.type === "decision_updated")?.label).toContain("relocate");
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30", executionNotes: "Move after engineering approval" }, reviewer)).toMatchObject({ status: "Disposition In Progress" });
  });
});
