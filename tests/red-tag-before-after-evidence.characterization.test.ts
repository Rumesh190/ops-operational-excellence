import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_USERS } from "@/lib/current-user";

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

async function setup() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `feedback-34-${++sequence}` });
  return { store: await import("@/features/five-s/red-tag/store"), localStorage };
}

afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });

const creator = DEMO_USERS.auditor;
const reviewer = DEMO_USERS.leader;
const beforeUrl = "data:image/jpeg;base64,before-photo";
const after = [{ id: "RTE-AFTER", name: "after.jpg", url: "data:image/jpeg;base64,after-photo", uploadedBy: reviewer.name, uploadedAt: "2026-09-24T08:00:00.000Z" }];

function input(imageUrl = beforeUrl) {
  return { plant: creator.plant, zone: "Zone A", section: "Bay 4", department: "Production", category: "Equipment" as const, itemName: "Disposition fixture", quantity: 1, reason: "Undefined Items" as const, remarks: "Requires disposition", imageUrl, createdById: creator.id, createdByName: creator.name };
}

function decision(store: Awaited<ReturnType<typeof setup>>["store"], type: "keep" | "relocate" | "return" | "repair" | "sell_reuse" | "scrap" | "further_evaluation") {
  const tag = store.createRedTagV2(input(beforeUrl), creator)!;
  store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator);
  return store.recordRedTagDecision(tag.id, { decision: type, comments: "Approved" }, reviewer)!;
}

