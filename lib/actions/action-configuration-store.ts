"use client";

import { useSyncExternalStore } from "react";

import type { MyActionPriority } from "@/features/five-s/types/my-actions";
import { safeSetStorage } from "@/lib/browser-storage";

export interface ActionPrioritySetting {
  id: MyActionPriority;
  label: string;
  dueOffsetDays: number;
  active: boolean;
  description: string;
  order: number;
}

export interface ActionCategorySetting {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionReminderConfiguration {
  dueSoon: { enabled: boolean; daysBeforeDue: number };
  dueToday: { enabled: boolean };
  overdue: { enabled: boolean; daysAfterDue: number };
  repeatOverdue: { enabled: boolean; repeatEveryDays: number };
  includeZoneLeader: boolean;
}

export type ActionEscalationRecipientRole = "zoneLeader" | "adminReviewer";

export interface ActionEscalationRule {
  level: 1 | 2;
  daysOverdue: number;
  recipientRole: ActionEscalationRecipientRole;
  enabled: boolean;
}

export interface ActionConfiguration {
  priorities: ActionPrioritySetting[];
  categories: ActionCategorySetting[];
  reminders: ActionReminderConfiguration;
  escalations: ActionEscalationRule[];
}

const STORAGE_KEY = "ops-action-configuration-v1";
const LEGACY_CATEGORY_KEY = "ops-action-categories-v1";
const CREATED_AT = "2026-09-15T00:00:00.000Z";

export const DEFAULT_ACTION_PRIORITY_CONFIG: ActionPrioritySetting[] = [
  { id: "Critical", label: "Critical", dueOffsetDays: 1, active: false, description: "Legacy priority retained for historical records", order: 1 },
  { id: "High", label: "High", dueOffsetDays: 1, active: true, description: "High-priority corrective work", order: 2 },
  { id: "Medium", label: "Medium", dueOffsetDays: 2, active: true, description: "Standard corrective or improvement work", order: 3 },
  { id: "Low", label: "Low", dueOffsetDays: 3, active: true, description: "Lower urgency planned work", order: 4 },
];

const CATEGORY_NAMES = ["Safety", "Quality", "Housekeeping", "Process", "Maintenance", "Training", "Visual Management", "Other"];

export const DEFAULT_ACTION_CATEGORY_CONFIG: ActionCategorySetting[] = CATEGORY_NAMES.map((name, index) => ({
  id: `ACTION-CATEGORY-${index + 1}`,
  name,
  description: name === "Other" ? "Actions that do not fit another active classification" : `${name} corrective and improvement work`,
  active: true,
  order: index + 1,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}));

export const DEFAULT_ACTION_REMINDER_CONFIG: ActionReminderConfiguration = {
  dueSoon: { enabled: true, daysBeforeDue: 1 },
  dueToday: { enabled: true },
  overdue: { enabled: true, daysAfterDue: 1 },
  repeatOverdue: { enabled: true, repeatEveryDays: 1 },
  includeZoneLeader: false,
};

export const DEFAULT_ACTION_ESCALATION_CONFIG: ActionEscalationRule[] = [
  { level: 1, daysOverdue: 2, recipientRole: "zoneLeader", enabled: true },
  { level: 2, daysOverdue: 4, recipientRole: "adminReviewer", enabled: true },
];

export const DEFAULT_ACTION_CONFIGURATION: ActionConfiguration = {
  priorities: DEFAULT_ACTION_PRIORITY_CONFIG,
  categories: DEFAULT_ACTION_CATEGORY_CONFIG,
  reminders: DEFAULT_ACTION_REMINDER_CONFIG,
  escalations: DEFAULT_ACTION_ESCALATION_CONFIG,
};

let configuration = DEFAULT_ACTION_CONFIGURATION;
let loaded = false;
const listeners = new Set<() => void>();

function cloneDefaults(): ActionConfiguration {
  return JSON.parse(JSON.stringify(DEFAULT_ACTION_CONFIGURATION)) as ActionConfiguration;
}

function normalizeStored(value: unknown): ActionConfiguration | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ActionConfiguration>;
  if (!Array.isArray(candidate.priorities) || !Array.isArray(candidate.categories) || !candidate.reminders || !Array.isArray(candidate.escalations)) return undefined;
  return candidate as ActionConfiguration;
}

