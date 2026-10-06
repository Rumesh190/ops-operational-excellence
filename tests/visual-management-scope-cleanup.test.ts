import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Visual Management active-scope cleanup", () => {
  it("removes standalone escalation and decision capabilities from active navigation and landing", () => {
    const nav = read("features/visual-management/visual-management-components.tsx");
    const landing = read("features/visual-management/visual-management-page.tsx");
    expect(nav).not.toContain('{ id: "escalations"');
    expect(nav).not.toContain('href: "/visual-management/escalations"');
    expect(nav).not.toContain('{ id: "decisions"');
    expect(landing).not.toContain("Open Escalations");
    expect(landing).not.toContain("Pending Decisions");
  });

  it("removes active creation and presentation paths from boards and meetings", () => {
    const board = read("features/visual-management/board-detail-page.tsx");
    const boards = read("features/visual-management/boards-page.tsx");
    const mode = read("features/visual-management/meeting-mode-page.tsx");
    const detail = read("features/visual-management/meeting-detail-page.tsx");
    expect(`${board}\n${boards}`).not.toMatch(/Create Escalation|Escalate Further|Open Escalations|Escalations from Lower Tiers|Record Decision/);
    expect(mode).not.toMatch(/createMeetingEscalation|addMeetingDecision|Record Decision|Add Decision|title="Escalations"|title="Decisions"/);
    expect(detail).not.toMatch(/title="Escalations"|title="Decisions"|<strong>Decision:/);
    expect(mode).toContain("Complete Meeting");
    expect(mode).toContain("Create Action");
  });

  it("redirects the deprecated route and keeps settings focused on active configuration", () => {
    const route = read("app/(app)/visual-management/escalations/page.tsx");
    const settings = read("app/(app)/visual-management/settings/page.tsx");
    expect(route).toContain('permanentRedirect("/visual-management")');
    expect(settings).toContain("VisualManagementBoardsSettingsPage");
    expect(settings).not.toMatch(/KPI Configuration|Tier Structure|KPI Sections/);
    for (const page of ["kpi-configuration", "kpi-sections", "tiers", "boards"]) expect(read(`app/(app)/visual-management/settings/${page}/page.tsx`)).toContain('redirect("/visual-management/settings")');
    expect(settings).not.toMatch(/Escalation & Decision|Pending Decisions/);
  });

  it("hydrates historical escalation and decision data without destructive migration", async () => {
    const seed = { boards: [], meetings: [], topics: [], decisions: [{ id: "VMD-OLD", meetingId: "VMM-OLD", decision: "Historical", createdAt: "2025-01-01" }], escalations: [{ id: "VME-OLD", sourceBoardId: "A", sourceMeetingId: "VMM-OLD", targetBoardId: "B", topicId: "T", reason: "Historical", status: "Resolved", createdBy: { id: "U", name: "User" }, createdAt: "2025-01-01", updatedAt: "2025-01-01" }] };
    const values = new Map([["ops-visual-management-v1", JSON.stringify(seed)]]);
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    const store = await import("@/features/visual-management/visual-management-store");
    const state = store.getVisualManagementState();
    expect(state.decisions).toEqual(seed.decisions);
    expect(state.escalations).toEqual(seed.escalations);
  });

  it("preserves KPI deviation, corrective Action choices, history, trends, and snapshots", () => {
    const configured = read("features/visual-management/configured-kpi-board.tsx");
    const execution = read("features/visual-management/kpi-execution-store.ts");
    expect(configured).toContain("Corrective Action needed?");
    expect(configured).toContain("Why is corrective action not required?");
    expect(configured).toContain("CreateLinkedActionDialog");
    expect(configured).toContain("linkDeviationAction");
    expect(execution).toContain("KpiDeviation");
    expect(execution).toContain("MeetingKpiReviewSnapshot");
    expect(configured).toContain('aria-label="KPI trend"');
    expect(configured).toContain("Immutable board-specific actuals");
  });
});
