"use client";

import { useSyncExternalStore } from "react";

import { safeSetStorage } from "@/lib/browser-storage";

export type OrganizationStatus = "Active" | "Inactive";

export interface OrganizationPlant {
  id: string;
  name: string;
  code: string;
  location: string;
  managerId: string;
  managerName: string;
  status: OrganizationStatus;
  description?: string;
  codeLocked: boolean;
}

export interface OrganizationZone {
  id: string;
  name: string;
  code: string;
  plantId: string;
  leaderId: string;
  leaderName: string;
  department: string;
  status: OrganizationStatus;
  description?: string;
}

export interface OrganizationMemberSeed {
  id: string;
  name: string;
  zoneId: string;
}

export const ORGANIZATION_PLANT_SEEDS: readonly OrganizationPlant[] = [
  {
    id: "PLANT-EGM",
    name: "Egmore Plant",
    code: "EGM",
    location: "Chennai",
    managerId: "USR-RUMESH",
    managerName: "Rumesh Ravi",
    status: "Active",
    description: "Primary OPS manufacturing site",
    codeLocked: true,
  },
] as const;

export const ORGANIZATION_ZONE_SEEDS: readonly OrganizationZone[] = [
  { id: "ZONE-A", name: "Zone A", code: "ZA", plantId: "PLANT-EGM", leaderId: "USR-LAKSHMAN", leaderName: "Lakshman", department: "Production", status: "Active" },
  { id: "ZONE-B", name: "Zone B", code: "ZB", plantId: "PLANT-EGM", leaderId: "USR-RUMESH", leaderName: "Rumesh", department: "Production", status: "Active" },
  { id: "ZONE-C", name: "Zone C", code: "ZC", plantId: "PLANT-EGM", leaderId: "USR-MANOJ-GURU", leaderName: "Manoj Guru", department: "Production", status: "Active" },
  { id: "ZONE-D", name: "Zone D", code: "ZD", plantId: "PLANT-EGM", leaderId: "USR-ANAND", leaderName: "Anand", department: "Production", status: "Active" },
] as const;

export const ORGANIZATION_MEMBER_SEEDS: readonly OrganizationMemberSeed[] = [
  { id: "USR-RITIKA", name: "Ritika", zoneId: "ZONE-A" },
  { id: "USR-JAMES", name: "James", zoneId: "ZONE-A" },
  { id: "USR-VASANTH", name: "Vasanth", zoneId: "ZONE-A" },
  { id: "USR-GURUMURTHI", name: "Gurumurthi", zoneId: "ZONE-A" },
  { id: "USR-VENKATESAN", name: "Venkatesan", zoneId: "ZONE-A" },
  { id: "USR-SIVA-KUMAR", name: "Siva Kumar", zoneId: "ZONE-B" },
  { id: "USR-SUBURAMIANI", name: "Suburamiani", zoneId: "ZONE-B" },
  { id: "USR-RAJ-KUMAR", name: "Raj Kumar", zoneId: "ZONE-B" },
  { id: "USR-RAMAN", name: "Raman", zoneId: "ZONE-B" },
  { id: "USR-ZEROME", name: "Zerome", zoneId: "ZONE-B" },
  { id: "USR-MADAVAN", name: "Madavan", zoneId: "ZONE-C" },
  { id: "USR-NASAR", name: "Nasar", zoneId: "ZONE-C" },
  { id: "USR-PANDIYAN", name: "Pandiyan", zoneId: "ZONE-C" },
  { id: "USR-MAHIYAS", name: "Mahiyas", zoneId: "ZONE-C" },
  { id: "USR-AKILA", name: "Akila", zoneId: "ZONE-C" },
  { id: "USR-MEENA", name: "Meena", zoneId: "ZONE-D" },
  { id: "USR-SURIYA", name: "Suriya", zoneId: "ZONE-D" },
  { id: "USR-RAHUL", name: "Rahul", zoneId: "ZONE-D" },
  { id: "USR-VIJAY", name: "Vijay", zoneId: "ZONE-D" },
  { id: "USR-MOHAMMED", name: "Mohammed", zoneId: "ZONE-D" },
] as const;

interface OrganizationState {
  plants: OrganizationPlant[];
  zones: OrganizationZone[];
}

const STORAGE_KEY = "ops-organization-configuration-v1";
const SERVER_STATE: OrganizationState = {
  plants: ORGANIZATION_PLANT_SEEDS.map((plant) => ({ ...plant })),
  zones: ORGANIZATION_ZONE_SEEDS.map((zone) => ({ ...zone })),
};
let state = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<OrganizationState> | null;
    if (parsed && Array.isArray(parsed.plants) && Array.isArray(parsed.zones)) {
      state = { plants: parsed.plants, zones: parsed.zones };
    }
  } catch {
    state = SERVER_STATE;
  }
}

function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function snapshot() { load(); return state; }
function persist(next: OrganizationState) {
  load();
  const previous = state;
  state = next;
  const result = safeSetStorage(STORAGE_KEY, state);
  if (!result.success) { state = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}

export function useOrganizationConfiguration() {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_STATE);
}

export function getOrganizationPlants() { load(); return state.plants; }
export function getOrganizationZones() { load(); return state.zones; }
export function getOrganizationPlant(idOrName: string) { return getOrganizationPlants().find((plant) => plant.id === idOrName || plant.name === idOrName); }
export function getOrganizationZone(idOrName: string) { return getOrganizationZones().find((zone) => zone.id === idOrName || zone.name === idOrName); }

export function saveOrganizationPlant(input: OrganizationPlant) {
  if (!input.name.trim()) throw new Error("Plant name is required.");
  if (!input.code.trim()) throw new Error("Plant code is required.");
  const existing = getOrganizationPlant(input.id);
  const next = { ...input, name: input.name.trim(), code: existing?.codeLocked ? existing.code : input.code.trim().toUpperCase(), location: input.location.trim(), managerName: input.managerName.trim() };
  return persist({ ...state, plants: existing ? state.plants.map((plant) => plant.id === input.id ? next : plant) : [...state.plants, next] }) ? next : null;
}

export function saveOrganizationZone(input: OrganizationZone) {
  if (!input.name.trim()) throw new Error("Zone must have a name.");
  if (!input.code.trim()) throw new Error("Zone code is required.");
  if (!getOrganizationPlant(input.plantId)) throw new Error("Select a valid Plant.");
  const existing = getOrganizationZone(input.id);
  const next = { ...input, name: input.name.trim(), code: input.code.trim().toUpperCase(), description: input.description?.trim() };
  return persist({ ...state, zones: existing ? state.zones.map((zone) => zone.id === input.id ? next : zone) : [...state.zones, next] }) ? next : null;
}

export function setOrganizationStateForTests(next: OrganizationState) {
  state = next;
  loaded = true;
  listeners.forEach((listener) => listener());
}
