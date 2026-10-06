"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import { validateKpiDefinition, type VisualManagementKpiDefinition } from "./kpi-configuration";

const STORAGE_KEY = "ops-visual-management-kpis-v1";
const EMPTY: VisualManagementKpiDefinition[] = [];
const SEED_STAMP = "2026-10-01T08:00:00+05:30";
const completeSmart = { specific: { status: "complete" as const, explanation: "Configured for daily management." }, measurable: { status: "complete" as const, explanation: "Target and threshold configured." }, achievable: { status: "complete" as const, explanation: "Confirmed by board owner." }, relevant: { status: "complete" as const, explanation: "Used by the operating team." }, timely: { status: "complete" as const, explanation: "Reviewed daily." } };
export const DAILY_MANAGEMENT_DEMO_METRICS: VisualManagementKpiDefinition[] = [
  ["VMK-DM-SAFETY", "No. of Accidents", "safety", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-NEAR-MISS", "Near Misses", "safety", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-FIRST-AID", "First Aid Cases", "safety", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-UNSAFE-CONDITION", "Unsafe Conditions", "safety", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-UNSAFE-ACT", "Unsafe Acts", "safety", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-FPY", "First Pass Yield", "quality", "percentage", "higher_is_better", 98, 95, "numeric", "%"],
  ["VMK-DM-COMPLAINTS", "Customer Complaints", "quality", "count", "lower_is_better", 0, 1, "numeric", "count"],
  ["VMK-DM-REJECTION", "Rejection Rate", "quality", "percentage", "lower_is_better", 2, 3, "numeric", "%"],
  ["VMK-DM-DEFECT", "Defect Rate", "quality", "percentage", "lower_is_better", 2.5, 3, "numeric", "%"],
  ["VMK-DM-SCRAP", "Scrap Cost", "cost", "number", "lower_is_better", 15000, 20000, "numeric", "₹"],
  ["VMK-DM-PRODUCTION", "Production Attainment", "delivery", "number", "higher_is_better", 340, 320, "numeric", "units/shift"],
  ["VMK-DM-OTD", "On-Time Delivery", "delivery", "percentage", "higher_is_better", 98, 95, "numeric", "%"],
  ["VMK-DM-ATTENDANCE", "Attendance", "people", "percentage", "higher_is_better", 95, 90, "numeric", "%"],
  ["VMK-DM-ABSENTEEISM", "Absenteeism", "people", "percentage", "lower_is_better", 5, 8, "numeric", "%"],
  ["VMK-DM-ENV", "Environmental Incidents", "environment", "count", "lower_is_better", 0, 1, "event", "count"],
  ["VMK-DM-SUGGESTIONS", "Improvement Suggestions", "morale", "count", "higher_is_better", 5, 3, "numeric", "count"],
  ["VMK-DM-5S", "5S Score", "5s", "number", "higher_is_better", 90, 80, "numeric", "score"],
].map(([id, name, bucket, measurementType, direction, target, amberBoundary, simpleMetricType, unit]) => ({ id: String(id), level: "unit", name: String(name), originalObjective: String(name), smartObjective: String(name), smartAnalysis: completeSmart, bucket: bucket as VisualManagementKpiDefinition["bucket"], indicatorType: "lagging", measurementType: measurementType as VisualManagementKpiDefinition["measurementType"], direction: direction as VisualManagementKpiDefinition["direction"], baseline: Number(target), target: Number(target), targetDate: "2026-12-31", performanceThreshold: { direction: direction as "higher_is_better" | "lower_is_better", amberBoundary: Number(amberBoundary) }, ownerUserId: "USR-LAKSHMAN", reviewFrequency: "daily", status: "active", simpleMetricType: simpleMetricType as "numeric" | "event", unit: String(unit), eventCategories: simpleMetricType === "event" ? ["Near Miss", "First Aid", "Accident", "Unsafe Condition", "Unsafe Act"] : undefined, aggregation: simpleMetricType === "event" ? "sum" : "average", createdAt: SEED_STAMP, updatedAt: SEED_STAMP }));
let records: VisualManagementKpiDefinition[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() { if (loaded || typeof window === "undefined") return; loaded = true; try { const stored = window.localStorage.getItem(STORAGE_KEY); const parsed = JSON.parse(stored ?? "null"); if (Array.isArray(parsed)) { const names = new Set(parsed.map((item) => typeof item?.name === "string" ? item.name.toLowerCase() : "")); records = [...parsed, ...DAILY_MANAGEMENT_DEMO_METRICS.filter((seed) => !parsed.some((item) => item?.id === seed.id) && !names.has(seed.name.toLowerCase()))]; } else records = stored === null ? DAILY_MANAGEMENT_DEMO_METRICS : EMPTY; } catch { records = EMPTY; } }
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
export function saveSimpleVisualManagementMetric(input: { id?: string; name: string; category: VisualManagementKpiDefinition["bucket"]; metricType: "numeric" | "event"; measurementType: VisualManagementKpiDefinition["measurementType"]; target: number; unit?: string; direction: VisualManagementKpiDefinition["direction"]; amberBoundary: number; reviewFrequency: NonNullable<VisualManagementKpiDefinition["reviewFrequency"]>; ownerUserId?: string; eventCategories?: string[] }) {
  const now = new Date().toISOString();
  const threshold = input.direction === "target_exactly"
    ? { direction: "target_exactly" as const, amberLowerBound: Math.min(input.amberBoundary, input.target - 1), amberUpperBound: Math.max(input.amberBoundary, input.target + 1) }
    : { direction: input.direction, amberBoundary: input.amberBoundary };
  return saveVisualManagementKpi({ id: input.id, level: "unit", name: input.name.trim(), originalObjective: input.name.trim(), smartObjective: input.name.trim(), smartAnalysis: { specific: { status: "complete", explanation: "Configured for this board." }, measurable: { status: "complete", explanation: "Target and threshold configured." }, achievable: { status: "complete", explanation: "Confirmed by board owner." }, relevant: { status: "complete", explanation: "Used in daily management." }, timely: { status: "complete", explanation: `${input.reviewFrequency} review.` } }, bucket: input.category, indicatorType: "lagging", measurementType: input.metricType === "event" ? "count" : input.measurementType, direction: input.direction, baseline: input.target, target: input.target, targetDate: now.slice(0, 10), performanceThreshold: threshold, ownerUserId: input.ownerUserId, reviewFrequency: input.reviewFrequency, status: "active", simpleMetricType: input.metricType, unit: input.unit?.trim() || undefined, eventCategories: input.metricType === "event" ? input.eventCategories?.filter(Boolean) : undefined, aggregation: input.metricType === "event" ? "sum" : "average" });
}
export function saveReusableVisualManagementMetric(input: { id?: string; name: string; category: VisualManagementKpiDefinition["bucket"]; metricType: "numeric" | "event"; measurementType: VisualManagementKpiDefinition["measurementType"]; unit: string; direction: VisualManagementKpiDefinition["direction"] }) { const target = 0; const performanceThreshold = input.direction === "higher_is_better" ? { direction: "higher_is_better" as const, amberBoundary: -1 } : input.direction === "lower_is_better" ? { direction: "lower_is_better" as const, amberBoundary: 1 } : { direction: "target_exactly" as const, amberLowerBound: -1, amberUpperBound: 1 }; const now = new Date().toISOString(); return saveVisualManagementKpi({ id: input.id, level: "unit", name: input.name.trim(), originalObjective: input.name.trim(), smartObjective: input.name.trim(), smartAnalysis: completeSmart, bucket: input.category, indicatorType: "lagging", measurementType: input.metricType === "event" ? "count" : input.measurementType, direction: input.direction, baseline: 0, target, targetDate: now.slice(0, 10), performanceThreshold, reviewFrequency: "daily", status: "active", simpleMetricType: input.metricType, unit: input.unit.trim(), eventCategories: undefined, aggregation: input.metricType === "event" ? "sum" : "average" }); }
export function setVisualManagementKpisForTests(next: VisualManagementKpiDefinition[]) { records = next; loaded = true; }
