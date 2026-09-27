import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { filterActionCenterItems, getActionCenterCounts, getRoleVisibleActions, matchesActionQuickFilter, type ActionCenterFilters } from "@/features/actions/action-center-data";
import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";
import { IMPROVEMENT_QUICK_FILTERS, matchesImprovementQuickFilter } from "@/features/five-s/continuous-improvement/config";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { DEMO_USERS } from "@/lib/current-user";

function action(overrides: Partial<MyAction> = {}): MyAction {
  return {
    id: "ACT-BATCH-B", title: "Restore guard", description: "Restore the machine guard", source: "Manual", sourceTitle: "Manual action",
    plant: "Egmore Plant", department: "Production", area: "Zone A", assignedTo: DEMO_USERS.auditor.name,
    responsiblePersonId: DEMO_USERS.auditor.id, responsiblePersonName: DEMO_USERS.auditor.name,
    createdByUserId: DEMO_USERS.auditor.id, createdByName: DEMO_USERS.auditor.name, auditor: DEMO_USERS.auditor.name,
    status: "In Progress", priority: "High", dueDate: "2026-09-20", createdAt: "2026-09-01", evidence: [],
    ...overrides,
  };
}

const allFilters: ActionCenterFilters = { search: "", source: "All", status: "All", priority: "All", plant: "All", zone: "All", assignedTo: "All", due: "All" };

describe("Batch B interactive KPI drill-down", () => {
  it("uses the same grouped status definitions for Continual Improvement counts and filters", () => {
    const statuses = ["draft", "submitted", "under_review", "approved", "in_progress", "completed"] as const;
    const records = statuses.map((status) => ({ status }));
    expect(IMPROVEMENT_QUICK_FILTERS.map((filter) => [filter.id, records.filter((item) => matchesImprovementQuickFilter(item, filter.id)).length])).toEqual([
      ["proposal", 2],
      ["under-review", 2],
      ["in-progress", 1],
    ]);
  });

  it("keeps Action Open and Overdue KPI totals equal to their unfiltered drill-down results", () => {
    const now = new Date("2026-09-26T12:00:00+05:30");
    const records = [
      action({ id: "OVERDUE-CRITICAL", dueDate: "2026-09-20", priority: "Critical" }),
      action({ id: "OPEN", dueDate: "2026-10-01", status: "Open" }),
      action({ id: "DONE", dueDate: "2026-09-10", status: "Completed", completedAt: "2026-09-24" }),
    ];
    const user = DEMO_USERS.auditor;
    const adminUser = ADMIN_USER_SEEDS.find((item) => item.id === user.id);
    const visible = getRoleVisibleActions(records, user, adminUser);
    const counts = getActionCenterCounts(records, user, adminUser, now);
    const open = filterActionCenterItems(visible, { ...allFilters, status: "Open" }, now);
    const overdue = filterActionCenterItems(visible, { ...allFilters, status: "Overdue", due: "Overdue" }, now);
    expect(open).toHaveLength(counts.open);
    expect(overdue).toHaveLength(counts.overdue);
    expect(open.map((item) => item.id)).toContain("OVERDUE-CRITICAL");
    expect(overdue.map((item) => item.id)).toContain("OVERDUE-CRITICAL");
    expect(open.every((item) => matchesActionQuickFilter(item, "open", now))).toBe(true);
    expect(overdue.every((item) => matchesActionQuickFilter(item, "overdue", now))).toBe(true);
  });

  it("renders accessible toggle controls, active context, clear behavior, and mobile-safe records", () => {
    const improvementPage = readFileSync("features/five-s/continuous-improvement/landing-page.tsx", "utf8");
    const actionPage = readFileSync("features/actions/action-center-page.tsx", "utf8");
    for (const source of [improvementPage, actionPage]) {
      expect(source).toContain("aria-pressed={selected}");
      expect(source).toContain("min-h-16");
      expect(source).toContain("Clear");
    }
    expect(improvementPage).toContain('setActiveTab("improvements")');
    expect(actionPage).toContain("activeQuickFilter ? roleVisibleActions : tabActions");
    expect(actionPage).toContain("lg:hidden");
  });
});
