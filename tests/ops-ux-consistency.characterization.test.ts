import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { crumbsForPath } from "@/components/navigation/breadcrumb-nav";
import { DEMO_USERS } from "@/lib/current-user";
import { formatOpsDate, formatOpsDateTime, formatOpsMoney, formatOpsPercent, formatOpsRelativeDate } from "@/lib/ops-formatters";
import { getOpsStatusFamily, getOpsStatusVariant, OPS_PRIORITY, OPS_SOURCE_LABELS } from "@/lib/ops-presentation";
import { ACTION_PRIORITY_CONFIG, ACTION_SOURCE_CONFIG, ACTION_STATUS_CONFIG } from "@/lib/actions/action-config";
import { GEMBA_SEED_STATE } from "@/features/gemba/gemba-store";
import { canViewGembaWalk, visibleGembaWalks } from "@/features/gemba/gemba-access";
import { VISUAL_MANAGEMENT_INITIAL_STATE } from "@/features/visual-management/visual-management-store";
import { canViewVisualManagementBoard, visibleVisualManagementMeetings } from "@/features/visual-management/visual-management-access";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("OPS UX consistency layer", () => {
  it("maps workflow statuses into shared semantic families", () => {
    expect(getOpsStatusFamily("Draft")).toBe("neutral");
    expect(getOpsStatusVariant("In Progress")).toBe("info");
    expect(getOpsStatusVariant("Awaiting Review")).toBe("warning");
    expect(getOpsStatusVariant("Overdue")).toBe("danger");
    expect(getOpsStatusVariant("Completed")).toBe("success");
    expect(getOpsStatusVariant("Rework Required")).toBe("danger");
    expect(ACTION_STATUS_CONFIG["Awaiting Review"].variant).toBe("warning");
  });

  it("uses one priority order and one source vocabulary", () => {
    expect(Object.values(OPS_PRIORITY).map((priority) => priority.rank)).toEqual([4, 3, 2, 1]);
    expect(ACTION_PRIORITY_CONFIG.Critical.rank).toBe(OPS_PRIORITY.Critical.rank);
    expect(ACTION_PRIORITY_CONFIG.Low.variant).toBe(OPS_PRIORITY.Low.variant);
    expect(ACTION_SOURCE_CONFIG.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "gemba", label: OPS_SOURCE_LABELS.gemba },
      { id: "redFlag", label: OPS_SOURCE_LABELS.redFlag },
      { id: "redTag", label: OPS_SOURCE_LABELS.redTag },
      { id: "continuousImprovement", label: OPS_SOURCE_LABELS.continuousImprovement },
      { id: "audit", label: OPS_SOURCE_LABELS.audit },
      { id: "visualManagement", label: OPS_SOURCE_LABELS.visualManagement },
      { id: "manual", label: OPS_SOURCE_LABELS.manual },
    ]);
  });

  it("formats dates, date-times, relative time, INR, and percentages centrally", () => {
    expect(formatOpsDate("2026-09-15")).toBe("15 Sep 2026");
    expect(formatOpsDateTime("2026-09-15T09:30:00+05:30")).toContain("15 Sep 2026 · 09:30");
    expect(formatOpsRelativeDate("2026-09-15", new Date("2026-09-15T12:00:00+05:30"))).toBe("Today");
    expect(formatOpsRelativeDate("2026-09-15T10:00:00+05:30", new Date("2026-09-15T12:00:00+05:30"))).toBe("2h ago");
    expect(formatOpsMoney(30_100)).toBe("₹30,100");
    expect(formatOpsPercent(82)).toBe("82%");
  });

  it("preserves record IDs and decodes nested breadcrumb segments", () => {
    expect(crumbsForPath("/gemba/GEM-2026-014").map((crumb) => crumb.label)).toEqual(["Observe", "Gemba", "GEM-2026-014"]);
    expect(crumbsForPath("/actions/ACT-2026-031").map((crumb) => crumb.label)).toEqual(["Execution", "Actions", "ACT-2026-031"]);
    expect(crumbsForPath("/gemba/GEM%202026").at(-1)?.label).toBe("GEM 2026");
  });

  it("reuses the common tabs, empty state, and timeline wrappers", () => {
    for (const path of [
      "features/gemba/gemba-components.tsx",
      "features/red-flag/red-flag-components.tsx",
      "features/five-s/continuous-improvement/components.tsx",
      "features/visual-management/visual-management-components.tsx",
      "features/actions/action-center-page.tsx",
      "features/five-s/action-detail-page.tsx",
      "features/reports/reports-page.tsx",
    ]) expect(source(path)).toContain("OpsTabBar");
    expect(source("features/ops-dashboard/ops-dashboard-page.tsx")).toContain("OpsTabBar");
    expect(source("features/red-flag/red-flag-components.tsx")).toContain("OpsTimeline");
    expect(source("features/five-s/continuous-improvement/components.tsx")).toContain("OpsTimeline");
    expect(source("features/gemba/gemba-detail-page.tsx")).toContain("OpsTimeline");
    expect(source("features/five-s/action-detail-page.tsx")).toContain("OpsTimeline");
    for (const path of ["features/gemba/gemba-components.tsx", "features/red-flag/red-flag-components.tsx", "features/five-s/continuous-improvement/components.tsx"]) expect(source(path)).toContain("OpsEvidenceViewer");
  });

  it("applies list visibility to Gemba and Visual Management direct records", () => {
    const zoneAWalk = GEMBA_SEED_STATE.walks.find((walk) => walk.zone === "Zone A")!;
    expect(canViewGembaWalk(zoneAWalk, DEMO_USERS.leader, ["Zone Leader"])).toBe(false);
    expect(visibleGembaWalks(GEMBA_SEED_STATE.walks, DEMO_USERS.auditor, ["Auditor"]).length).toBe(GEMBA_SEED_STATE.walks.length);

    const zoneABoard = VISUAL_MANAGEMENT_INITIAL_STATE.boards.find((board) => board.zone === "Zone A")!;
    expect(canViewVisualManagementBoard(zoneABoard, DEMO_USERS.leader, ["Zone Leader"])).toBe(false);
    const visibleMeetings = visibleVisualManagementMeetings(VISUAL_MANAGEMENT_INITIAL_STATE.meetings, VISUAL_MANAGEMENT_INITIAL_STATE.boards, DEMO_USERS.leader, ["Zone Leader"]);
    expect(visibleMeetings.every((meeting) => meeting.zone === "Zone B" || VISUAL_MANAGEMENT_INITIAL_STATE.boards.find((board) => board.id === meeting.boardId)?.members.some((member) => member.id === DEMO_USERS.leader.id))).toBe(true);
    expect(source("features/gemba/gemba-detail-page.tsx")).toContain("canViewGembaWalk");
    expect(source("features/visual-management/meeting-detail-page.tsx")).toContain("canViewVisualManagementMeeting");
  });

  it("deep-links dashboard Gemba cards to the relevant views", () => {
    const dashboard = source("features/ops-dashboard/ops-dashboard-data.ts");
    expect(dashboard).toContain('href: "/gemba?tab=walks"');
    expect(dashboard).toContain('href: "/gemba?tab=observations"');
    expect(source("features/ops-dashboard/ops-dashboard-page.tsx")).toContain('href: "/gemba/new"');
  });
});
