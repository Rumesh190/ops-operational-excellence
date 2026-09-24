import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getRedTagLifecycleStageIndex, RED_TAG_DECISIONS, RED_TAG_LIFECYCLE_STAGES } from "@/features/five-s/red-tag/types";
import { DEMO_USERS } from "@/lib/current-user";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

async function redTagStore() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `phase-3b-${++sequence}` });
  return import("@/features/five-s/red-tag/store");
}

afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });

const creator = DEMO_USERS.auditor;
const reviewer = DEMO_USERS.leader;
const validInput = {
  plant: creator.plant, zone: "Zone A", section: "Assembly Bay 2", department: "Production", category: "Equipment" as const,
  estimatedValue: 17500, itemName: "Obsolete fixture", quantity: 1, reason: "Undefined Items" as const,
  remarks: "Fixture is no longer used by the current line.", createdById: creator.id, createdByName: creator.name,
  imageUrl: "data:image/jpeg;base64,physical-item",
};

describe("Red Tag V2 create", () => {
  it("requires the physical item context and photo before creating", async () => {
    const store = await redTagStore();
    expect(store.createRedTagV2({ ...validInput, imageUrl: "" }, creator)).toBeUndefined();
    expect(store.createRedTagV2({ ...validInput, itemName: "" }, creator)).toBeUndefined();
    expect(store.createRedTagV2({ ...validInput, remarks: "" }, creator)).toBeUndefined();
    expect(store.createRedTagV2({ ...validInput, section: "" }, creator)).toBeUndefined();
    expect(store.createRedTagV2({ ...validInput, department: "" }, creator)).toBeUndefined();
    expect(store.createRedTagV2({ ...validInput, quantity: 0 }, creator)).toBeUndefined();
  });

  it("preserves generated identity, opens the lifecycle, creates history, and does not create an Action", async () => {
    const store = await redTagStore();
    const tag = store.createRedTagV2(validInput, creator)!;
    expect(tag).toMatchObject({ id: "RT-EGM-ZA-002", tagNumber: "RT-EGM-ZA-002", status: "Open" });
    expect(tag.id).toBe(tag.tagNumber);
    expect(tag.actionId).toBeUndefined();
    expect(tag.history).toHaveLength(1);
    expect(tag.history[0]).toMatchObject({ type: "created", label: "Red Tag created", actor: creator.name });
    expect(store.getRedTag(tag.id)?.imageUrl).toBe(validInput.imageUrl);
  });
});

describe("Red Tag V2 review and decision", () => {
  it("uses lifecycle commands for reviewer/date, canonical decision, comments, history, and transition guards", async () => {
    const store = await redTagStore();
    const tag = store.createRedTagV2(validInput, creator)!;
    expect(store.recordRedTagDecision(tag.id, { decision: "relocate", comments: "Move it" }, reviewer)).toBeUndefined();
    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator)).toMatchObject({ status: "Under Review", review: { reviewerId: reviewer.id } });
    expect(store.recordRedTagDecision(tag.id, { decision: "not-canonical" as never }, reviewer)).toBeUndefined();
    expect(store.recordRedTagDecision(tag.id, { decision: "relocate", comments: "Move to the central tool store" }, creator)).toBeUndefined();
    const decided = store.recordRedTagDecision(tag.id, { decision: "relocate", comments: "Move to the central tool store" }, reviewer)!;
    expect(RED_TAG_DECISIONS).toContain(decided.decisionRecord?.type);
    expect(decided).toMatchObject({ status: "Decision Made", review: { reviewerId: reviewer.id, reviewerName: reviewer.name, comments: "Move to the central tool store" }, decisionRecord: { type: "relocate", decidedByUserId: reviewer.id, comments: "Move to the central tool store" } });
    expect(decided.review?.submittedAt).toBeTruthy();
    expect(decided.review?.reviewedAt).toBeTruthy();
    expect(decided.history.map((event) => event.type)).toEqual(["created", "review_submitted", "reviewed", "decision_recorded"]);
    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator)).toBeUndefined();
  });
});

describe("Red Tag Phase 3B UI contract", () => {
  it("maps each lifecycle status to the compact shared stages", () => {
    expect(RED_TAG_LIFECYCLE_STAGES).toEqual(["Tagged", "Review", "Decision", "Disposition", "Verification", "Closed"]);
    expect(["Open", "Under Review", "Decision Made", "Disposition In Progress", "Awaiting Verification", "Closed"].map((status) => getRedTagLifecycleStageIndex(status as never))).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps original context, status-specific CTAs, legacy fallbacks, and established QR identity in the detail implementation", () => {
    const source = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    for (const text of ["Before / After Evidence", "Item Description", "Quantity", "Location", "Department", "Reason", "Category", "Estimated Value", "Identified By", "Identified Date"]) expect(source).toContain(text);
    expect(source).toContain("Submit for Review");
    expect(source).toContain("Record Decision");
    expect(source).toContain("tag.review?.reviewerId === user.id");
    expect(source).toContain('tag.category ?? "Not recorded"');
    expect(source).toContain("tag.department ?? \"Not recorded\"");
    expect(source).toContain("No description added.");
    expect(source).toContain("QrCode value={qrTarget}");
    expect(source).toContain("createRedTagV2");
    expect(source).not.toContain("status: \"Under Review\"");
  });
});
