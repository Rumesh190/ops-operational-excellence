import { afterEach, describe, expect, it, vi } from "vitest";

import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { DEMO_USERS } from "@/lib/current-user";
import { getActionSourceHref } from "@/lib/actions/action-config";
import type { ContinuousImprovement, ImprovementEvidence } from "@/features/five-s/continuous-improvement/types";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

async function store(localStorage = storage()) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", window.localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => `test-${Math.random()}` });
  return import("@/features/five-s/continuous-improvement/store");
}

const proposal = {
  title: "Improve packing material flow",
  issueDescription: "Operators travel to a shared rack for every packing batch.",
  proposedImprovement: "Move high-use material to a controlled point-of-use rack.",
  expectedBenefit: "Reduce handling time and stabilize packing cycle time.",
  benefitType: "Cost Saving" as const,
  proposedSaving: 18000,
  estimatedTime: 2,
  estimatedTimeUnit: "Weeks" as const,
  memberIds: [DEMO_USERS.responsible.id],
  beforeEvidence: [] as ImprovementEvidence[],
};

const afterEvidence: ImprovementEvidence[] = [{ id: "AFTER-1", name: "packing-after.jpg", url: "data:image/jpeg;base64,after", uploadedAt: "2026-09-14T10:00:00.000Z", uploadedBy: DEMO_USERS.responsible.name }];

afterEach(() => vi.unstubAllGlobals());

