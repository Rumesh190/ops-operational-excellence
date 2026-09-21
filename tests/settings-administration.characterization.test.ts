import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

afterEach(() => vi.unstubAllGlobals());

describe("Settings administration hub", () => {
  it("keeps only Settings in the global SYSTEM navigation", () => {
    const sidebar = read("components/navigation/sidebar-nav.tsx");
    expect(sidebar).toContain('href="/settings" label="Settings"');
    expect(sidebar).not.toContain('label="User Management"');
    const account = read("components/navigation/user-menu.tsx");
    expect(account).not.toContain('href="/admin/users"');
    expect(account).not.toContain('href="/super-admin/organizations"');
  });

  it("exposes protected Settings destinations for administration", () => {
    [
      "settings/users/page.tsx", "settings/roles/page.tsx", "settings/audit/custom-questions/page.tsx",
      "settings/actions/categories/page.tsx", "settings/actions/reminder-rules/page.tsx",
      "settings/visual-management/boards/page.tsx", "settings/module-access/page.tsx",
    ].forEach((route) => expect(fs.existsSync(path.join(root, "app/(app)", route))).toBe(true));
    const home = read("app/(app)/settings/page.tsx");
    expect(home).toContain('access: "platform"');
    expect(home).toContain('href: "/settings/module-access"');
  });

  it("keeps live User Management routes on the canonical administration implementation", () => {
    for (const route of ["app/(app)/admin/users/page.tsx", "app/(app)/administration/users/page.tsx", "app/(app)/settings/users/page.tsx"]) {
      expect(read(route)).toContain('from "@/features/five-s/administration/users-page"');
    }
    const sourceFiles = fs.readdirSync(path.join(root, "app"), { recursive: true })
      .filter((entry) => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => read(path.join("app", entry as string)));
    expect(sourceFiles.some((source) => source.includes('from "@/features/administration'))).toBe(false);
  });

  it("uses cards only for discovery and a shared detail-page return link", () => {
    expect(fs.existsSync(path.join(root, "components/settings/settings-nav.tsx"))).toBe(false);
    const layout = read("app/(app)/settings/layout.tsx");
    expect(layout).not.toContain("SettingsNav");
    expect(layout).toContain("SettingsDetailBack");
    const back = read("components/settings/settings-detail-back.tsx");
    // Component now accepts backHref/label props; defaults to "/settings" / "Back to Settings"
    expect(back).toContain("pathname === backHref");
    expect(back).toContain('"Back to Settings"');
  });

  it("filters role-aware Settings cards by category, setting, and description", () => {
    const home = read("app/(app)/settings/page.tsx");
    expect(home).toContain('placeholder="Search Settings"');
    expect(home).toContain("group.title");
    expect(home).toContain("group.description");
    expect(home).toContain("item.label");
    expect(home).toContain("item.description");
    expect(home).toContain("access.isSuperAdmin");
  });

  it("adds category breadcrumbs without linking to nonexistent category routes", () => {
    const breadcrumbs = read("components/navigation/breadcrumb-nav.tsx");
    expect(breadcrumbs).toContain('label: "Users & Access"');
    expect(breadcrumbs).toContain('label: "Preferences"');
    expect(breadcrumbs).toContain('label: "Platform Administration"');
    expect(breadcrumbs).toContain('{ label: "Settings", href: "/settings" }');
  });

  it("reuses staged organization entitlements for Settings Module Access", () => {
    const page = read("features/settings/module-access-page.tsx");
    expect(page).toContain("useOrganizationAccess");
    expect(page).toContain("saveOrganizationAccess");
    expect(page).toContain("unsaved");
    expect(page).toContain("Disable Module");
    expect(page).toContain("Existing records will remain preserved");
  });

  it("persists configurable Action categories without changing historical Actions", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
    vi.stubGlobal("crypto", { randomUUID: () => "test-category" });
    vi.resetModules();
    const store = await import("@/lib/actions/action-category-store");
    const created = store.addActionCategory("Machine Guarding")!;
    expect(created.id).toBe("ACTION-CATEGORY-test-category");
    expect(store.updateActionCategory(created.id, "Machine Safety")).toBe(true);
    expect(store.setActionCategoryActive(created.id, false)).toBe(true);
    expect(values.has("ops-action-configuration-v1")).toBe(true);
  });
});
