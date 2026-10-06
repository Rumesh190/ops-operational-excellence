import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveActionSourceBeforeEvidence } from "@/lib/actions/action-evidence";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { RedTag } from "@/features/five-s/red-tag/types";

const source = readFileSync(resolve(process.cwd(), "features/five-s/action-detail-page.tsx"), "utf8");
const action = (overrides: Partial<MyAction> = {}): MyAction => ({ id: "ACT-RT", title: "Repair item", description: "Repair", source: "Red Tag", sourceTitle: "RT-EGM-ZB-001", sourceModule: "redTag", sourceId: "RT-EGM-ZB-001", plant: "Egmore Plant", department: "Production", area: "Zone B", assignedTo: "Siva", status: "In Progress", priority: "Medium", dueDate: "2026-10-10", createdAt: "2026-10-01", evidence: [], ...overrides });
const redTag = { id: "RT-EGM-ZB-001", tagNumber: "RT-EGM-ZB-001", imageUrl: "data:image/jpeg;base64,before", createdAt: "2026-10-01T08:00:00.000Z", createdByName: "Rumesh" } as RedTag;

describe("Action guided execution navigation", () => {
  it("uses the Overview to Evidence to Review flow without an Activity tab", () => {
    expect(source).toContain("<OpsTabBar");
    expect(source).toContain('type DetailSection = "overview" | "evidence" | "review"');
    expect(source).not.toContain('{ id: "activity", label: "Activity" }');
    expect(source).not.toContain("ActivityTimeline");
    expect(source).toContain('primaryLabel="Next: Evidence"');
    expect(source).toContain('secondaryLabel="Save Progress" secondaryAction={saveProgress}');
    expect(source).toContain('secondaryLabel="Back: Overview"');
    expect(source).toContain('secondaryLabel="Back: Evidence"');
    expect(source).toContain('primaryLabel="Next: Review"');
    expect(source).not.toContain('primaryLabel="Next: Complete"');
    expect(source).toContain('primaryAction={() => navigateToStep("evidence")}');
    expect(source).toContain('onChange={(id) => navigateToStep(id as DetailSection)}');
  });

  it("keeps forward actions clickable and validates through one navigation guard", () => {
    expect(source).toContain("function navigateToStep(target: DetailSection)");
    expect(source).toContain('if (section === "overview" && !persistOverview()) return;');
    expect(source).toContain("function persistOverview()");
    expect(source).toContain("function validateOverview()");
    expect(source).toContain("function validateEvidence()");
    expect(source).toContain("Corrective measure / responsible notes are required.");
    expect(source).toContain("Corrective action category is required.");
    expect(source).toContain("Add completion evidence before continuing to Review.");
    expect(source).toContain('focus({ preventScroll: true })');
    expect(source).not.toContain('primaryDisabled={!validResolution}');
    expect(source).toContain('description="Optional evidence captured while corrective work is underway."');
  });

  it("resolves Red Tag Before evidence by source reference without mutating Action evidence", () => {
    const linkedAction = action();
    const resolved = resolveActionSourceBeforeEvidence(linkedAction, [redTag]);
    expect(resolved).toMatchObject({ description: "Source: Red Tag · RT-EGM-ZB-001", evidence: [{ url: redTag.imageUrl, uploadedBy: "Rumesh" }], readOnly: true });
    expect(linkedAction.issueEvidence).toBeUndefined();
    expect(linkedAction.progressEvidence).toBeUndefined();
    expect(linkedAction.evidence).toEqual([]);
  });

  it("prefers persisted evidence and gracefully handles an unavailable source", () => {
    const persisted = [{ id: "BEFORE", name: "finding.jpg", type: "image" as const, uploadedAt: "2026-10-01", uploadedBy: "Auditor", url: "data:image/jpeg;base64,persisted" }];
    expect(resolveActionSourceBeforeEvidence(action({ issueEvidence: persisted }), [redTag]).evidence).toBe(persisted);
    expect(resolveActionSourceBeforeEvidence(action(), [])).toMatchObject({ evidence: [], description: "Source: Red Tag · RT-EGM-ZB-001" });
  });
});
