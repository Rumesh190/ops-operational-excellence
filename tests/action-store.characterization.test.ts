import { beforeEach, describe, expect, it } from "vitest";

import type { MyAction } from "@/features/five-s/types/my-actions";
import {
  addActionProgressEvidence,
  assignActionToZoneMember,
  closeReviewedAction,
  getActionById,
  reassignActionOwner,
  sendActionBack,
  setActions,
  startAssignedAction,
  submitActionForReview,
  updateAction,
} from "@/lib/actions/action-store";

const leader = { id: "USR-RUMESH", name: "Rumesh" };
const responsible = { id: "USR-SIVA-KUMAR", name: "Siva Kumar" };
const stranger = { id: "USR-STRANGER", name: "Stranger" };

function action(overrides: Partial<MyAction> = {}): MyAction {
  return {
    id: "ACT-TEST",
    title: "Test action",
    description: "Test",
    source: "5S Audit",
    sourceTitle: "5S-EGM-ZB-001",
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone B",
    assignedTo: "",
    zoneLeaderId: leader.id,
    zoneLeaderName: leader.name,
    createdByUserId: "USR-LAKSHMAN",
    createdByName: "Lakshman",
    auditor: "Lakshman",
    status: "Awaiting Assignment",
    priority: "Medium",
    dueDate: "2026-09-02",
    createdAt: "2026-08-31",
    evidence: [],
    ...overrides,
  };
}

function validResolution() {
  return { observation: "Corrected", correctiveActionCategory: "Communication", costSaving: 0 };
}

