import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

afterEach(() => vi.unstubAllGlobals());

describe("personal Profile Settings", () => {
  it("replaces the placeholder with four personal settings tabs", () => {
    const route = read("app/(app)/profile/page.tsx");
    const page = read("features/profile/profile-page.tsx");
    expect(route).toContain("ProfileSettingsPage");
    expect(route).not.toContain("ComingSoonPanel");
    ["Profile", "Security", "Preferences", "Notifications"].forEach((label) => expect(page).toContain(`label: "${label}"`));
    expect(page).toContain("Managed by your organization administrator.");
    expect(page).toContain("Organization notification rules remain under Settings.");
  });

  it("persists profile, landing, and notifications independently per user", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } });
    vi.resetModules();
    const store = await import("@/lib/profile-settings");
    expect(store.savePersonalProfile("USR-A", { fullName: "Asha Devi", phone: "555-0100", jobTitle: "Auditor" }).success).toBe(true);
    expect(store.savePersonalPreferences("USR-A", { defaultLandingPage: "/gemba" }).success).toBe(true);
    expect(store.savePersonalNotifications("USR-A", { ...store.DEFAULT_NOTIFICATION_PREFERENCES, auditNotifications: false }).success).toBe(true);

    expect(store.getPersonalSettings("USR-A")).toMatchObject({
      profile: { fullName: "Asha Devi", phone: "555-0100", jobTitle: "Auditor" },
      preferences: { defaultLandingPage: "/gemba" },
      notifications: { auditNotifications: false, gembaNotifications: true },
    });
    expect(store.getPersonalSettings("USR-B")).toEqual(store.DEFAULT_PERSONAL_SETTINGS);
    expect(values.has("ops-personal-profile-settings-v1")).toBe(true);
  });

  it("validates profile image type and size", async () => {
    vi.resetModules();
    const { validateProfilePhoto } = await import("@/lib/profile-settings");
    expect(validateProfilePhoto({ type: "image/png", size: 1024 })).toBe("");
    expect(validateProfilePhoto({ type: "image/gif", size: 1024 })).toContain("JPG");
    expect(validateProfilePhoto({ type: "image/jpeg", size: 3 * 1024 * 1024 })).toContain("2 MB");
  });

  it("keeps organization identity read-only and filters landing modules through entitlements", () => {
    const page = read("features/profile/profile-page.tsx");
    expect(page).toContain('value={adminUser?.email ?? "Not available"} readOnly');
    expect(page).toContain('access.gemba');
    expect(page).toContain('access.visualManagement');
    expect(page).not.toContain("setNavigationPosition");
    expect(read("components/auth/login-screen.tsx")).toContain("preferences.defaultLandingPage");
  });
});
