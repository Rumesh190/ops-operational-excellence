"use client";

import { useSyncExternalStore } from "react";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { usePersonalSettings } from "@/lib/profile-settings";

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  initials: string;
  plant: string;
  primaryZone: string;
  isSuperAdmin: boolean;
}

export const DEMO_USERS = {
  auditor: {
    id: "USR-LAKSHMAN",
    name: "Lakshman",
    role: "Zone A Leader · Auditor",
    initials: "LK",
    plant: "Egmore Plant",
    primaryZone: "Zone A",
    isSuperAdmin: false,
  },
  leader: {
    id: "USR-RUMESH",
    name: "Rumesh",
    role: "Zone B Leader",
    initials: "RU",
    plant: "Egmore Plant",
    primaryZone: "Zone B",
    isSuperAdmin: false,
  },
  responsible: {
    id: "USR-SIVA-KUMAR",
    name: "Siva Kumar",
    role: "Zone B Member",
    initials: "SK",
    plant: "Egmore Plant",
    primaryZone: "Zone B",
    isSuperAdmin: false,
  },
  superAdmin: {
    id: "USR-OPS-SUPER-ADMIN",
    name: "OPS Super Admin",
    role: "Platform Administrator",
    initials: "SA",
    plant: "All organizations",
    primaryZone: "Platform",
    isSuperAdmin: true,
  },
} as const satisfies Record<string, DemoUser>;

export type DemoRole = keyof typeof DEMO_USERS;

/** Default identity used during server rendering and for the audit workflow. */
export const CURRENT_USER = DEMO_USERS.auditor;

const STORAGE_KEY = "five-s-demo-role";
const listeners = new Set<() => void>();
let activeRole: DemoRole = "auditor";
let storageLoaded = false;

function loadStoredRole() {
  if (storageLoaded || typeof window === "undefined") return;
  storageLoaded = true;
  const storedRole = window.localStorage.getItem(STORAGE_KEY);
  if (storedRole === "auditor" || storedRole === "leader" || storedRole === "responsible" || storedRole === "superAdmin") activeRole = storedRole;
}

function subscribe(listener: () => void) {
  loadStoredRole();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DemoUser {
  loadStoredRole();
  return DEMO_USERS[activeRole];
}

function getServerSnapshot(): DemoUser {
  return CURRENT_USER;
}

export function setDemoRole(role: DemoRole) {
  if (role === activeRole) return;
  activeRole = role;
  storageLoaded = true;
  window.localStorage.setItem(STORAGE_KEY, role);
  listeners.forEach((listener) => listener());
}

export function getCurrentDemoUser() {
  return getSnapshot();
}

export function useCurrentUser() {
  const identity = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const configured = useAdminUsers().find((user) => user.id === identity.id);
  const personal = usePersonalSettings(identity.id);
  const name = personal.profile.fullName || configured?.name || identity.name;
  return {
    ...identity,
    name,
    initials: name.split(/\s+/).filter(Boolean).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase() || identity.initials,
    plant: configured?.plant ?? identity.plant,
    primaryZone: configured?.zoneMemberships[0]?.zone ?? identity.primaryZone,
    photo: personal.profile.photo,
  };
}
