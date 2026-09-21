import { afterEach, describe, expect, it } from "vitest";

import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";
import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { canCreateVisualImprovement, canReviewVisualImprovement } from "@/features/visual-improvement/visual-improvement-access";
import { generateVisualImprovementId, VISUAL_IMPROVEMENT_CATEGORIES } from "@/features/visual-improvement/visual-improvement-config";
import {
  approveVisualImprovement,
  createVisualImprovement,
  getVisualImprovementById,
  getVisualImprovementSummary,
  linkVisualImprovementAction,
  returnVisualImprovement,
  saveVisualImprovement,
  setVisualImprovements,
  startVisualImprovement,
  submitVisualImprovement,
  VISUAL_IMPROVEMENT_SEED_RECORDS,
} from "@/features/visual-improvement/visual-improvement-store";
import type { VisualImprovementEvidence } from "@/features/visual-improvement/types";
import { getActionSourceHref } from "@/lib/actions/action-config";
import { setActions } from "@/lib/actions/action-store";
import { DEMO_USERS } from "@/lib/current-user";

const actor = { id: DEMO_USERS.auditor.id, name: DEMO_USERS.auditor.name };
const before: VisualImprovementEvidence = { id: "BEFORE", name: "before.jpg", url: "data:image/jpeg;base64,before", uploadedAt: "2026-09-14T08:00:00+05:30", uploadedBy: actor.name };
const after: VisualImprovementEvidence = { id: "AFTER", name: "after.jpg", url: "data:image/jpeg;base64,after", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name };

afterEach(() => setVisualImprovements([...VISUAL_IMPROVEMENT_SEED_RECORDS]));

describe("Visual Improvement MVP", () => {
  it("covers the complete compact lifecycle with image-first fixtures", () => {
    expect(new Set(VISUAL_IMPROVEMENT_SEED_RECORDS.map((item) => item.status))).toEqual(new Set(["Draft", "Planned", "In Progress", "Awaiting Review", "Completed", "Returned"]));
    expect(VISUAL_IMPROVEMENT_SEED_RECORDS.every((item) => item.beforeEvidence.length > 0)).toBe(true);
    expect(VISUAL_IMPROVEMENT_SEED_RECORDS.filter((item) => item.status === "Completed").every((item) => item.afterEvidence.length > 0)).toBe(true);
  });

  it("centralizes categories and sequential VI IDs", () => {
    expect(VISUAL_IMPROVEMENT_CATEGORIES).toContain("Organization & Layout");
    expect(new Set(VISUAL_IMPROVEMENT_CATEGORIES).size).toBe(VISUAL_IMPROVEMENT_CATEGORIES.length);
    expect(generateVisualImprovementId([{ id: "VI-2026-014" }, { id: "VI-2025-099" }], 2026)).toBe("VI-2026-015");
  });

  it("requires before evidence and supports create through approve/return", () => {
    setVisualImprovements([]);
    const input = { title: "Label shared gauge locations", plant: "Egmore Plant", zone: "Zone A", location: "Inspection Bench", category: "Visual Management" as const, owner: actor, participants: [], beforeDescription: "Gauge locations are not visible.", beforeEvidence: [before], expectedBenefit: "Reduce searching." };
    expect(() => createVisualImprovement({ ...input, beforeEvidence: [] }, actor)).toThrow(/before evidence/i);
    const created = createVisualImprovement(input, actor);
    expect(created).toMatchObject({ id: expect.stringMatching(/^VI-\d{4}-001$/), status: "Planned" });
    expect(created?.actionId).toBeUndefined();
    startVisualImprovement(created!.id, actor);
    saveVisualImprovement(created!.id, { afterDescription: "Gauge locations are labelled and visible.", afterEvidence: [after], actualCostSaving: 3200, benefitDescription: "Search time removed." }, actor);
    submitVisualImprovement(created!.id, actor);
    expect(getVisualImprovementById(created!.id)?.status).toBe("Awaiting Review");
    returnVisualImprovement(created!.id, "Add a wider after photograph.", actor);
    expect(getVisualImprovementById(created!.id)).toMatchObject({ status: "Returned", reviewRemark: "Add a wider after photograph." });
    submitVisualImprovement(created!.id, actor);
    approveVisualImprovement(created!.id, "Clear visible result.", actor);
    expect(getVisualImprovementById(created!.id)).toMatchObject({ status: "Completed", reviewedByName: actor.name, completedByName: actor.name });
  });

  it("summarizes module-specific performance without embedding Actions", () => {
    const summary = getVisualImprovementSummary(VISUAL_IMPROVEMENT_SEED_RECORDS, new Date("2026-09-14T12:00:00+05:30"));
    expect(summary).toMatchObject({ active: 4, completedThisMonth: 2, awaitingReview: 1, totalSavings: 21600, areasImproved: 2 });
    expect(VISUAL_IMPROVEMENT_SEED_RECORDS.every((item) => !item.actionId || typeof item.actionId === "string")).toBe(true);
  });

  it("blocks completion until its linked Action is completed", () => {
    const candidate = { ...VISUAL_IMPROVEMENT_SEED_RECORDS.find((item) => item.status === "Awaiting Review")!, actionId: undefined };
    setVisualImprovements([candidate]);
    setActions([{ ...MY_ACTIONS[0], id: "ACT-VI-BLOCK", status: "In Progress" }]);
    linkVisualImprovementAction(candidate.id, "ACT-VI-BLOCK", actor);
    expect(() => approveVisualImprovement(candidate.id, "Verified", actor)).toThrow(/Complete linked Action ACT-VI-BLOCK/);
    expect(getVisualImprovementById(candidate.id)?.status).toBe("Awaiting Review");
    setActions([{ ...MY_ACTIONS[0], id: "ACT-VI-BLOCK", status: "Completed" }]);
    expect(approveVisualImprovement(candidate.id, "Verified", actor)?.status).toBe("Completed");
  });

  it("uses existing OPS roles and creates a precise Action Center deep-link", () => {
    const admin = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.auditor.id);
    const member = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.responsible.id);
    const leader = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.leader.id);
    const zoneBRecord = VISUAL_IMPROVEMENT_SEED_RECORDS.find((item) => item.zone === "Zone B")!;
    expect(canCreateVisualImprovement(admin, DEMO_USERS.auditor)).toBe(true);
    expect(canCreateVisualImprovement(member, DEMO_USERS.responsible)).toBe(true);
    expect(canReviewVisualImprovement(leader, DEMO_USERS.leader, zoneBRecord)).toBe(true);
    const action = MY_ACTIONS.find((item) => item.id === "ACT-VI-014")!;
    expect(getActionSourceHref(action)).toBe("/visual-improvement/VI-2026-014");
  });
});
