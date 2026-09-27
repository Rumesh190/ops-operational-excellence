import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getActionSourceDefinition, getActionSourceHref } from "@/lib/actions/action-config";
import { getModuleDisplayName } from "@/lib/relationships/route-resolver";
import { DEMO_USERS } from "@/lib/current-user";
import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import type { ContinuousImprovement } from "@/features/five-s/continuous-improvement/types";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

async function loadStore(localStorage = storage()) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "batch-a-test" });
  return import("@/features/five-s/continuous-improvement/store");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Batch A — Continual Improvement terminology", () => {
  it("uses the requested user-facing name in registry, navigation, module pages, settings, and reports", () => {
    expect(source("lib/modules.ts")).toContain('label: "Continual Improvement"');
    expect(source("lib/navigation.ts")).toContain('"/continuous-improvement": "Continual Improvement"');
    expect(source("features/five-s/continuous-improvement/landing-page.tsx")).toContain('title="Continual Improvement"');
    expect(source("app/(app)/continuous-improvement/settings/page.tsx")).toContain('title="Continual Improvement"');
    expect(source("features/five-s/continuous-improvement/report-page.tsx")).toContain("Continual Improvement Report");
    expect(source("features/reports/report-registry.ts")).toContain('label: "Continual Improvement"');
  });

  it("updates cross-module display labels while preserving canonical source compatibility", () => {
    expect(getActionSourceDefinition({ source: "Continuous Improvement", sourceModule: "continuousImprovement" }).label).toBe("Continual Improvement");
    expect(getActionSourceHref({ ...MY_ACTIONS[0], source: "Continuous Improvement", sourceModule: "continuousImprovement", sourceId: "CI-2026-001" })).toBe("/continuous-improvement/CI-2026-001");
    expect(getModuleDisplayName("continuousImprovement")).toBe("Continual Improvement");
    expect(source("features/gemba/gemba-report-page.tsx")).toContain('label="Continual Improvement"');
    expect(source("features/gemba/components/create-ci-from-observation-dialog.tsx")).toContain("Create Improvement");
  });

  it("keeps stable route, entitlement, storage, relationship, and record identifiers", () => {
    const modules = source("lib/modules.ts");
    const store = source("features/five-s/continuous-improvement/store.ts");
    expect(modules).toContain('id: "continuousImprovement"');
    expect(modules).toContain('route: "/continuous-improvement"');
    expect(store).toContain('const STORAGE_KEY = "five-s-continuous-improvements-v1"');
    expect(source("lib/relationships/types.ts")).toContain('| "continuousImprovement"');
  });
});

describe("Batch A — Actual Completion Date", () => {
  it("does not fabricate completion timestamps for active lifecycle stages", async () => {
    const api = await loadStore();
    for (const status of ["draft", "submitted", "under_review", "approved", "in_progress"] as const) {
      const item = api.CONTINUOUS_IMPROVEMENT_SEED_RECORDS.find((record) => record.status === status)!;
      expect(item.completedAt).toBeUndefined();
    }
  });

  it("persists one canonical timestamp only when completion succeeds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T10:35:00.000Z"));
    const localStorage = storage();
    const api = await loadStore(localStorage);
    const active = api.CONTINUOUS_IMPROVEMENT_SEED_RECORDS.find((record) => record.status === "in_progress")!;
    api.setImprovements([{ ...active, actionIds: [] }]);
    const completed = api.completeImprovement(active.id, {
      actionTaken: "Installed and verified the improved method.",
      actualSaving: 500,
      evidence: [{ id: "AFTER", name: "after.jpg", url: "data:image/jpeg;base64,after", uploadedAt: "2026-09-26T10:30:00.000Z", uploadedBy: DEMO_USERS.responsible.name }],
    }, DEMO_USERS.responsible)!;
    expect(completed.completedAt).toBe("2026-09-26T10:35:00.000Z");
    expect(() => api.completeImprovement(active.id, { actionTaken: "Again", actualSaving: 500, evidence: completed.afterEvidence }, DEMO_USERS.responsible)).toThrow();
    expect(api.getImprovementById(active.id)?.completedAt).toBe("2026-09-26T10:35:00.000Z");
    const reloaded = await loadStore(localStorage);
    expect(reloaded.getImprovementById(active.id)?.completedAt).toBe("2026-09-26T10:35:00.000Z");
  });

  it("preserves an undated legacy completed record without inventing today's date", async () => {
    const legacy = {
      id: "CI-LEGACY-001", title: "Legacy improvement", status: "completed", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-10T00:00:00.000Z",
      plant: "Egmore Plant", zone: "Zone B", zoneCode: "ZB", zoneLeaderId: "USR-LAKSHMAN", zoneLeaderName: "Lakshman", issueDescription: "Legacy issue", proposedImprovement: "Legacy proposal", expectedBenefit: "Legacy benefit", benefitType: "Other",
      estimatedTime: 2, estimatedTimeUnit: "Days", proposedById: "USR-SIVA-KUMAR", proposedByName: "Siva Kumar", ownerId: "USR-SIVA-KUMAR", ownerName: "Siva Kumar",
      memberIds: [], memberNames: [], participants: [], actionIds: [], beforeEvidence: [], afterEvidence: [], existingPhotos: [], evidence: [], timeline: [], proposedSaving: 0,
    } satisfies ContinuousImprovement;
    const localStorage = storage({
      "five-s-continuous-improvements-v1": JSON.stringify([legacy]),
      "five-s-continuous-improvements-fixture-version": "ops-ci-workflow-v2",
    });
    const api = await loadStore(localStorage);
    expect(api.getImprovementById(legacy.id)?.completedAt).toBeUndefined();
  });

  it("recovers a trustworthy legacy completion timestamp from canonical history", async () => {
    const timestamp = "2025-01-10T09:15:00.000Z";
    const seedStore = await loadStore();
    const completed = seedStore.CONTINUOUS_IMPROVEMENT_SEED_RECORDS.find((item) => item.status === "completed")!;
    const legacy = { ...completed, id: "CI-LEGACY-HISTORY", completedAt: undefined, timeline: [...completed.timeline, { id: "LEGACY-DONE", type: "completed" as const, actorId: "USR-LAKSHMAN", actorName: "Lakshman", at: timestamp }] };
    const localStorage = storage({
      "five-s-continuous-improvements-v1": JSON.stringify([legacy]),
      "five-s-continuous-improvements-fixture-version": "ops-ci-workflow-v2",
    });
    const api = await loadStore(localStorage);
    expect(api.getImprovementById(legacy.id)?.completedAt).toBe(timestamp);
  });

  it("presents planning duration separately from the actual completion outcome", () => {
    const report = source("features/five-s/continuous-improvement/report-page.tsx");
    expect(report).toContain('label="Estimated Duration"');
    expect(report).toContain('label="Actual Completion Date"');
    expect(report).toContain('item.status === "completed" ? "Not recorded" : "Not completed"');
    expect(report).not.toContain('label="Estimated Time"');
    expect(source("features/five-s/continuous-improvement/new-page.tsx")).toContain('label="Estimated Completion Time *"');
  });
});