describe("Feedback #34 Red Tag before and after evidence", () => {
  it("requires and persists one identification image as Before without requiring After at creation", async () => {
    const { store } = await setup();
    const missingBefore = input();
    Reflect.deleteProperty(missingBefore, "imageUrl");
    expect(store.createRedTagV2(missingBefore, creator)).toBeUndefined();
    const tag = store.createRedTagV2(input(beforeUrl), creator)!;
    expect(tag).toMatchObject({ imageUrl: beforeUrl });
    expect(store.getRedTag(tag.id)).toMatchObject({ imageUrl: beforeUrl });
  });

  it("keeps notes, responsible confirmation, After evidence, and linked Action completion as disposition guards", async () => {
    const { store } = await setup();
    const tag = decision(store, "relocate");
    store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-10-01", executionNotes: "Move fixture" }, reviewer);
    expect(store.completeRedTagDisposition(tag.id, { evidence: after, completionNotes: "", responsibleConfirmed: true }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, { evidence: after, completionNotes: "Moved", responsibleConfirmed: false }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, { evidence: [], completionNotes: "Moved", responsibleConfirmed: true }, reviewer)).toBeUndefined();
    store.linkRedTagAction(tag.id, "ACT-34", reviewer);
    expect(store.completeRedTagDisposition(tag.id, { evidence: after, completionNotes: "Moved", responsibleConfirmed: true }, reviewer)).toBeUndefined();
    expect(store.getRedTag(tag.id)?.status).toBe("Disposition In Progress");
  });

  it.each(["relocate", "return", "repair", "sell_reuse", "scrap"] as const)("closes %s directly after valid disposition evidence", async (type) => {
    const { store } = await setup();
    const tag = decision(store, type);
    store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-10-01", executionNotes: "Execute approved disposition" }, reviewer);
    const closed = store.completeRedTagDisposition(tag.id, { evidence: after, completionNotes: "Physical work complete", responsibleConfirmed: true }, reviewer)!;
    expect(closed).toMatchObject({ status: "Closed", afterEvidence: after });
    expect(closed.history.map((event) => event.type)).not.toEqual(expect.arrayContaining(["awaiting_verification", "verified", "verification_failed"]));
  });

  it("does not require After for Keep and preserves Further Evaluation's final-decision guard", async () => {
    const { store } = await setup();
    const keep = decision(store, "keep");
    expect(store.confirmRedTagKeep(keep.id, "Retain calibrated master", reviewer)).toMatchObject({ status: "Closed" });
    expect(store.verifyRedTagDisposition(keep.id, { passed: true, details: "Retained state checked" }, reviewer)).toBeUndefined();
    expect(store.getRedTag(keep.id)?.afterEvidence).toBeUndefined();

    const pending = decision(store, "further_evaluation");
    expect(store.startRedTagDisposition(pending.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-10-01" }, reviewer)).toBeUndefined();
    expect(store.closeRedTag(pending.id, reviewer)).toBeUndefined();
  });

  it("enforces missing Before and missing After in the canonical close function", async () => {
    const { store, localStorage } = await setup();
    const tag = store.createRedTagV2(input(beforeUrl), creator)!;
    const key = store.RED_TAG_STORAGE_KEY;
    const saved = JSON.parse(localStorage.getItem(key)!) as Array<Record<string, unknown>>;
    Object.assign(saved[0], { status: "Awaiting Verification", closure: { verificationResult: "Passed", verificationDetails: "Checked", verifiedAt: "2026-09-24T09:00:00.000Z", verifiedByUserId: reviewer.id, verifiedByName: reviewer.name } });
    localStorage.setItem(key, JSON.stringify(saved));
    vi.resetModules();
    let reloaded = await import("@/features/five-s/red-tag/store");
    expect(reloaded.closeRedTag(tag.id, reviewer)).toBeUndefined();
    saved[0].afterEvidence = after;
    saved[0].imageUrl = undefined;
    localStorage.setItem(key, JSON.stringify(saved));
    vi.resetModules();
    reloaded = await import("@/features/five-s/red-tag/store");
    expect(reloaded.closeRedTag(tag.id, reviewer)).toBeUndefined();
    saved[0].imageUrl = beforeUrl;
    localStorage.setItem(key, JSON.stringify(saved));
    vi.resetModules();
    reloaded = await import("@/features/five-s/red-tag/store");
    expect(reloaded.closeRedTag(tag.id, reviewer)).toMatchObject({ status: "Closed" });
  });

  it("safely closes complete legacy records, retains incomplete ones, and never reopens historical Closed records", async () => {
    const { store } = await setup();
    const legacy = store.createRedTagV2(input(beforeUrl), creator)!;
    const dispositionEvidence = after;
    const legacyClosure = { verificationResult: "Passed" as const, verificationDetails: "Historical verification", verifiedAt: "2026-09-24T09:00:00.000Z", verifiedByUserId: reviewer.id, verifiedByName: reviewer.name };
    const completeDisposition = { decision: "scrap" as const, responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-10-01", startedAt: "2026-09-24T07:00:00.000Z", startedByUserId: reviewer.id, startedByName: reviewer.name, executionNotes: "Scrap in approved area", completedAt: "2026-09-24T08:00:00.000Z", completedByUserId: reviewer.id, completedByName: reviewer.name, completionNotes: "Scrapped", responsibleConfirmed: true, evidence: dispositionEvidence };
    const decisionRecord = { type: "scrap" as const, decidedAt: "2026-09-24T06:00:00.000Z", decidedByUserId: reviewer.id, decidedByName: reviewer.name };
    const normalized = store.normalizeRedTag({ ...legacy, status: "Awaiting Verification", closure: legacyClosure, decisionRecord, dispositionDetails: completeDisposition });
    expect(normalized.imageUrl).toBe(beforeUrl);
    expect(normalized.afterEvidence).toBe(dispositionEvidence);
    expect(normalized.status).toBe("Closed");
    expect(normalized.closedAt).toBe(completeDisposition.completedAt);
    expect(normalized.closure).toEqual(legacyClosure);
    expect(store.normalizeRedTag({ ...legacy, status: "Awaiting Verification", decisionRecord, dispositionDetails: { ...completeDisposition, completionNotes: undefined } }).status).toBe("Disposition In Progress");
    expect(store.normalizeRedTag({ ...normalized, status: "Closed", afterEvidence: [] }).status).toBe("Closed");
  });

  it("keeps UI evidence roles, camera/upload semantics, detail comparison, Action separation, and QR identity explicit", async () => {
    const source = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(source).toContain('label="Before Photo *"');
    expect(source).toContain('label="After Photo *"');
    expect(source).toContain("OpsCameraCapture");
    expect(source).toContain("Disposition Outcome");
    expect(source).toContain('<DispositionEvidence title="Before"');
    expect(source).toContain('<DispositionEvidence title="After"');
    expect(source).toContain("Add a photo to create this Red Tag.");
    expect(source).toContain("evidence: []");
    const { getRedTagQrTarget } = await import("@/features/five-s/red-tag/qr");
    expect(getRedTagQrTarget("RT-EGM-ZA-034", "https://ops.example")).toBe("https://ops.example/5s/red/RT-EGM-ZA-034");
  });

  it("uses canonical Before and After evidence once in the completed outcome without active verification UI", () => {
    const source = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(source.match(/<DispositionEvidence title="Before"/g)).toHaveLength(1);
    expect(source.match(/<DispositionEvidence title="After"/g)).toHaveLength(1);
    for (const removed of ["Verification and Closure", "Record Verification", "Verification Comments", "Verification Result"]) expect(source).not.toContain(removed);
  });

  it("reports one disposition outcome with one Before and one After source and no verification section", () => {
    const source = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-report-page.tsx"), "utf8");
    expect(source.match(/title="Disposition Outcome"/g)).toHaveLength(1);
    expect(source.match(/label="Before Evidence"/g)).toHaveLength(2); // Keep and physical branches each define one mutually exclusive source.
    expect(source.match(/label="After Evidence"/g)).toHaveLength(1);
    for (const removed of ["Verification Result", "Verification Comments", "Verified By", "Verification Date"]) expect(source).not.toContain(removed);
  });
});