function migrateLegacyCategories(): ActionCategorySetting[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEGACY_CATEGORY_KEY) ?? "null") as Array<Record<string, unknown>> | null;
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((item, index) => ({
      id: String(item.id ?? `ACTION-CATEGORY-${index + 1}`),
      name: String(item.name ?? item.label ?? "").trim(),
      description: typeof item.description === "string" ? item.description : undefined,
      active: item.active !== false,
      order: Number(item.order) || index + 1,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : CREATED_AT,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : CREATED_AT,
    })).filter((item) => item.name);
  } catch {
    return undefined;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = normalizeStored(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
    if (stored) configuration = stored;
    else {
      const legacyCategories = migrateLegacyCategories();
      configuration = { ...cloneDefaults(), categories: legacyCategories?.length ? legacyCategories : cloneDefaults().categories };
    }
  } catch {
    configuration = cloneDefaults();
  }
}

function persist(next: ActionConfiguration) {
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) return result;
  configuration = next;
  listeners.forEach((listener) => listener());
  return result;
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActionConfiguration() {
  return useSyncExternalStore(subscribe, () => { load(); return configuration; }, () => DEFAULT_ACTION_CONFIGURATION);
}

export function getActionConfiguration() {
  load();
  return configuration;
}

export function validateActionPriorities(priorities: readonly ActionPrioritySetting[]) {
  const errors: Record<string, string> = {};
  const labels = new Set<string>();
  for (const item of priorities) {
    const label = item.label.trim().toLowerCase();
    if (!label) errors[`${item.id}.label`] = "Priority label is required.";
    else if (labels.has(label)) errors[`${item.id}.label`] = "Priority labels must be unique.";
    labels.add(label);
    if (!Number.isFinite(item.dueOffsetDays) || item.dueOffsetDays < 0) errors[`${item.id}.dueOffsetDays`] = "Due offset must be 0 or greater.";
  }
  if (!priorities.some((item) => item.active)) errors.active = "At least one priority must remain active.";
  return errors;
}

export function saveActionPriorities(priorities: ActionPrioritySetting[]) {
  const errors = validateActionPriorities(priorities);
  if (Object.keys(errors).length) return { success: false as const, errors };
  const result = persist({ ...getActionConfiguration(), priorities: priorities.map((item) => ({ ...item, label: item.label.trim(), dueOffsetDays: Math.floor(item.dueOffsetDays) })) });
  return result.success ? { success: true as const } : { success: false as const, errors: { save: result.message } };
}

export function getActiveActionPriorities() {
  return getActionConfiguration().priorities.filter((item) => item.active && item.id !== "Critical").sort((a, b) => a.order - b.order);
}

export function useActiveActionPriorities() {
  return useActionConfiguration().priorities.filter((item) => item.active && item.id !== "Critical").sort((a, b) => a.order - b.order);
}

export function getPriorityDueDate(priority: MyActionPriority, today = new Date()) {
  const item = getActionConfiguration().priorities.find((entry) => entry.id === priority) ?? DEFAULT_ACTION_PRIORITY_CONFIG.find((entry) => entry.id === priority)!;
  const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  dueDate.setDate(dueDate.getDate() + item.dueOffsetDays);
  return `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
}

export function useActionCategorySettings() {
  return useActionConfiguration().categories;
}

export function useActiveActionCategories() {
  return useActionCategorySettings().filter((item) => item.active).sort((a, b) => a.order - b.order).map((item) => item.name);
}

export function addActionCategory(input: { name: string; description?: string; active?: boolean } | string) {
  const current = getActionConfiguration();
  const values = typeof input === "string" ? { name: input } : input;
  const name = values.name.trim();
  if (!name || current.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) return undefined;
  const now = new Date().toISOString();
  const id = `ACTION-CATEGORY-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const item: ActionCategorySetting = { id, name, description: values.description?.trim() || undefined, active: values.active !== false, order: Math.max(0, ...current.categories.map((entry) => entry.order)) + 1, createdAt: now, updatedAt: now };
  return persist({ ...current, categories: [...current.categories, item] }).success ? item : undefined;
}