describe("Continuous Improvement MVP", () => {
  it("ships realistic records across every requested lifecycle stage", async () => {
    const { CONTINUOUS_IMPROVEMENT_SEED_RECORDS } = await store();
    expect(new Set(CONTINUOUS_IMPROVEMENT_SEED_RECORDS.map((item) => item.status))).toEqual(new Set(["draft", "submitted", "under_review", "approved", "on_hold", "rejected", "in_progress", "awaiting_completion_review", "completed"]));
    expect(CONTINUOUS_IMPROVEMENT_SEED_RECORDS.some((item) => item.actionIds.length > 1)).toBe(true);
    expect(CONTINUOUS_IMPROVEMENT_SEED_RECORDS.some((item) => item.proposedSaving === 0)).toBe(true);
    expect(CONTINUOUS_IMPROVEMENT_SEED_RECORDS.filter((item) => item.status === "completed").some((item) => item.beforeEvidence.length > 0 && item.afterEvidence.length > 0)).toBe(true);
  });

  it("recognizes zone scope while giving Admin broader visibility", async () => {
    const { canSeeImprovement, isZoneMember } = await store();
    expect(isZoneMember(DEMO_USERS.responsible)).toBe(true);
    expect(isZoneMember(DEMO_USERS.leader)).toBe(false);
    const item = { zone: "Zone B", zoneLeaderId: DEMO_USERS.leader.id, proposedById: DEMO_USERS.responsible.id, ownerId: DEMO_USERS.responsible.id, memberIds: [DEMO_USERS.responsible.id] } as ContinuousImprovement;
    expect(canSeeImprovement(item, DEMO_USERS.leader)).toBe(true);
    expect(canSeeImprovement(item, DEMO_USERS.responsible)).toBe(true);
    expect(canSeeImprovement(item, DEMO_USERS.auditor)).toBe(true);
    expect(canSeeImprovement(item, DEMO_USERS.superAdmin)).toBe(false);
  });

  it("supports draft, submission, approval, implementation, return, resubmission, and completion", async () => {
    const api = await store();
    api.setImprovements([]);
    const draft = api.createImprovement(proposal, DEMO_USERS.responsible, true)!;
    expect(draft).toMatchObject({ id: expect.stringMatching(/^CI-\d{4}-001$/), status: "draft", proposedById: DEMO_USERS.responsible.id });
    api.submitImprovement(draft.id, DEMO_USERS.responsible);
    expect(api.getImprovementById(draft.id)?.status).toBe("submitted");
    api.startImprovementReview(draft.id, DEMO_USERS.leader);
    expect(api.getImprovementById(draft.id)?.status).toBe("under_review");
    api.reviewImprovement(draft.id, "approved", "Proceed with a two-week trial.", DEMO_USERS.leader);
    api.startImprovement(draft.id, DEMO_USERS.responsible);
    api.linkImprovementAction(draft.id, "ACT-TEST-01", DEMO_USERS.responsible);
    const actionStore = await import("@/lib/actions/action-store");
    actionStore.setActions([{ ...MY_ACTIONS[0], id: "ACT-TEST-01", status: "In Progress" }]);
    api.saveImprovementImplementation(draft.id, { implementationProcess: "Trialled the new point-of-use location.", progressNotes: "First shift complete." }, DEMO_USERS.responsible);
    api.submitImprovementCompletion(draft.id, { implementationProcess: "Trialled the new point-of-use location.", actionTaken: "Installed and labelled the controlled rack.", actualBenefit: "Material travel reduced by 18%.", actualSaving: 21500, afterEvidence }, DEMO_USERS.responsible);
    expect(api.getImprovementById(draft.id)).toMatchObject({ status: "awaiting_completion_review", actionIds: ["ACT-TEST-01"], actualSaving: 21500 });
    api.returnImprovementCompletion(draft.id, "Add the second-shift verification result.", DEMO_USERS.leader);
    expect(api.getImprovementById(draft.id)?.status).toBe("in_progress");
    api.submitImprovementCompletion(draft.id, { implementationProcess: "Trialled the new point-of-use location on both shifts.", actionTaken: "Installed and labelled the controlled rack.", actualBenefit: "Material travel reduced by 18% on both shifts.", actualSaving: 21500, afterEvidence }, DEMO_USERS.responsible);
    expect(() => api.completeImprovementReview(draft.id, "Self-approved", DEMO_USERS.responsible)).toThrow("not permitted");
    expect(() => api.completeImprovementReview(draft.id, "Outcome verified.", DEMO_USERS.leader)).toThrow(/Complete linked Action ACT-TEST-01/);
    actionStore.setActions([{ ...MY_ACTIONS[0], id: "ACT-TEST-01", status: "Completed" }]);
    api.completeImprovementReview(draft.id, "Outcome verified.", DEMO_USERS.leader);
    const completed = api.getImprovementById(draft.id)!;
    expect(completed).toMatchObject({ status: "completed", completionReviewedByName: DEMO_USERS.leader.name });
    expect(completed.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(["created", "submitted", "review_started", "approved", "started", "action_created", "progress_updated", "completion_submitted", "completion_returned", "completion_resubmitted", "completed"]));
  });

  it("requires remarks for rejection and hold, and supports resume or reject", async () => {
    const api = await store();
    api.setImprovements([]);
    const held = api.createImprovement(proposal, DEMO_USERS.responsible)!;
    expect(() => api.reviewImprovement(held.id, "on_hold", "", DEMO_USERS.leader)).toThrow("not permitted");
    api.reviewImprovement(held.id, "on_hold", "Confirm budget availability.", DEMO_USERS.leader);
    expect(api.getImprovementById(held.id)).toMatchObject({ status: "on_hold", holdReason: "Confirm budget availability." });
    api.resumeImprovementReview(held.id, DEMO_USERS.leader);
    expect(api.getImprovementById(held.id)?.status).toBe("under_review");
    api.reviewImprovement(held.id, "rejected", "The proposal duplicates an approved capital project.", DEMO_USERS.leader);
    expect(api.getImprovementById(held.id)).toMatchObject({ status: "rejected", reviewRemark: "The proposal duplicates an approved capital project." });
  });

  it("keeps proposal evidence through local-storage migration", async () => {
    const localStorage = storage();
    const evidence = [{ id: "existing-photo-1", name: "assembly-rack-before.jpg", url: "data:image/jpeg;base64,before-condition", uploadedAt: "2026-09-02T10:00:00.000Z", uploadedBy: DEMO_USERS.responsible.name }];
    const first = await store(localStorage);
    first.setImprovements([]);
    const created = first.createImprovement({ ...proposal, beforeEvidence: evidence }, DEMO_USERS.responsible);
    expect(created?.beforeEvidence).toEqual(evidence);
    const reloaded = await store(localStorage);
    expect(reloaded.getImprovementById(created!.id)?.beforeEvidence).toEqual(evidence);
  });

  it("summarizes dashboard-ready CI data and deep-links Action Center records", async () => {
    const { CONTINUOUS_IMPROVEMENT_SEED_RECORDS, getContinuousImprovementSummary } = await store();
    const summary = getContinuousImprovementSummary(CONTINUOUS_IMPROVEMENT_SEED_RECORDS, new Date("2026-09-14T12:00:00+05:30"));
    expect(summary).toMatchObject({ active: 3, pendingReviews: 4, completed: 2, completedThisMonth: 1 });
    expect(summary.proposedSavings).toBeGreaterThan(0);
    expect(summary.actualSavings).toBe(30100);
    const action = MY_ACTIONS.find((item) => item.id === "ACT-CI-013-01")!;
    expect(getActionSourceHref(action)).toBe("/continuous-improvement/CI-2026-013");
  });

  it("preserves original zone-member creation and blocks a Zone Leader without create permission", async () => {
    const { createImprovement } = await store();
    expect(createImprovement(proposal, DEMO_USERS.responsible)).toMatchObject({ status: "submitted", zone: "Zone B" });
    expect(createImprovement({ ...proposal, zone: "Zone D", memberIds: [] }, DEMO_USERS.auditor)).toMatchObject({ status: "submitted", zone: "Zone D" });
    expect(() => createImprovement({ ...proposal, zone: "Zone A", memberIds: [] }, DEMO_USERS.responsible)).toThrow("Only Zone Members");
    expect(() => createImprovement(proposal, DEMO_USERS.leader)).toThrow("Only Zone Members");
  });
});
