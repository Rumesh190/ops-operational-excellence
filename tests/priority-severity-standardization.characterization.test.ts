import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_RED_FLAG_SEVERITIES } from "@/features/red-flag/types";
import { ACTION_PRIORITY_CONFIG, sortActionsByUrgency } from "@/lib/actions/action-config";
import type { MyAction } from "@/features/five-s/types/my-actions";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actionCenter = source("features/actions/action-center-page.tsx");
const linkedAction = source("features/actions/create-linked-action-dialog.tsx");
const redFlagNew = source("features/red-flag/red-flag-new-page.tsx");
const redFlagPage = source("features/red-flag/red-flag-page.tsx");
const redFlagReport = source("features/red-flag/red-flag-report-page.tsx");
const auditChecklist = source("features/five-s/components/FiveSAuditChecklist.tsx");
const gemba = source("features/gemba/gemba-walk-page.tsx");

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

afterEach(() => vi.unstubAllGlobals());

describe("Team Feedback #25/#30 — active priority and severity", () => {
  it("scopes the active Red Flag model to High, Medium, and Low", () => {
    expect(ACTIVE_RED_FLAG_SEVERITIES).toEqual(["High", "Medium", "Low"]);
    expect(redFlagNew).toContain("ACTIVE_RED_FLAG_SEVERITIES.map");
    expect(redFlagNew).not.toContain('["Critical", "High", "Medium", "Low"]');
  });

  it("central Action selectors exclude Critical even when legacy configuration marks it active", async () => {
    vi.resetModules();
    const localStorage = storage({
      "ops-action-configuration-v1": JSON.stringify({
        priorities: [
          { id: "Critical", label: "Critical", dueOffsetDays: 1, active: true, description: "legacy", order: 1 },
          { id: "High", label: "High", dueOffsetDays: 1, active: true, description: "", order: 2 },
          { id: "Medium", label: "Medium", dueOffsetDays: 2, active: true, description: "", order: 3 },
          { id: "Low", label: "Low", dueOffsetDays: 3, active: true, description: "", order: 4 },
        ], categories: [], reminders: { dueSoon: { enabled: true, daysBeforeDue: 1 }, dueToday: { enabled: true }, overdue: { enabled: true, daysAfterDue: 1 }, repeatOverdue: { enabled: true, repeatEveryDays: 1 }, includeZoneLeader: false }, escalations: [],
      }),
    });
    vi.stubGlobal("window", { localStorage }); vi.stubGlobal("localStorage", localStorage);
    const configuration = await import("@/lib/actions/action-configuration-store");
    expect(configuration.getActiveActionPriorities().map((item) => item.id)).toEqual(["High", "Medium", "Low"]);
    expect(JSON.parse(localStorage.getItem("ops-action-configuration-v1")!).priorities[0].id).toBe("Critical");
  });

  it("keeps approved High, Medium, and Low due-date offsets", async () => {
    vi.resetModules();
    const localStorage = storage(); vi.stubGlobal("window", { localStorage }); vi.stubGlobal("localStorage", localStorage);
    const configuration = await import("@/lib/actions/action-configuration-store");
    const today = new Date(2026, 8, 24);
    expect(configuration.getPriorityDueDate("High", today)).toBe("2026-09-25");
    expect(configuration.getPriorityDueDate("Medium", today)).toBe("2026-09-26");
    expect(configuration.getPriorityDueDate("Low", today)).toBe("2026-09-27");
  });

  it("retains legacy Critical rendering, rank, and deterministic sorting", () => {
    expect(ACTION_PRIORITY_CONFIG.Critical.label).toBe("Critical");
    expect(ACTION_PRIORITY_CONFIG.Critical.rank).toBeGreaterThan(ACTION_PRIORITY_CONFIG.High.rank);
    const base = { status: "Assigned", dueDate: "2099-01-01", createdAt: "2026-01-01", evidence: [] } as unknown as MyAction;
    expect(sortActionsByUrgency([{ ...base, id: "HIGH", priority: "High" }, { ...base, id: "LEGACY", priority: "Critical" }], new Date("2026-09-24")).map((item) => item.id)).toEqual(["LEGACY", "HIGH"]);
  });

  it("keeps legacy Critical records discoverable only when present", () => {
    expect(actionCenter).toContain('hasLegacyCritical && <SelectItem value="Critical">Legacy: Critical</SelectItem>');
    expect(redFlagPage).toContain('hasLegacyCritical ? ["Critical"] : []');
    expect(redFlagPage).toContain('flag.severity === "Critical"');
  });

  it("preserves historical Critical report output and seed compatibility", () => {
    expect(redFlagReport).toContain("flag.severity");
    expect(source("features/red-flag/red-flag-store.ts")).toContain('severity: "Critical"');
    expect(source("features/five-s/types/my-actions.ts")).toContain('| "Critical"');
  });

  it("keeps legacy KPI and dashboard records counted rather than dropping them", () => {
    expect(source("features/analytics/analytics-data.ts")).toContain('item.severity === "Critical"');
    expect(source("features/ops-dashboard/ops-dashboard-data.ts")).toContain('flag.severity === "Critical"');
    expect(source("features/red-flag/red-flag-store.ts")).toContain('flag.severity === "Critical"');
  });

  it("updates Audit Action selection through the canonical three-value rule without changing compliance", () => {
    expect(auditChecklist).toContain('<option value="High">');
    expect(auditChecklist).toContain('<option value="Medium">');
    expect(auditChecklist).toContain('<option value="Low">');
    expect(auditChecklist).not.toContain('<option value="Critical">');
    expect(auditChecklist).toContain("Non Compliance");
  });

  it("preserves Gemba Opportunity hidden Low priority and Issue shared selector", () => {
    expect(gemba).toContain('defaultPriority: observation.type === "Opportunity" ? "Low" : undefined');
    expect(gemba).toContain('hidePriority: observation.type === "Opportunity"');
    expect(linkedAction).toContain("actionPriorities.map");
  });

  it("does not reinterpret unrelated critical terminology", () => {
    expect(source("lib/ops-presentation.ts")).toContain('critical: "danger"');
    expect(source("features/five-s/reports-page.tsx")).toContain('"Critical"');
    expect(source("lib/relationships/relationship-store.ts")).toContain("CRITICAL");
  });
});