export function updateActionCategory(id: string, input: { name: string; description?: string; active?: boolean } | string) {
  const current = getActionConfiguration();
  const existing = current.categories.find((item) => item.id === id);
  const values = typeof input === "string" ? { name: input, description: existing?.description, active: existing?.active } : input;
  const name = values.name.trim();
  if (!name || current.categories.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return false;
  return persist({ ...current, categories: current.categories.map((item) => item.id === id ? { ...item, name, description: values.description?.trim() || undefined, active: values.active ?? item.active, updatedAt: new Date().toISOString() } : item) }).success;
}

export function setActionCategoryActive(id: string, active: boolean) {
  const current = getActionConfiguration();
  return persist({ ...current, categories: current.categories.map((item) => item.id === id ? { ...item, active, updatedAt: new Date().toISOString() } : item) }).success;
}

export function moveActionCategory(id: string, direction: -1 | 1) {
  const current = getActionConfiguration();
  const ordered = [...current.categories].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((item) => item.id === id);
  const target = ordered[index + direction];
  if (index < 0 || !target) return true;
  const selected = ordered[index];
  return persist({ ...current, categories: current.categories.map((item) => item.id === selected.id ? { ...item, order: target.order, updatedAt: new Date().toISOString() } : item.id === target.id ? { ...item, order: selected.order, updatedAt: new Date().toISOString() } : item) }).success;
}

export function validateReminderConfiguration(value: ActionReminderConfiguration) {
  const errors: Record<string, string> = {};
  if (value.dueSoon.daysBeforeDue < 0) errors.dueSoon = "Days before due must be 0 or greater.";
  if (value.overdue.daysAfterDue < 0) errors.overdue = "Days after due must be 0 or greater.";
  if (value.repeatOverdue.repeatEveryDays < 1) errors.repeatOverdue = "Repeat interval must be at least 1 day.";
  return errors;
}

export function saveActionReminderConfiguration(reminders: ActionReminderConfiguration) {
  const errors = validateReminderConfiguration(reminders);
  if (Object.keys(errors).length) return { success: false as const, errors };
  const result = persist({ ...getActionConfiguration(), reminders });
  return result.success ? { success: true as const } : { success: false as const, errors: { save: result.message } };
}

export function validateEscalationRules(rules: readonly ActionEscalationRule[]) {
  const errors: Record<string, string> = {};
  const ordered = [...rules].sort((a, b) => a.level - b.level);
  if (ordered.some((item, index) => item.level !== index + 1)) errors.levels = "Escalation levels must remain sequential.";
  for (const item of ordered) {
    if (item.daysOverdue < 0) errors[`level${item.level}.daysOverdue`] = "Days overdue must be 0 or greater.";
    if (!item.recipientRole) errors[`level${item.level}.recipientRole`] = "Recipient role is required.";
  }
  if (ordered[1] && ordered[0] && ordered[1].daysOverdue <= ordered[0].daysOverdue) errors["level2.daysOverdue"] = "Level 2 must occur after Level 1.";
  if (ordered[1]?.enabled && !ordered[0]?.enabled) errors.levels = "Enable Level 1 before enabling Level 2.";
  return errors;
}

export function saveActionEscalationConfiguration(escalations: ActionEscalationRule[]) {
  const errors = validateEscalationRules(escalations);
  if (Object.keys(errors).length) return { success: false as const, errors };
  const result = persist({ ...getActionConfiguration(), escalations });
  return result.success ? { success: true as const } : { success: false as const, errors: { save: result.message } };
}

export function resetActionConfiguration() {
  return persist(cloneDefaults());
}
