import { describe, expect, it } from "vitest";

import { buildFiveSReportData, isActionRelatedToAudit } from "@/features/five-s/reports-data";
import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { MyAction } from "@/features/five-s/types/my-actions";

const audit = (id: string, completedAt: string, score = 60): FiveSAudit => ({
  id, title: id, plant: "Egmore Plant", department: "Production", area: "Zone A", auditor: "Lakshman",
  status: "Completed", score, maxScore: 75, completionPercentage: 100, startedAt: completedAt, completedAt, dueDate: completedAt.slice(0, 10), sections: [],
});

const action = (id: string, createdAt: string, completedAt: string | undefined, sourceModule: MyAction["sourceModule"] = "audit", sourceId = "AUD-IN"): MyAction => ({
  id, title: id, description: id, source: sourceModule === "manual" ? "Manual" : "5S Audit", sourceTitle: sourceId,
  sourceModule, sourceId, auditId: sourceModule === "audit" ? sourceId : undefined, plant: "Egmore Plant", department: "Production", area: "Zone A",
  assignedTo: "Siva Kumar", status: completedAt ? "Completed" : "In Progress", priority: "Medium", dueDate: "2026-09-30", createdAt, completedAt, costSaving: 1000, evidence: [],
});

describe("5S report period integrity", () => {
  it("applies the selected period across summary, trends, ranking, flow, closure, and savings", () => {
    const inPeriod = action("ACT-IN", "2026-09-05", "2026-09-10");
    const outPeriod = action("ACT-OUT", "2026-08-05", "2026-08-10");
    const data = buildFiveSReportData([audit("AUD-IN", "2026-09-08T10:00:00Z"), audit("AUD-OUT", "2026-08-08T10:00:00Z", 30)], [inPeriod, outPeriod], { from: "2026-09-01", to: "2026-09-30" });
    expect(data.completedAudits.map((item) => item.id)).toEqual(["AUD-IN"]);
    expect(data.correctiveActions.map((item) => item.id)).toEqual(["ACT-IN"]);
    expect(data.completedCorrectiveActions.map((item) => item.id)).toEqual(["ACT-IN"]);
    expect(data.score).toBe(80);
    expect(data.totalSaving).toBe(1000);
    expect(data.auditTrend).toHaveLength(1);
    expect(data.savingTrend).toHaveLength(1);
    expect(data.statusFlow.reduce((sum, item) => sum + item.value, 0)).toBe(1);
    expect(data.closureRate).toBe(100);
  });

  it("excludes manual actions from corrective metrics and uses explicit audit links for StoryGraph", () => {
    const linked = action("ACT-LINKED", "2026-09-05", "2026-09-10");
    const manual = action("ACT-MANUAL", "2026-09-05", "2026-09-10", "manual", "AUD-IN");
    const titleOnly = { ...action("ACT-TITLE", "2026-09-05", "2026-09-10", "continuousImprovement", "CI-1"), sourceTitle: "AUD-IN" };
    const selectedAudit = audit("AUD-IN", "2026-09-08T10:00:00Z");
    const data = buildFiveSReportData([selectedAudit], [linked, manual, titleOnly], { from: "2026-09-01", to: "2026-09-30" });
    expect(data.correctiveActions.map((item) => item.id)).toEqual(["ACT-LINKED", "ACT-TITLE"]);
    expect(data.storyActions.map((item) => item.id)).toEqual(["ACT-LINKED"]);
    expect(data.storySaving).toBe(1000);
    expect(isActionRelatedToAudit(titleOnly, selectedAudit)).toBe(false);
  });

  it("returns honest empty-period data without global fallback values", () => {
    const data = buildFiveSReportData([audit("AUD-OLD", "2026-08-08T10:00:00Z")], [action("ACT-OLD", "2026-08-05", "2026-08-10")], { from: "2026-09-01", to: "2026-09-30" });
    expect(data.score).toBeNull();
    expect(data.completedAudits).toEqual([]);
    expect(data.correctiveActions).toEqual([]);
    expect(data.auditTrend).toEqual([]);
    expect(data.savingTrend).toEqual([]);
    expect(data.zoneRanking).toEqual([]);
    expect(data.totalSaving).toBe(0);
  });
});
