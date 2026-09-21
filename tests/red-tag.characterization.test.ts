import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { RED_TAG_STORAGE_KEY } from "@/features/five-s/red-tag/store";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { DEMO_USERS } from "@/lib/current-user";
import { canCreateRedTag } from "@/features/five-s/red-tag/access";
import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });

describe("5S Red Tag identity and compatibility", () => {
  it("keeps its established storage key and loads existing RT records", async () => {
    const existing = [{ id: "RT-EGM-ZA-042", tagNumber: "RT-EGM-ZA-042", plant: "Egmore Plant", zone: "Zone A" }];
    const localStorage = storage({ [RED_TAG_STORAGE_KEY]: JSON.stringify(existing) });
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    const store = await import("@/features/five-s/red-tag/store");
    expect(store.RED_TAG_STORAGE_KEY).toBe("five-s-red-tags-v1");
    expect(store.getRedTag("RT-EGM-ZA-042")?.tagNumber).toBe("RT-EGM-ZA-042");
    expect(store.getNextTagNumber("ZA")).toBe("RT-EGM-ZA-043");
  });

  it("normalizes legacy Resolved records without rewriting the storage key or required Action text", async () => {
    const existing = [{ id: "RT-EGM-ZA-010", tagNumber: "RT-EGM-ZA-010", plant: "Egmore Plant", zone: "Zone A", status: "Resolved", requiredAction: "Move the obsolete fixture", history: [] }];
    const localStorage = storage({ [RED_TAG_STORAGE_KEY]: JSON.stringify(existing) });
    vi.stubGlobal("window", { localStorage, alert: vi.fn() }); vi.stubGlobal("localStorage", localStorage);
    const store = await import("@/features/five-s/red-tag/store");
    expect(store.getRedTag("RT-EGM-ZA-010")).toMatchObject({ status: "Awaiting Verification", requiredAction: "Move the obsolete fixture" });
    expect(JSON.parse(localStorage.getItem(RED_TAG_STORAGE_KEY)!)[0].status).toBe("Resolved");
  });

  it("links exactly one canonical Red Tag Action with explicit source metadata", async () => {
    const localStorage = storage(); vi.stubGlobal("window", { localStorage, alert: vi.fn() }); vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const redTags = await import("@/features/five-s/red-tag/store");
    const actions = await import("@/lib/actions/action-store");
    const actor = DEMO_USERS.auditor;
    const tag = redTags.createRedTag({ plant: actor.plant, zone: "Zone A", section: "Production", itemName: "Obsolete jig", quantity: 1, reason: "Undefined Items", remarks: "Unused", requiredAction: "Remove from cell", responsiblePersonId: "USR-SIVA-KUMAR", responsiblePersonName: "Siva Kumar", targetDate: "2026-09-20", createdById: actor.id, createdByName: actor.name }, actor);
    const action = actions.createAction({ title: `Clear ${tag.tagNumber}`, description: tag.requiredAction, source: "Red Tag", sourceTitle: tag.id, sourceModule: "redTag", sourceId: tag.id, sourceLabel: "Red Tag", sourceLocation: `${tag.plant} · ${tag.zone} · ${tag.section}`, sourceObservation: tag.remarks, originalFinding: tag.remarks, plant: tag.plant, department: "Production", area: tag.zone, assignedTo: tag.responsiblePersonName, responsiblePersonId: tag.responsiblePersonId, responsiblePersonName: tag.responsiblePersonName, createdByUserId: actor.id, createdByName: actor.name, auditor: actor.name, status: "Assigned", priority: "Medium", dueDate: tag.targetDate, issueEvidence: [] });
    expect(redTags.linkRedTagAction(tag.id, action.id, actor)?.actionId).toBe(action.id);
    expect(redTags.linkRedTagAction(tag.id, "ACT-DUPLICATE", actor)).toBeUndefined();
    expect(action).toMatchObject({ source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceLabel: "Red Tag", dueDate: tag.targetDate, responsiblePersonId: tag.responsiblePersonId });
  });

  it("reconciles active and completed Actions without automatically closing the Red Tag", async () => {
    const localStorage = storage(); vi.stubGlobal("window", { localStorage, alert: vi.fn() }); vi.stubGlobal("localStorage", localStorage); vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/five-s/red-tag/store");
    const actor = DEMO_USERS.auditor;
    const tag = store.createRedTag({ plant: actor.plant, zone: "Zone A", section: "Production", itemName: "Fixture", quantity: 1, reason: "Undefined Items", remarks: "Unused", requiredAction: "Remove", responsiblePersonId: "USR-SIVA-KUMAR", responsiblePersonName: "Siva Kumar", targetDate: "2026-09-20", createdById: actor.id, createdByName: actor.name }, actor);
    store.linkRedTagAction(tag.id, "ACT-RT-001", actor);
    const action = (status: MyAction["status"]): MyAction => ({ id: "ACT-RT-001", title: "Remove fixture", description: "Remove", source: "Red Tag", sourceTitle: tag.id, sourceModule: "redTag", sourceId: tag.id, plant: tag.plant, department: "Production", area: tag.zone, assignedTo: "Siva Kumar", status, priority: "Medium", dueDate: tag.targetDate, createdAt: "2026-09-16", evidence: [] });
    store.reconcileRedTagActions([action("In Progress")]);
    expect(store.getRedTag(tag.id)?.status).toBe("In Progress");
    store.reconcileRedTagActions([action("Completed")]);
    expect(store.getRedTag(tag.id)?.status).toBe("Awaiting Verification");
    expect(store.getRedTag(tag.id)?.status).not.toBe("Closed");
  });

  it("enforces evidence, disposition, remark, verification identity, and physical removal before closure", async () => {
    const localStorage = storage(); vi.stubGlobal("window", { localStorage, alert: vi.fn() }); vi.stubGlobal("localStorage", localStorage); vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/five-s/red-tag/store");
    const actor = DEMO_USERS.auditor;
    const tag = store.createRedTag({ plant: actor.plant, zone: "Zone A", section: "Production", itemName: "Fixture", quantity: 1, reason: "Undefined Items", remarks: "Unused", requiredAction: "Remove", responsiblePersonId: "USR-SIVA-KUMAR", responsiblePersonName: "Siva Kumar", targetDate: "2026-09-20", createdById: actor.id, createdByName: actor.name }, actor);
    const baseAction: MyAction = { id: "ACT-RT-002", title: "Remove fixture", description: "Remove", source: "Red Tag", sourceTitle: tag.id, sourceModule: "redTag", sourceId: tag.id, plant: tag.plant, department: "Production", area: tag.zone, assignedTo: "Siva Kumar", status: "Completed", priority: "Medium", dueDate: tag.targetDate, createdAt: "2026-09-16", evidence: [] };
    store.linkRedTagAction(tag.id, baseAction.id, actor); store.reconcileRedTagActions([baseAction]);
    expect(store.verifyRedTag(tag.id, { ...baseAction, status: "In Progress" }, { disposition: "Dispose", verificationRemark: "Cleared" }, actor)).toBeUndefined();
    expect(store.verifyRedTag(tag.id, baseAction, { disposition: "Dispose", verificationRemark: "Cleared" }, actor)).toBeUndefined();
    store.addRedTagAfterEvidence(tag.id, [{ id: "RTE-1", name: "after.jpg", url: "data:image/jpeg;base64,after", uploadedBy: actor.name, uploadedAt: "2026-09-16T12:00:00Z" }], actor);
    expect(store.verifyRedTag(tag.id, baseAction, { disposition: "" as never, verificationRemark: "Cleared" }, actor)).toBeUndefined();
    expect(store.verifyRedTag(tag.id, baseAction, { disposition: "Dispose", verificationRemark: "" }, actor)).toBeUndefined();
    expect(store.verifyRedTag(tag.id, baseAction, { disposition: "Other", verificationRemark: "Cleared" }, actor)).toBeUndefined();
    expect(store.verifyRedTag(tag.id, baseAction, { disposition: "Dispose", verificationRemark: "Area clear" }, actor)).toMatchObject({ verifiedByUserId: actor.id, verifiedByName: actor.name, disposition: "Dispose" });
    expect(store.closeRedTagAfterRemoval(tag.id, baseAction, false, actor)).toBeUndefined();
    expect(store.closeRedTagAfterRemoval(tag.id, baseAction, true, actor)).toMatchObject({ status: "Closed", removalConfirmed: true, removedByUserId: actor.id, removedByName: actor.name });
    expect(store.getRedTag(tag.id)?.closedAt).toBeTruthy();
  });

  it("presents Red Tag terminology rather than Red Flag terminology", () => {
    const source = readFileSync(resolve("features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(source).toContain('title="5S Red Tags"');
    expect(source).not.toContain('title="Red Flags"');
  });

  it("allows Red Tag creation only for active users with red_tag.create", () => {
    const member = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.responsible.id)!;
    const leader = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.leader.id)!;
    expect(canCreateRedTag(member)).toBe(true);
    expect(canCreateRedTag(leader)).toBe(false);
    expect(canCreateRedTag({ ...member, status: "Inactive" })).toBe(false);
  });

  it("uses the same permission gate for the CTA and direct create route", () => {
    const source = readFileSync(resolve("features/five-s/red-tag/red-tag-module.tsx"), "utf8");
    expect(source).toContain("mayCreate ? <Button");
    expect(source).toContain("if (!canCreateRedTag(adminUser))");
  });
});