describe("authoritative action-store transitions", () => {
  beforeEach(() => setActions([action()]));

  it("allows only the configured zone leader to assign a waiting action", () => {
    expect(assignActionToZoneMember("ACT-TEST", stranger, responsible.id)).toBeUndefined();
    expect(assignActionToZoneMember("ACT-TEST", leader, responsible.id)).toMatchObject({
      status: "Assigned",
      responsiblePersonId: responsible.id,
    });
  });

  it("does not allow the generic updater to bypass lifecycle transitions", () => {
    expect(updateAction("ACT-TEST", { status: "Completed" })).toBeUndefined();
    expect(getActionById("ACT-TEST")?.status).toBe("Awaiting Assignment");
    expect(updateAction("ACT-TEST", { title: "Updated safely" })?.title).toBe("Updated safely");
  });

  it("allows the responsible member, but not another actor, to start", () => {
    setActions([action({ status: "Assigned", assignedTo: responsible.name, responsiblePersonId: responsible.id })]);
    expect(startAssignedAction("ACT-TEST", stranger)).toBeUndefined();
    expect(startAssignedAction("ACT-TEST", responsible)?.status).toBe("In Progress");
  });

  it("stores progress evidence separately and records it in the action timeline", () => {
    setActions([action({ status: "In Progress", assignedTo: responsible.name, responsiblePersonId: responsible.id })]);
    const updated = addActionProgressEvidence("ACT-TEST", { id: "EV-PROGRESS", name: "progress.jpg", type: "image", uploadedAt: "2026-09-01", uploadedBy: responsible.name }, responsible);
    expect(updated?.progressEvidence).toEqual([expect.objectContaining({ id: "EV-PROGRESS", evidenceType: "progress" })]);
    expect(updated?.activityHistory).toEqual(expect.arrayContaining([expect.objectContaining({ type: "evidence_uploaded" })]));
  });

  it("requires responsibility, resolution fields, and evidence before submission", () => {
    setActions([action({
      status: "In Progress",
      assignedTo: responsible.name,
      responsiblePersonId: responsible.id,
      evidence: [{ id: "EV", name: "after", type: "image", uploadedAt: "2026-08-31", uploadedBy: responsible.name }],
    })]);
    expect(submitActionForReview("ACT-TEST", stranger, validResolution())).toBeUndefined();
    expect(submitActionForReview("ACT-TEST", responsible, validResolution())?.status).toBe("Pending Auditor Review");
  });

  it("allows the creator to send back and the responsible member to resubmit", () => {
    const creator = { id: "USR-LAKSHMAN", name: "Lakshman" };
    setActions([action({
      status: "Pending Auditor Review",
      assignedTo: responsible.name,
      responsiblePersonId: responsible.id,
      evidence: [{ id: "EV", name: "after", type: "image", uploadedAt: "2026-08-31", uploadedBy: responsible.name }],
    })]);
    expect(sendActionBack("ACT-TEST", stranger, "Revise")).toBeUndefined();
    expect(sendActionBack("ACT-TEST", creator, "Revise")?.status).toBe("Rework Required");
    expect(submitActionForReview("ACT-TEST", responsible, validResolution())).toMatchObject({
      status: "Pending Auditor Review",
      activityHistory: expect.arrayContaining([expect.objectContaining({ type: "resubmitted" })]),
    });
  });

  it("allows only the creator to close a reviewed action", () => {
    const creator = { id: "USR-LAKSHMAN", name: "Lakshman" };
    setActions([action({
      status: "Pending Auditor Review",
      assignedTo: responsible.name,
      responsiblePersonId: responsible.id,
    })]);
    expect(closeReviewedAction("ACT-TEST", stranger)).toBeUndefined();
    expect(closeReviewedAction("ACT-TEST", creator, "Evidence verified")).toMatchObject({
      status: "Completed",
      reviewedBy: creator.name,
      closedByUserId: creator.id,
      closedBy: creator.name,
      closedAt: expect.any(String),
      closureRemark: "Evidence verified",
      activityHistory: expect.arrayContaining([
        expect.objectContaining({ type: "verified" }),
        expect.objectContaining({ type: "closed" }),
      ]),
    });
  });

  it("does not allow an arbitrary actor to review a legacy record with no reviewer identity", () => {
    setActions([action({ status: "Pending Review", createdByUserId: undefined, auditor: undefined })]);
    expect(closeReviewedAction("ACT-TEST", stranger)).toBeUndefined();
    expect(getActionById("ACT-TEST")?.status).toBe("Pending Review");
  });

  it("prefers an explicit reviewer and preserves an authorized Admin fallback for identity-free legacy records", () => {
    const explicitReviewer = { id: leader.id, name: leader.name };
    const creator = { id: "USR-LAKSHMAN", name: "Lakshman" };
    setActions([action({ status: "Pending Review", reviewerId: leader.id, reviewerName: leader.name })]);
    expect(closeReviewedAction("ACT-TEST", creator)).toBeUndefined();
    expect(closeReviewedAction("ACT-TEST", explicitReviewer)?.closedBy).toBe(leader.name);

    const admin = { id: "USR-ADMIN", name: "Admin", roles: ["Admin"], permissions: ["actions.review", "actions.close"] };
    setActions([action({ status: "Pending Review", reviewerId: undefined, reviewerName: undefined, createdByUserId: undefined, createdByName: undefined, auditor: undefined })]);
    expect(closeReviewedAction("ACT-TEST", admin)?.closedBy).toBe(admin.name);
  });

  it("reassigns only through an authorized actor and records the ownership change", () => {
    setActions([action({ status: "In Progress", assignedTo: responsible.name, responsiblePersonId: responsible.id, responsiblePersonName: responsible.name })]);
    expect(reassignActionOwner("ACT-TEST", stranger, "USR-SUBURAMIANI", "Shift coverage")).toBeUndefined();
    expect(reassignActionOwner("ACT-TEST", leader, "USR-SUBURAMIANI", "Shift coverage")).toMatchObject({
      responsiblePersonId: "USR-SUBURAMIANI",
      responsiblePersonName: "Suburamiani",
      reassignmentHistory: [expect.objectContaining({ previousOwnerId: responsible.id, newOwnerId: "USR-SUBURAMIANI", changedByUserId: leader.id, reason: "Shift coverage" })],
      activityHistory: expect.arrayContaining([expect.objectContaining({ type: "reassigned" })]),
    });
  });
});
