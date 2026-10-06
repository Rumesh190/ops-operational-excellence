import { describe, expect, it } from "vitest";

import type { MyAction } from "@/features/five-s/types/my-actions";
import type { RedTag } from "@/features/five-s/red-tag/types";
import { getActionReportTitle } from "@/features/reports/report-presentation";
import { actionEvidenceEmptyText, resolveActionSourceBeforeEvidence } from "@/lib/actions/action-evidence";

const action = {
  id: "ACT-1", title: "Repair item", description: "Repair", source: "Red Tag", sourceTitle: "RT-1", sourceModule: "redTag", sourceId: "RT-1",
  plant: "Egmore Plant", department: "Production", area: "Zone B", priority: "High", status: "Completed", assignedTo: "Siva", dueDate: "2026-10-03", createdAt: "2026-10-01T10:00:00+05:30", evidence: [],
} as MyAction;
const redTag = {
  id: "RT-1", tagNumber: "RT-1", plant: "Egmore Plant", zone: "Zone B", section: "Production", itemName: "Item", quantity: 1, reason: "Damaged", remarks: "Repair", status: "Closed", createdById: "USR-1", createdByName: "Rumesh", createdAt: "2026-10-01T09:00:00+05:30", imageUrl: "data:image/jpeg;base64,before", history: [],
} as RedTag;

describe("Reports V2 source-aware presentation", () => {
  it("uses deterministic module-specific Action report titles", () => {
    expect(getActionReportTitle(action)).toBe("Red Tag Action Report");
    expect(getActionReportTitle({ source: "Manual", sourceModule: "manual" })).toBe("Action Completion Report");
    expect(getActionReportTitle({ source: "Continuous Improvement", sourceModule: "continuousImprovement" })).toBe("Continual Improvement Action Report");
  });

  it("resolves Red Tag identification evidence by canonical reference without mutating either record", () => {
    const beforeAction = structuredClone(action);
    const beforeTag = structuredClone(redTag);
    const result = resolveActionSourceBeforeEvidence(action, [redTag]);
    expect(result.state).toBe("available");
    expect(result.provenance).toBe("Red Tag · RT-1");
    expect(result.evidence[0]?.url).toBe(redTag.imageUrl);
    expect(result.readOnly).toBe(true);
    expect(action).toEqual(beforeAction);
    expect(redTag).toEqual(beforeTag);
  });

  it("distinguishes unresolvable evidence from evidence that was never captured", () => {
    expect(resolveActionSourceBeforeEvidence(action, []).state).toBe("unavailable");
    expect(actionEvidenceEmptyText("unavailable")).toBe("Evidence unavailable");
    expect(resolveActionSourceBeforeEvidence({ ...action, sourceModule: "manual", source: "Manual" }, []).state).toBe("not-captured");
    expect(actionEvidenceEmptyText("not-captured")).toBe("No evidence captured");
  });
});
