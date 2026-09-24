import { afterEach, describe, expect, it, vi } from "vitest";

import { RED_TAG_DECISIONS, RED_TAG_DECISION_LABELS } from "@/features/five-s/red-tag/types";
import { DEMO_USERS } from "@/lib/current-user";

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

async function redTagStore(initial: Record<string, string> = {}) {
  vi.resetModules();
  const localStorage = storage(initial);
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `v2-${++sequence}` });
  const store = await import("@/features/five-s/red-tag/store");
  return { store, localStorage };
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
});

const creator = DEMO_USERS.auditor;
const reviewer = DEMO_USERS.leader;
const evidence = [{ id: "RTE-V2-1", name: "after.jpg", url: "data:image/jpeg;base64,after", mimeType: "image/jpeg", uploadedBy: reviewer.name, uploadedAt: "2026-09-22T06:00:00.000Z" }];

function createTag(store: Awaited<ReturnType<typeof redTagStore>>["store"]) {
  return store.createRedTag({
    plant: creator.plant,
    zone: "Zone A",
    section: "Production",
    department: "Production",
    category: "Equipment",
    estimatedValue: 25000,
    itemName: "Obsolete fixture",
    quantity: 1,
    reason: "Undefined Items",
    remarks: "No longer used",
    imageUrl: "data:image/jpeg;base64,before",
    requiredAction: "Review for disposition",
    responsiblePersonId: reviewer.id,
    responsiblePersonName: reviewer.name,
    targetDate: "2026-09-30",
    createdById: creator.id,
    createdByName: creator.name,
  }, creator);
}

describe("Red Tag V2 canonical model", () => {
  it("uses stable decision values with centralized display labels", () => {
    expect(RED_TAG_DECISIONS).toEqual(["keep", "relocate", "return", "repair", "sell_reuse", "scrap", "further_evaluation"]);
    expect(RED_TAG_DECISION_LABELS.sell_reuse).toBe("Sell / Reuse");
    expect(RED_TAG_DECISION_LABELS.further_evaluation).toBe("Further Evaluation");
  });

  it("normalizes legacy statuses to the closest safe V2 state", async () => {
    const { store } = await redTagStore();
    expect(store.normalizeRedTagStatus("Open")).toBe("Open");
    expect(store.normalizeRedTagStatus("In Progress")).toBe("Under Review");
    expect(store.normalizeRedTagStatus("Resolved")).toBe("Awaiting Verification");
    expect(store.normalizeRedTagStatus("Closed")).toBe("Closed");
    expect(store.normalizeRedTagStatus("unknown-value")).toBe("Open");
  });
});

describe("Red Tag V2 lifecycle commands", () => {
  it("enforces ordered transitions, required metadata, audit history, and terminal closure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T05:00:00.000Z"));
    const { store } = await redTagStore();
    const tag = createTag(store);

    expect(store.recordRedTagDecision(tag.id, { decision: "scrap" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, evidence, reviewer)).toBeUndefined();
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Disposed" }, reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();

    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name, comments: "Review requested" }, creator)).toMatchObject({ status: "Under Review", review: { reviewerId: reviewer.id, reviewerName: reviewer.name } });
    expect(store.recordRedTagDecision(tag.id, { decision: "scrap", comments: "Beyond repair" }, creator)).toBeUndefined();
    expect(store.recordRedTagDecision(tag.id, { decision: "scrap", comments: "Beyond repair" }, reviewer)).toMatchObject({ status: "Decision Made", decisionRecord: { type: "scrap", decidedByUserId: reviewer.id } });
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: "", responsiblePersonName: "", targetDate: "" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toMatchObject({ status: "Disposition In Progress", dispositionDetails: { decision: "scrap", responsiblePersonId: reviewer.id } });
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Too early" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, { evidence, completionNotes: "Disposed as approved", responsibleConfirmed: true }, reviewer)).toMatchObject({ status: "Awaiting Verification", dispositionDetails: { completedByUserId: reviewer.id } });

    expect(store.verifyRedTagDisposition(tag.id, { passed: false, details: "Item remains in area" }, reviewer)).toMatchObject({ status: "Awaiting Verification", closure: { verificationResult: "Failed" } });
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Item removed and area clear" }, reviewer)).toMatchObject({ closure: { verificationResult: "Passed", verifiedByUserId: reviewer.id } });
    expect(store.closeRedTag(tag.id, reviewer)).toMatchObject({ status: "Closed", closure: { closedByUserId: reviewer.id } });

    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator)).toBeUndefined();
    expect(store.recordRedTagDecision(tag.id, { decision: "keep" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, [], reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();

    const saved = store.getRedTag(tag.id)!;
    expect(saved.review?.reviewedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.decisionRecord?.decidedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.dispositionDetails?.completedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.closure?.closedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.history.map((item) => item.type)).toEqual([
      "created", "review_submitted", "reviewed", "decision_recorded", "disposition_started",
      "disposition_completed", "awaiting_verification", "verification_failed", "verified", "closed",
    ]);
    expect(saved.history.every((item) => item.actor && item.at)).toBe(true);
  });
});

describe("Red Tag V2 legacy compatibility", () => {
  it("preserves identity, QR reference fields, evidence, history, Action reference, and unrelated storage", async () => {
    const legacy = {
      id: "RT-EGM-ZA-077", tagNumber: "RT-EGM-ZA-077", plant: "Egmore Plant", zone: "Zone A", section: "Stores",
      itemName: "Old trolley", quantity: 1, reason: "Undefined Items", remarks: "Unused", requiredAction: "Review",
      responsiblePersonId: "USR-SIVA", responsiblePersonName: "Siva", targetDate: "2026-09-30", status: "Resolved",
      createdById: creator.id, createdByName: creator.name, createdAt: "2026-09-01T00:00:00.000Z",
      imageUrl: "data:image/jpeg;base64,before", actionId: "ACT-LEGACY-77",
      afterEvidence: evidence, history: [{ id: "RTH-LEGACY", type: "created", label: "Red Tag created", actor: creator.name, at: "2026-09-01T00:00:00.000Z" }],
    };
    const raw = JSON.stringify([legacy]);
    const { store, localStorage } = await redTagStore({ "five-s-red-tags-v1": raw, "unrelated-key": "preserve-me" });
    const loaded = store.getRedTag(legacy.id)!;

    expect(loaded).toMatchObject({ id: legacy.id, tagNumber: legacy.tagNumber, status: "Awaiting Verification", imageUrl: legacy.imageUrl, actionId: legacy.actionId });
    expect(loaded.afterEvidence).toEqual(evidence);
    expect(loaded.history).toEqual(legacy.history);
    expect(`/5s/red/${loaded.id}`).toBe("/5s/red/RT-EGM-ZA-077");
    expect(localStorage.getItem("five-s-red-tags-v1")).toBe(raw);
    expect(localStorage.getItem("unrelated-key")).toBe("preserve-me");
  });
});
