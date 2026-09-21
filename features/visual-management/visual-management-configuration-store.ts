"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";

export type VisualManagementBoardConfigurationStatus = "Active" | "Inactive";
export type VisualManagementMeetingFrequency = "Daily" | "Every Shift" | "Weekly" | "Custom";

export interface VisualManagementTierConfiguration {
  id: string;
  name: string;
  level: number;
  description: string;
  scope: string;
  nextTierId?: string;
  active: boolean;
  order: number;
}

export interface VisualManagementKpiSectionConfiguration {
  id: string;
  name: string;
  description?: string;
  shortLabel?: string;
  active: boolean;
  order: number;
  defaultTargetType?: string;
  statusRules?: { green: string; amber: string; red: string };
  createdAt: string;
  updatedAt: string;
}

export interface VisualManagementBoardConfiguration {
  id: string;
  name: string;
  tierId: string;
  plantId: string;
  zoneId?: string;
  ownerId: string;
  memberIds: string[];
  meetingFrequency: VisualManagementMeetingFrequency;
  meetingTime?: string;
  customFrequency?: string;
  kpiSectionIds: string[];
  status: VisualManagementBoardConfigurationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VisualManagementConfiguration {
  boards: VisualManagementBoardConfiguration[];
  tiers: VisualManagementTierConfiguration[];
  kpiSections: VisualManagementKpiSectionConfiguration[];
}

const STORAGE_KEY = "ops-visual-management-configuration-v1";
const STAMP = "2026-08-01T09:00:00+05:30";

export const DEFAULT_VISUAL_MANAGEMENT_TIERS: VisualManagementTierConfiguration[] = [
  { id: "tier-1", name: "Tier 1", level: 1, description: "Zone and team daily management", scope: "Zone / Team", nextTierId: "tier-2", active: true, order: 1 },
  { id: "tier-2", name: "Tier 2", level: 2, description: "Plant operational coordination", scope: "Plant Operations", nextTierId: "tier-3", active: true, order: 2 },
  { id: "tier-3", name: "Tier 3", level: 3, description: "Leadership review and support", scope: "Leadership", active: true, order: 3 },
];

const KPI_DEFAULTS = [
  ["safety", "Safety", "S", "Safety incidents and workplace concerns"],
  ["quality", "Quality", "Q", "Product and process quality performance"],
  ["delivery", "Delivery", "D", "Plan attainment and customer delivery"],
  ["cost", "Cost", "C", "Cost performance and operational variance"],
  ["people", "People", "P", "Staffing, capability, and engagement"],
] as const;

export const DEFAULT_VISUAL_MANAGEMENT_KPI_SECTIONS: VisualManagementKpiSectionConfiguration[] = KPI_DEFAULTS.map(([id, name, shortLabel, description], index) => ({
  id, name, shortLabel, description, active: true, order: index + 1, defaultTargetType: "Text", statusRules: { green: "On target / normal", amber: "Attention required", red: "Abnormal / target missed" }, createdAt: STAMP, updatedAt: STAMP,
}));

const allKpis = DEFAULT_VISUAL_MANAGEMENT_KPI_SECTIONS.map((item) => item.id);
export const DEFAULT_VISUAL_MANAGEMENT_BOARDS: VisualManagementBoardConfiguration[] = [
  { id: "VM-ZA-T1", name: "Zone A Daily Management", tierId: "tier-1", plantId: "PLANT-EGM", zoneId: "ZONE-A", ownerId: "USR-LAKSHMAN", memberIds: ["USR-LAKSHMAN", "USR-RITIKA", "USR-SIVA-KUMAR", "USR-MANOJ-GURU"], meetingFrequency: "Daily", meetingTime: "08:45", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
  { id: "VM-ZB-T1", name: "Zone B Daily Management", tierId: "tier-1", plantId: "PLANT-EGM", zoneId: "ZONE-B", ownerId: "USR-LAKSHMAN", memberIds: ["USR-LAKSHMAN", "USR-MADAVAN", "USR-MEENA", "USR-ANAND"], meetingFrequency: "Daily", meetingTime: "09:00", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
  { id: "VM-ZC-T1", name: "Zone C Daily Management", tierId: "tier-1", plantId: "PLANT-EGM", zoneId: "ZONE-C", ownerId: "USR-RUMESH", memberIds: ["USR-RUMESH", "USR-SIVA-KUMAR", "USR-MEENA"], meetingFrequency: "Daily", meetingTime: "09:15", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
  { id: "VM-ZD-T1", name: "Zone D Daily Management", tierId: "tier-1", plantId: "PLANT-EGM", zoneId: "ZONE-D", ownerId: "USR-RITIKA", memberIds: ["USR-RITIKA", "USR-MANOJ-GURU", "USR-ANAND"], meetingFrequency: "Daily", meetingTime: "09:30", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
  { id: "VM-PLANT-T2", name: "Plant Operations", tierId: "tier-2", plantId: "PLANT-EGM", ownerId: "USR-RUMESH", memberIds: ["USR-RUMESH", "USR-LAKSHMAN", "USR-RITIKA", "USR-SIVA-KUMAR"], meetingFrequency: "Daily", meetingTime: "10:30", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
  { id: "VM-LEAD-T3", name: "Leadership Review", tierId: "tier-3", plantId: "PLANT-EGM", ownerId: "USR-RUMESH", memberIds: ["USR-RUMESH", "USR-LAKSHMAN", "USR-RITIKA"], meetingFrequency: "Weekly", customFrequency: "Monday", meetingTime: "15:00", kpiSectionIds: allKpis, status: "Active", createdAt: STAMP, updatedAt: "2026-09-14T08:55:00+05:30" },
];

export const DEFAULT_VISUAL_MANAGEMENT_CONFIGURATION: VisualManagementConfiguration = {
  boards: DEFAULT_VISUAL_MANAGEMENT_BOARDS,
  tiers: DEFAULT_VISUAL_MANAGEMENT_TIERS,
  kpiSections: DEFAULT_VISUAL_MANAGEMENT_KPI_SECTIONS,
};

let configuration = DEFAULT_VISUAL_MANAGEMENT_CONFIGURATION;
let loaded = false;
const listeners = new Set<() => void>();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<VisualManagementConfiguration> | null;
    configuration = value && Array.isArray(value.boards) && Array.isArray(value.tiers) && Array.isArray(value.kpiSections) ? value as VisualManagementConfiguration : clone(DEFAULT_VISUAL_MANAGEMENT_CONFIGURATION);
  } catch { configuration = clone(DEFAULT_VISUAL_MANAGEMENT_CONFIGURATION); }
}

function persist(next: VisualManagementConfiguration) {
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) return result;
  configuration = next;
  listeners.forEach((listener) => listener());
  return result;
}

function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
export function useVisualManagementConfiguration() { return useSyncExternalStore(subscribe, () => { load(); return configuration; }, () => DEFAULT_VISUAL_MANAGEMENT_CONFIGURATION); }
export function getVisualManagementConfiguration() { load(); return configuration; }

export function validateVisualManagementBoard(input: VisualManagementBoardConfiguration, context: { activeUserIds: readonly string[]; tierOneId?: string; activeKpiIds: readonly string[] }) {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Board Name is required.";
  if (!input.tierId) errors.tierId = "Tier is required.";
  if (!input.plantId) errors.plantId = "Plant is required.";
  if (!input.ownerId) errors.ownerId = "Board Owner is required.";
  else if (!context.activeUserIds.includes(input.ownerId)) errors.ownerId = "Board Owner must be an active user.";
  if (input.tierId === context.tierOneId && !input.zoneId) errors.zoneId = "Tier 1 Boards require a Zone.";
  if (!input.kpiSectionIds.length) errors.kpiSectionIds = "Select at least one KPI Section.";
  if (input.kpiSectionIds.some((id) => !context.activeKpiIds.includes(id))) errors.kpiSectionIds = "Inactive KPI Sections cannot be assigned to a Board.";
  return errors;
}

export function saveVisualManagementBoard(input: VisualManagementBoardConfiguration, context: Parameters<typeof validateVisualManagementBoard>[1]) {
  const errors = validateVisualManagementBoard(input, context);
  if (Object.keys(errors).length) return { success: false as const, errors };
  const current = getVisualManagementConfiguration();
  const now = new Date().toISOString();
  const id = input.id || `VM-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now()}`;
  const board = { ...input, id, name: input.name.trim(), memberIds: Array.from(new Set([input.ownerId, ...input.memberIds])), createdAt: input.createdAt || now, updatedAt: now };
  const result = persist({ ...current, boards: current.boards.some((item) => item.id === id) ? current.boards.map((item) => item.id === id ? board : item) : [...current.boards, board] });
  return result.success ? { success: true as const, board } : { success: false as const, errors: { save: result.message } };
}

export function setVisualManagementBoardStatus(id: string, status: VisualManagementBoardConfigurationStatus) {
  const current = getVisualManagementConfiguration();
  return persist({ ...current, boards: current.boards.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item) }).success;
}

export function validateVisualManagementTiers(tiers: readonly VisualManagementTierConfiguration[], boards = getVisualManagementConfiguration().boards) {
  const errors: Record<string, string> = {};
  const ordered = [...tiers].sort((a, b) => a.order - b.order);
  ordered.forEach((tier, index) => {
    if (!tier.name.trim()) errors[`${tier.id}.name`] = "Tier Name is required.";
    if (tier.order !== index + 1) errors.order = "Tier order must remain sequential.";
    if (tier.nextTierId === tier.id) errors[`${tier.id}.nextTierId`] = "A Tier cannot escalate to itself.";
    if (!tier.active && boards.some((board) => board.tierId === tier.id && board.status === "Active")) errors[`${tier.id}.active`] = `${boards.filter((board) => board.tierId === tier.id && board.status === "Active").length} active Board(s) use this Tier. Reassign or deactivate them first.`;
  });
  for (const tier of tiers) {
    const visited = new Set<string>();
    let current: VisualManagementTierConfiguration | undefined = tier;
    while (current?.nextTierId) {
      if (visited.has(current.id)) { errors[`${tier.id}.nextTierId`] = "Circular escalation paths are not allowed."; break; }
      visited.add(current.id);
      current = tiers.find((item) => item.id === current?.nextTierId);
    }
  }
  return errors;
}

export function saveVisualManagementTiers(tiers: VisualManagementTierConfiguration[]) {
  const errors = validateVisualManagementTiers(tiers);
  if (Object.keys(errors).length) return { success: false as const, errors };
  const result = persist({ ...getVisualManagementConfiguration(), tiers: tiers.map((item) => ({ ...item, name: item.name.trim(), description: item.description.trim(), scope: item.scope.trim() })) });
  return result.success ? { success: true as const } : { success: false as const, errors: { save: result.message } };
}

export function getNextVisualManagementTierName(tierName: string) {
  const current = getVisualManagementConfiguration();
  const tier = current.tiers.find((item) => item.name === tierName && item.active);
  return current.tiers.find((item) => item.id === tier?.nextTierId && item.active)?.name;
}

export function addVisualManagementKpiSection(input: { name: string; shortLabel?: string; description?: string; active?: boolean }) {
  const current = getVisualManagementConfiguration();
  const name = input.name.trim();
  if (!name || current.kpiSections.some((item) => item.name.toLowerCase() === name.toLowerCase())) return undefined;
  const now = new Date().toISOString();
  const item: VisualManagementKpiSectionConfiguration = { id: `kpi-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now()}`, name, shortLabel: input.shortLabel?.trim() || undefined, description: input.description?.trim() || undefined, active: input.active !== false, order: Math.max(0, ...current.kpiSections.map((entry) => entry.order)) + 1, defaultTargetType: "Text", statusRules: { green: "On target / normal", amber: "Attention required", red: "Abnormal / target missed" }, createdAt: now, updatedAt: now };
  return persist({ ...current, kpiSections: [...current.kpiSections, item] }).success ? item : undefined;
}

export function updateVisualManagementKpiSection(id: string, input: { name: string; shortLabel?: string; description?: string; active?: boolean }) {
  const current = getVisualManagementConfiguration();
  const name = input.name.trim();
  if (!name || current.kpiSections.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return false;
  return persist({ ...current, kpiSections: current.kpiSections.map((item) => item.id === id ? { ...item, name, shortLabel: input.shortLabel?.trim() || undefined, description: input.description?.trim() || undefined, active: input.active ?? item.active, updatedAt: new Date().toISOString() } : item) }).success;
}

export function setVisualManagementKpiSectionActive(id: string, active: boolean) {
  const current = getVisualManagementConfiguration();
  return persist({ ...current, kpiSections: current.kpiSections.map((item) => item.id === id ? { ...item, active, updatedAt: new Date().toISOString() } : item) }).success;
}

export function moveVisualManagementKpiSection(id: string, direction: -1 | 1) {
  const current = getVisualManagementConfiguration();
  const ordered = [...current.kpiSections].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((item) => item.id === id);
  const target = ordered[index + direction];
  if (index < 0 || !target) return true;
  const selected = ordered[index];
  return persist({ ...current, kpiSections: current.kpiSections.map((item) => item.id === selected.id ? { ...item, order: target.order, updatedAt: new Date().toISOString() } : item.id === target.id ? { ...item, order: selected.order, updatedAt: new Date().toISOString() } : item) }).success;
}
