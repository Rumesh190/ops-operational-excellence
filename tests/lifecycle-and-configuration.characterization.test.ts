import { describe, expect, it } from "vitest";

import type { FiveSAudit } from "@/features/five-s/types/five-s";
import {
  AUDIT_LIFECYCLE_STAGES,
  getActionLifecycleStage,
  getAuditLifecycleStage,
} from "@/lib/five-s/lifecycle-status";
import {
  canAuditZone,
  getMembersForZone,
  getPriorityDueDate,
} from "@/lib/five-s/configuration";

function audit(status: FiveSAudit["status"], completionPercentage: number): FiveSAudit {
  return {
    id: "A",
    title: "A",
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone B",
    auditor: "Lakshman",
    status,
    score: 0,
    maxScore: 78,
    completionPercentage,
    dueDate: "2026-09-01",
    sections: [],
  };
}

describe("lifecycle derivation", () => {
  it("preserves Draft -> In Progress -> Review -> Completed display order", () => {
    expect(AUDIT_LIFECYCLE_STAGES).toEqual(["Draft", "In Progress", "Review", "Completed"]);
  });

  it.each([
    ["Draft", 0, "Draft"],
    ["Draft", 1, "In Progress"],
    ["In Progress", 40, "In Progress"],
    ["Draft", 100, "Review"],
    ["In Progress", 100, "Review"],
    ["Completed", 100, "Completed"],
  ] as const)("derives %s at %i%% as %s", (status, percentage, stage) => {
    expect(getAuditLifecycleStage(audit(status, percentage))).toBe(stage);
  });

  it("maps persisted action statuses into the canonical display stages", () => {
    expect({
      awaiting: getActionLifecycleStage("Awaiting Assignment"),
      assigned: getActionLifecycleStage("Assigned"),
      open: getActionLifecycleStage("Open"),
      progress: getActionLifecycleStage("In Progress"),
      overdue: getActionLifecycleStage("Overdue"),
      rework: getActionLifecycleStage("Rework Required"),
      submitted: getActionLifecycleStage("Pending Auditor Review"),
      review: getActionLifecycleStage("Pending Review"),
      awaitingReview: getActionLifecycleStage("Awaiting Review"),
      complete: getActionLifecycleStage("Completed"),
    }).toEqual({
      awaiting: "Assigned",
      assigned: "Assigned",
      open: "Assigned",
      progress: "In Progress",
      overdue: "In Progress",
      rework: "Rework",
      submitted: "Submitted for Review",
      review: "Under Review",
      awaitingReview: "Under Review",
      complete: "Closed",
    });
  });
});

describe("zone permissions and priority dates", () => {
  it("prevents an auditor from auditing their own zone", () => {
    expect(canAuditZone({ primaryZone: "Zone A" }, "Zone A")).toBe(false);
    expect(canAuditZone({ primaryZone: "Zone A" }, "Zone B")).toBe(true);
    expect(canAuditZone({ primaryZone: "Zone A" }, "")).toBe(false);
  });

  it("preserves configured zone-member membership", () => {
    expect(getMembersForZone("Zone B").map((member) => member.id)).toContain("USR-SIVA-KUMAR");
    expect(getMembersForZone("Unknown Zone")).toEqual([]);
  });

  it.each([
    ["Critical", "2026-09-01"],
    ["High", "2026-09-01"],
    ["Medium", "2026-09-02"],
    ["Low", "2026-09-03"],
  ] as const)("maps %s to %s", (priority, expected) => {
    expect(getPriorityDueDate(priority, new Date(2026, 7, 31, 15, 30))).toBe(expected);
  });
});
