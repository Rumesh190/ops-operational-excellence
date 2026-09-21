import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

function browserStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  vi.stubGlobal("crypto", { randomUUID: () => "configured-category" });
  return values;
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("central Action configuration", () => {
  it("persists validated priority offsets and applies them only when a new due date is calculated", async () => {
    browserStorage();
    const store = await import("@/lib/actions/action-configuration-store");
    const priorities = store.DEFAULT_ACTION_PRIORITY_CONFIG.map((item) => item.id === "Medium" ? { ...item, dueOffsetDays: 3 } : { ...item });
    expect(store.saveActionPriorities(priorities).success).toBe(true);
    expect(store.getPriorityDueDate("Medium", new Date(2026, 8, 15))).toBe("2026-09-18");
    expect({ dueDate: "2026-09-17" }).toEqual({ dueDate: "2026-09-17" });
    expect(store.saveActionPriorities(priorities.map((item) => ({ ...item, active: false }))).success).toBe(false);
    expect(store.saveActionPriorities(priorities.map((item) => item.id === "Low" ? { ...item, dueOffsetDays: -1 } : item)).success).toBe(false);
  });

  it("keeps category entities centralized, ordered, inactive-safe, and unique", async () => {
    const values = browserStorage();
    const store = await import("@/lib/actions/action-configuration-store");
    const created = store.addActionCategory({ name: "Machine Guarding", description: "Guarding improvements" })!;
    expect(created).toMatchObject({ id: "ACTION-CATEGORY-configured-category", name: "Machine Guarding", active: true });
    expect(store.addActionCategory("machine guarding")).toBeUndefined();
    expect(store.setActionCategoryActive(created.id, false)).toBe(true);
    expect(store.getActionConfiguration().categories.find((item) => item.id === created.id)?.active).toBe(false);
    expect(values.has("ops-action-configuration-v1")).toBe(true);
  });

  it("validates reminder and sequential escalation timing", async () => {
    browserStorage();
    const store = await import("@/lib/actions/action-configuration-store");
    expect(store.saveActionReminderConfiguration({ ...store.DEFAULT_ACTION_REMINDER_CONFIG, dueSoon: { enabled: true, daysBeforeDue: -1 } }).success).toBe(false);
    expect(store.saveActionEscalationConfiguration([{ level: 1, daysOverdue: 3, recipientRole: "zoneLeader", enabled: true }, { level: 2, daysOverdue: 2, recipientRole: "adminReviewer", enabled: true }]).success).toBe(false);
    expect(store.saveActionEscalationConfiguration([{ level: 1, daysOverdue: 3, recipientRole: "zoneLeader", enabled: true }, { level: 2, daysOverdue: 5, recipientRole: "adminReviewer", enabled: true }]).success).toBe(true);
  });

  it("routes all creation surfaces through shared priority/category configuration", () => {
    const linked = read("features/actions/create-linked-action-dialog.tsx");
    const manual = read("features/actions/action-center-page.tsx");
    const audit = read("features/five-s/components/FiveSAuditExecution.tsx");
    for (const source of [linked, manual, audit]) {
      expect(source).toContain("useActiveActionPriorities");
      expect(source).toContain("useActiveActionCategories");
      expect(source).toContain("getPriorityDueDate");
    }
    expect(read("lib/actions/action-attention-store.ts")).toContain("getActionConfiguration");
  });

  it("provides protected canonical Action Configuration routes", () => {
    ["priority-due-dates", "categories", "reminder-rules", "escalation-rules"].forEach((route) => expect(fs.existsSync(path.join(root, `app/(app)/settings/actions/${route}/page.tsx`))).toBe(true));
    expect(read("features/settings/action-configuration-pages.tsx")).toContain("SettingsAccessDenied");
    expect(read("features/settings/action-categories-page.tsx")).toContain("SettingsAccessDenied");
  });

  it("redirects legacy Action Configuration bookmarks to canonical routes", () => {
    // /settings/action/* (singular) → /actions/settings/* (canonical module location)
    const redirects: Record<string, string> = {
      priorities: "/actions/settings/priority-due-dates",
      categories: "/actions/settings/categories",
      reminders: "/actions/settings/reminder-rules",
      escalations: "/actions/settings/escalation-rules",
    };
    for (const [route, destination] of Object.entries(redirects)) {
      const source = read(`app/(app)/settings/action/${route}/page.tsx`);
      expect(source).toContain('import { permanentRedirect } from "next/navigation"');
      expect(source).toContain(`permanentRedirect("${destination}")`);
      expect(source).not.toContain("ActionCategoriesPage");
      expect(source).not.toContain("ActionConfigurationPage");
    }
    // /settings/actions/* (plural) also permanently redirect to /actions/settings/*
    const pluralRedirects: Record<string, string> = {
      "priority-due-dates": "/actions/settings/priority-due-dates",
      "categories": "/actions/settings/categories",
      "reminder-rules": "/actions/settings/reminder-rules",
      "escalation-rules": "/actions/settings/escalation-rules",
    };
    for (const [route, destination] of Object.entries(pluralRedirects)) {
      const source = read(`app/(app)/settings/actions/${route}/page.tsx`);
      expect(source).toContain('import { permanentRedirect } from "next/navigation"');
      expect(source).toContain(`permanentRedirect("${destination}")`);
    }
  });
});
