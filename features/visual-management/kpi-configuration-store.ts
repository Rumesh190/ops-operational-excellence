"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import { validateKpiDefinition, type VisualManagementKpiDefinition } from "./kpi-configuration";

const STORAGE_KEY = "ops-visual-management-kpis-v1";
const EMPTY: VisualManagementKpiDefinition[] = [];
let records: VisualManagementKpiDefinition[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() { if (loaded || typeof window === "undefined") return; loaded = true; try { const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"); records = Array.isArray(parsed) ? parsed : EMPTY; } catch { records = EMPTY; } }
function snapshot() { load(); return records; }
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function persist(next: VisualManagementKpiDefinition[]) { const previous = records; records = next; const result = typeof window === "undefined" ? { success: true } : safeSetStorage(STORAGE_KEY, records); if (!result.success) { records = previous; return false; } listeners.forEach((listener) => listener()); return true; }
function nextId(level: VisualManagementKpiDefinition["level"]) { const prefix = level === "unit" ? "VMK-U" : "VMK-F"; return `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now()}`; }

export function useVisualManagementKpis() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
export function getVisualManagementKpis() { return snapshot(); }
export function getVisualManagementKpi(id: string) { return snapshot().find((item) => item.id === id); }
export function saveVisualManagementKpi(input: Omit<VisualManagementKpiDefinition, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const current = snapshot(); const existing = input.id ? current.find((item) => item.id === input.id) : undefined; const now = new Date().toISOString();
  const record: VisualManagementKpiDefinition = { ...input, id: existing?.id ?? nextId(input.level), createdAt: existing?.createdAt ?? now, updatedAt: now };
  if (existing && existing.level !== record.level) return { success: false as const, errors: { level: "KPI level cannot be changed." } };
  if (existing?.level === "functional" && existing.parentKpiId !== record.parentKpiId) return { success: false as const, errors: { parentKpiId: "Parent KPI cannot be changed after creation." } };
  const errors = validateKpiDefinition(record, current); if (Object.keys(errors).length) return { success: false as const, errors };
  const next = existing ? current.map((item) => item.id === record.id ? record : item) : [...current, record];
  return persist(next) ? { success: true as const, record } : { success: false as const, errors: { save: "KPI configuration could not be saved." } };
}
export function archiveVisualManagementKpi(id: string) { const current = snapshot(); const item = current.find((record) => record.id === id); if (!item) return { success: false as const, error: "KPI not found." }; if (item.level === "unit" && current.some((record) => record.parentKpiId === id && record.status === "active")) return { success: false as const, error: "This Unit KPI has Functional KPIs connected." }; return persist(current.map((record) => record.id === id ? { ...record, status: "archived", updatedAt: new Date().toISOString() } : record)) ? { success: true as const } : { success: false as const, error: "KPI could not be archived." }; }
export function setVisualManagementKpisForTests(next: VisualManagementKpiDefinition[]) { records = next; loaded = true; }
