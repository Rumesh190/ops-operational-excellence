import { describe, expect, it } from "vitest";

import { filterActionCenterItems, getActionsForTab, getRoleVisibleActions } from "@/features/actions/action-center-data";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";
import { DEMO_USERS } from "@/lib/current-user";
import { getActionSourceHref, getEnabledActionSources, normalizeActionSource, sortActionsByUrgency } from "@/lib/actions/action-config";
import type { AccessCapabilityId } from "@/lib/modules";

function action(overrides: Partial<MyAction> = {}): MyAction {
  return {
    id: "ACT-TEST", title: "Fix machine guard", description: "Restore guard", source: "5S Audit", sourceTitle: "AUD-2026-014",
    plant: "Egmore Plant", department: "Production", area: "Zone A", assignedTo: "Ritika", responsiblePersonId: "USR-RITIKA", responsiblePersonName: "Ritika",
    createdByUserId: DEMO_USERS.auditor.id, createdByName: DEMO_USERS.auditor.name, auditor: DEMO_USERS.auditor.name,
    status: "In Progress", priority: "High", dueDate: "2026-09-14", createdAt: "2026-09-12", evidence: [],
    ...overrides,
  };
}

const allFilters = { search: "", source: "All" as const, status: "All" as const, priority: "All" as const, plant: "All", zone: "All", assignedTo: "All", due: "All" as const };

describe("Action Center source traceability and queues", () => {
  it("normalizes historic Audit actions into the shared source model", () => {
    expect(normalizeActionSource(action())).toMatchObject({ sourceModule: "audit", sourceId: "AUD-2026-014", sourceLabel: "Audit", sourceLocation: "Zone A", sourceObservation: "Restore guard" });
  });

  it("keeps manual actions explicitly separate from module-created records", () => {
    expect(normalizeActionSource(action({ source: "Manual", sourceTitle: "Manual action", sourceModule: "manual" }))).toMatchObject({ sourceModule: "manual", sourceLabel: "Manual" });
  });

  it("prioritizes overdue and critical work before normal work", () => {
    const now = new Date("2026-09-14T12:00:00+05:30");
    const ordered = sortActionsByUrgency([
      action({ id: "NORMAL", priority: "Low", dueDate: "2026-09-20" }),
      action({ id: "CRITICAL", priority: "Critical", dueDate: "2026-09-15" }),
      action({ id: "OVERDUE", priority: "Medium", dueDate: "2026-09-10" }),
    ], now);
    expect(ordered.map((item) => item.id)).toEqual(["OVERDUE", "CRITICAL", "NORMAL"]);
  });

  it("builds focused review and completed queues", () => {
    const admin = ADMIN_USER_SEEDS.find((user) => user.id === DEMO_USERS.auditor.id);
    const records = [action({ id: "REVIEW", status: "Pending Auditor Review" }), action({ id: "DONE", status: "Completed", completedAt: "2026-09-13" })];
    expect(getActionsForTab(records, "awaiting-review", DEMO_USERS.auditor, admin).map((item) => item.id)).toEqual(["REVIEW"]);
    expect(getActionsForTab(records, "completed", DEMO_USERS.auditor, admin).map((item) => item.id)).toEqual(["DONE"]);
  });

  it("uses the same role scope needed by direct detail and report routes", () => {
    const member = DEMO_USERS.responsible;
    const memberAdmin = ADMIN_USER_SEEDS.find((user) => user.id === member.id);
    const own = action({ id: "OWN", area: member.primaryZone, responsiblePersonId: member.id, responsiblePersonName: member.name });
    const hidden = action({ id: "HIDDEN", area: "Zone A", responsiblePersonId: "USR-RITIKA", responsiblePersonName: "Ritika" });
    expect(getRoleVisibleActions([own, hidden], member, memberAdmin).map((item) => item.id)).toEqual(["OWN"]);
  });

  it("includes explicit reviewers in the awaiting-review queue", () => {
    const member = DEMO_USERS.responsible;
    const memberAdmin = ADMIN_USER_SEEDS.find((user) => user.id === member.id);
    const review = action({ id: "EXPLICIT", status: "Pending Auditor Review", reviewerId: member.id, reviewerName: member.name, responsiblePersonId: "USR-RITIKA", responsiblePersonName: "Ritika" });
    expect(getActionsForTab([review], "awaiting-review", member, memberAdmin).map((item) => item.id)).toEqual(["EXPLICIT"]);
  });

  it("deep-links Audit actions to the specific report when an Audit ID is available", () => {
    expect(getActionSourceHref(action({ auditId: "AUD / 14", sourceId: undefined }))).toBe("/5s/audits/AUD%20%2F%2014/report");
    expect(getActionSourceHref(action({ auditId: undefined, sourceId: undefined, sourceTitle: "" }))).toBe("/audits");
  });

  it("deep-links Visual Management and legacy Visual Improvement actions to real source routes", () => {
    expect(getActionSourceHref(action({ source: "Visual Management", sourceModule: "visualManagement", sourceId: "VMM / 14" }))).toBe("/visual-management/meetings/VMM%20%2F%2014");
    expect(getActionSourceHref(action({ source: "Visual Improvement", sourceModule: "visualImprovement", sourceId: "VI / 14" }))).toBe("/visual-improvement/VI%20%2F%2014");
  });

  it("applies dashboard-compatible overdue and source filters", () => {
    const now = new Date("2026-09-14T12:00:00+05:30");
    const records = [action({ id: "OVERDUE", dueDate: "2026-09-10" }), action({ id: "TODAY", dueDate: "2026-09-14" })];
    expect(filterActionCenterItems(records, { ...allFilters, status: "Overdue", source: "audit" }, now).map((item) => item.id)).toEqual(["OVERDUE"]);
  });

  it("hides disabled module sources from filters while retaining Manual", () => {
    const ids: AccessCapabilityId[] = ["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"];
    const access = Object.fromEntries(ids.map((id) => [id, id === "audit" || id === "actions"])) as Record<AccessCapabilityId, boolean>;
    expect(getEnabledActionSources(access).map((item) => item.id)).toEqual(["audit", "manual"]);
  });

  it("uses Visual Management as the visible meeting action source while isolating the legacy source", () => {
    const ids: AccessCapabilityId[] = ["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"];
    const access = Object.fromEntries(ids.map((id) => [id, true])) as Record<AccessCapabilityId, boolean>;
    expect(getEnabledActionSources(access).map((item) => item.id)).toContain("visualManagement");
    expect(getEnabledActionSources(access).map((item) => item.id)).not.toContain("visualImprovement");
    expect(normalizeActionSource(action({ source: "Visual Management", sourceTitle: "VMM-2026-014", sourceModule: "visualManagement" }))).toMatchObject({ sourceModule: "visualManagement", sourceLabel: "Visual Management" });
  });
});
