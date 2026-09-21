"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import {
  DEFAULT_MODULE_ENTITLEMENTS,
  type AccessCapabilityId,
} from "@/lib/modules";

export interface Organization {
  id: string;
  name: string;
  industry: string;
  plants: number;
  users: number;
  status: "Active" | "Inactive";
  lastUpdated: string;
}

export const ORGANIZATIONS: readonly Organization[] = [
  { id: "abc-manufacturing", name: "ABC Manufacturing", industry: "Manufacturing", plants: 3, users: 42, status: "Active", lastUpdated: "Today" },
  { id: "xyz-components", name: "XYZ Components", industry: "Manufacturing", plants: 2, users: 18, status: "Active", lastUpdated: "Sep 12, 2026" },
] as const;

export const DEMO_ORGANIZATION = ORGANIZATIONS[0];
export type OrganizationAccess = Record<AccessCapabilityId, boolean>;
type OrganizationAccessMap = Record<string, OrganizationAccess>;

const STORAGE_KEY = "ops-organization-modules-v1";
const XYZ_DEFAULTS: OrganizationAccess = {
  ...DEFAULT_MODULE_ENTITLEMENTS,
  redFlag: false,
  visualImprovement: false,
  visualManagement: false,
  gemba: false,
};
const DEFAULT_ACCESS: OrganizationAccessMap = {
  [ORGANIZATIONS[0].id]: DEFAULT_MODULE_ENTITLEMENTS,
  [ORGANIZATIONS[1].id]: XYZ_DEFAULTS,
};
let accessByOrganization = DEFAULT_ACCESS;
let loaded = false;
const listeners = new Set<() => void>();

function normalize(value: unknown): OrganizationAccessMap {
  if (!value || typeof value !== "object") return DEFAULT_ACCESS;
  const parsed = value as Record<string, unknown>;
  // Migrate the first-pass single-organization shape without changing its key.
  const legacy = Object.keys(DEFAULT_MODULE_ENTITLEMENTS).some((key) => typeof parsed[key] === "boolean");
  if (legacy) return { ...DEFAULT_ACCESS, [DEMO_ORGANIZATION.id]: { ...DEFAULT_MODULE_ENTITLEMENTS, ...parsed } as OrganizationAccess };
  return Object.fromEntries(ORGANIZATIONS.map((organization) => {
    const stored = parsed[organization.id];
    const defaults = DEFAULT_ACCESS[organization.id] ?? DEFAULT_MODULE_ENTITLEMENTS;
    return [organization.id, stored && typeof stored === "object" ? { ...defaults, ...stored } : defaults];
  })) as OrganizationAccessMap;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { accessByOrganization = normalize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")); }
  catch { accessByOrganization = DEFAULT_ACCESS; }
}

function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function mapSnapshot() { load(); return accessByOrganization; }

export function useOrganizationAccess(organizationId = DEMO_ORGANIZATION.id) {
  const map = useSyncExternalStore(subscribe, mapSnapshot, () => DEFAULT_ACCESS);
  return map[organizationId] ?? DEFAULT_MODULE_ENTITLEMENTS;
}

export function getOrganizationAccess(organizationId = DEMO_ORGANIZATION.id) {
  load();
  return accessByOrganization[organizationId] ?? DEFAULT_MODULE_ENTITLEMENTS;
}

/** Current client organization access used by the normal OPS shell and route guards. */
export function useModuleEntitlements() { return useOrganizationAccess(DEMO_ORGANIZATION.id); }

export function saveOrganizationAccess(organizationId: string, access: OrganizationAccess) {
  load();
  const previous = accessByOrganization;
  accessByOrganization = { ...accessByOrganization, [organizationId]: access };
  const result = safeSetStorage(STORAGE_KEY, accessByOrganization);
  if (!result.success) { accessByOrganization = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}
