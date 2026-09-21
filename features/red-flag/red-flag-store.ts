"use client";

import { useSyncExternalStore } from "react";

import type { MyAction, MyActionStatus } from "@/features/five-s/types/my-actions";
import { safeSetStorage, safeSetStorageString } from "@/lib/browser-storage";
import type { CreateRedFlagInput, RedFlag, RedFlagActor, RedFlagActivity, RedFlagActivityType, RedFlagEvidence, RedFlagEvidenceGroup, RedFlagSeverity } from "./types";

const STORAGE_KEY = "ops-red-flags-v1";
const FIXTURE_VERSION_KEY = "ops-red-flags-fixture-version";
const FIXTURE_VERSION = "red-flag-workflow-v1";

const SEED_FLAGS: RedFlag[] = [
  seed({ id: "RF-2026-014", title: "Hydraulic line leaking beside press", description: "Oil is collecting beside Press 04 and has entered the marked operator walkway.", plant: "Egmore Plant", zone: "Zone B", location: "Press 04", machineAsset: "HYD-PRS-04", severity: "Critical", status: "Open", raisedById: "USR-RUMESH", raisedByName: "Rumesh", raisedAt: "2026-09-14T08:20:00+05:30", immediateActionTaken: true, containmentNote: "Press isolated and absorbent pads placed around the leak.", evidence: [photo("RF-EV-014-01", "Initial oil leak", "/demo-5s/not-good-example.png", "initial", "Leak and affected walkway before maintenance isolation", "Rumesh", "2026-09-14T08:20:00+05:30")] }),
  seed({ id: "RF-2026-013", title: "Emergency walkway partially obstructed", description: "Empty component bins are reducing the clear width of the emergency walkway.", plant: "Egmore Plant", zone: "Zone A", location: "Assembly Cell 2", severity: "High", status: "In Progress", raisedById: "USR-LAKSHMAN", raisedByName: "Lakshman", raisedAt: "2026-09-13T11:05:00+05:30", immediateActionTaken: true, containmentNote: "Bins moved outside the yellow line pending rack relocation.", actionId: "ACT-RF-013", syncedActionStatus: "In Progress", evidence: [photo("RF-EV-013-01", "Blocked walkway", "/demo-5s/not-good-example.png", "initial", "Bins extending over the marked line", "Lakshman", "2026-09-13T11:05:00+05:30")] }),
  seed({ id: "RF-2026-012", title: "Unlabelled chemical refill bottle", description: "A refill bottle beside CNC-03 has no contents or hazard identification.", plant: "Egmore Plant", zone: "Zone C", location: "CNC-03", machineAsset: "CNC-03", severity: "Medium", status: "Open", raisedById: "USR-MANOJ-GURU", raisedByName: "Manoj Guru", raisedAt: "2026-09-12T15:40:00+05:30", immediateActionTaken: true, containmentNote: "Bottle quarantined in the maintenance cabinet.", evidence: [] }),
  seed({ id: "RF-2026-010", title: "Damaged guard at packing conveyor", description: "The lower conveyor guard was loose and could expose the drive assembly.", plant: "Egmore Plant", zone: "Zone B", location: "Packing Conveyor", machineAsset: "CNV-PACK-02", severity: "High", status: "Awaiting Closure", raisedById: "USR-RUMESH", raisedByName: "Rumesh", raisedAt: "2026-09-09T09:15:00+05:30", immediateActionTaken: true, containmentNote: "Conveyor stopped and locked out until the guard was secured.", actionId: "ACT-RF-010", syncedActionStatus: "Completed", evidence: [photo("RF-EV-010-01", "Loose conveyor guard", "/demo-5s/not-good-example.png", "initial", "Guard condition when issue was raised", "Rumesh", "2026-09-09T09:15:00+05:30")] }),
  seed({ id: "RF-2026-008", title: "Water ingress near electrical panel", description: "Rainwater was entering through the service duct above Panel DB-7.", plant: "Egmore Plant", zone: "Zone D", location: "Utility Corridor", machineAsset: "DB-7", severity: "Critical", status: "Closed", raisedById: "USR-LAKSHMAN", raisedByName: "Lakshman", raisedAt: "2026-09-02T07:35:00+05:30", immediateActionTaken: true, containmentNote: "Area barricaded and power isolated by electrical maintenance.", actionId: "ACT-RF-008", syncedActionStatus: "Completed", closedAt: "2026-09-03T16:10:00+05:30", closedById: "USR-LAKSHMAN", closedByName: "Lakshman", closureRemark: "Service duct sealed, panel inspected, and area remained dry after a controlled water test.", evidence: [photo("RF-EV-008-01", "Water near DB-7", "/demo-5s/not-good-example.png", "initial", "Water path before isolation", "Lakshman", "2026-09-02T07:35:00+05:30"), photo("RF-EV-008-02", "Sealed service duct", "/demo-5s/good-example.png", "closure", "Sealed penetration after verification", "Lakshman", "2026-09-03T16:05:00+05:30")] }),
  seed({ id: "RF-2026-006", title: "Recurring hydraulic seepage at Press 02", description: "A small oil seep has returned at the hose coupling replaced last month.", plant: "Egmore Plant", zone: "Zone B", location: "Press 02", machineAsset: "HYD-PRS-02", severity: "Medium", status: "Closed", raisedById: "USR-SIVA-KUMAR", raisedByName: "Siva Kumar", raisedAt: "2026-08-28T10:10:00+05:30", immediateActionTaken: true, containmentNote: "Drip tray fitted until coupling replacement.", closedAt: "2026-08-29T14:20:00+05:30", closedById: "USR-LAKSHMAN", closedByName: "Lakshman", closureRemark: "Coupling replaced and leak check passed.", evidence: [] }),
  seed({ id: "RF-2026-003", title: "Hydraulic oil residue below Press 01", description: "Oil residue found below the pressure hose connection during shift handover.", plant: "Egmore Plant", zone: "Zone A", location: "Press 01", machineAsset: "HYD-PRS-01", severity: "Low", status: "Closed", raisedById: "USR-RITIKA", raisedByName: "Ritika", raisedAt: "2026-08-17T06:50:00+05:30", immediateActionTaken: true, containmentNote: "Residue cleaned and connection tagged for inspection.", closedAt: "2026-08-18T12:00:00+05:30", closedById: "USR-LAKSHMAN", closedByName: "Lakshman", closureRemark: "Connection tightened and monitored for one shift with no further seepage.", evidence: [] }),
];

export const RED_FLAG_SEED_FLAGS = SEED_FLAGS;
let flags = SEED_FLAGS;
let loaded = false;
const listeners = new Set<() => void>();

function photo(id: string, name: string, url: string, group: RedFlagEvidenceGroup, note: string, uploadedBy: string, uploadedAt: string): RedFlagEvidence {
  return { id, name, url, group, note, uploadedBy, uploadedAt, mimeType: "image/png" };
}

function seed(input: Omit<RedFlag, "slaDueAt" | "updatedAt" | "activity">): RedFlag {
  const activity: RedFlagActivity[] = [{ id: `${input.id}-RAISED`, type: "raised", label: "Red Flag raised", actorId: input.raisedById, actorName: input.raisedByName, at: input.raisedAt }];
  if (input.evidence.length) activity.push({ id: `${input.id}-EVIDENCE`, type: "evidence_added", label: `${input.evidence.length} initial evidence photo${input.evidence.length === 1 ? "" : "s"} added`, actorId: input.raisedById, actorName: input.raisedByName, at: input.raisedAt });
  if (input.immediateActionTaken && input.containmentNote) activity.push({ id: `${input.id}-CONTAINED`, type: "containment_recorded", label: "Immediate containment recorded", actorId: input.raisedById, actorName: input.raisedByName, at: input.raisedAt, remark: input.containmentNote });
  if (input.actionId) {
    activity.push({ id: `${input.id}-ACTION`, type: "action_created", label: `Action ${input.actionId} created`, actorId: input.raisedById, actorName: input.raisedByName, at: input.raisedAt, actionId: input.actionId });
    if (input.syncedActionStatus === "In Progress") activity.push({ id: `${input.id}-ACTION-STARTED`, type: "action_started", label: "Work started on linked action", actorId: "SYSTEM", actorName: "OPS", at: input.raisedAt, actionId: input.actionId });
    if (input.syncedActionStatus === "Completed") {
      const actionClosedAt = input.closedAt ?? (input.status === "Awaiting Closure" ? "2026-09-10T15:30:00+05:30" : input.raisedAt);
      activity.push({ id: `${input.id}-ACTION-SUBMITTED`, type: "action_submitted", label: "Linked action submitted for review", actorId: "SYSTEM", actorName: "OPS", at: actionClosedAt, actionId: input.actionId });
      activity.push({ id: `${input.id}-ACTION-CLOSED`, type: "action_closed", label: "Linked action closed", actorId: "SYSTEM", actorName: "OPS", at: actionClosedAt, actionId: input.actionId });
    }
  }
  if (input.status === "Awaiting Closure") activity.push({ id: `${input.id}-AWAITING`, type: "awaiting_closure", label: "Moved to Awaiting Closure", actorId: "SYSTEM", actorName: "OPS", at: "2026-09-10T15:30:00+05:30", actionId: input.actionId });
  if (input.closedAt) activity.push({ id: `${input.id}-CLOSED`, type: "closed", label: "Red Flag closed", actorId: input.closedById ?? "SYSTEM", actorName: input.closedByName ?? "OPS", at: input.closedAt, remark: input.closureRemark });
  return { ...input, slaDueAt: getRedFlagSlaDueAt(input.severity, input.raisedAt), updatedAt: input.closedAt ?? input.raisedAt, activity };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) { persist(SEED_FLAGS); return; }
    const parsed = JSON.parse(stored) as RedFlag[];
    if (Array.isArray(parsed)) {
      if (window.localStorage.getItem(FIXTURE_VERSION_KEY) !== FIXTURE_VERSION) {
        const storedIds = new Set(parsed.map((item) => item.id));
        flags = [...SEED_FLAGS.filter((item) => !storedIds.has(item.id)), ...parsed];
        safeSetStorageString(FIXTURE_VERSION_KEY, FIXTURE_VERSION);
        save();
      } else flags = parsed;
    }
  } catch { flags = SEED_FLAGS; }
}

function save() { return safeSetStorage(STORAGE_KEY, flags); }
function persist(next: RedFlag[]) {
  const previous = flags;
  flags = next;
  const result = save();
  if (!result.success) { flags = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function snapshot() { load(); return flags; }
function serverSnapshot() { return SEED_FLAGS; }

export function useRedFlagStore() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function getRedFlags() { load(); return flags; }
export function getRedFlag(id: string) { load(); return flags.find((flag) => flag.id === id); }

export function getRedFlagSlaHours(severity: RedFlagSeverity) {
  return { Critical: 8, High: 24, Medium: 72, Low: 168 }[severity];
}

export function getRedFlagSlaDueAt(severity: RedFlagSeverity, raisedAt: string) {
  return new Date(new Date(raisedAt).getTime() + getRedFlagSlaHours(severity) * 3_600_000).toISOString();
}

export function redFlagAgeHours(flag: Pick<RedFlag, "raisedAt" | "closedAt">, now = new Date()) {
  return Math.max(0, Math.floor(((flag.closedAt ? new Date(flag.closedAt) : now).getTime() - new Date(flag.raisedAt).getTime()) / 3_600_000));
}

export function redFlagAgeLabel(flag: Pick<RedFlag, "raisedAt" | "closedAt">, now = new Date()) {
  const hours = redFlagAgeHours(flag, now);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function isRedFlagOverdue(flag: Pick<RedFlag, "status" | "slaDueAt">, now = new Date()) {
  return flag.status !== "Closed" && flag.status !== "Cancelled" && new Date(flag.slaDueAt).getTime() < now.getTime();
}

export function getRedFlagSlaLabel(flag: Pick<RedFlag, "status" | "slaDueAt">, now = new Date()) {
  if (flag.status === "Closed") return "Resolved";
  const hours = Math.round(Math.abs(new Date(flag.slaDueAt).getTime() - now.getTime()) / 3_600_000);
  return isRedFlagOverdue(flag, now) ? `${hours}h past response target` : `${hours}h to response target`;
}

function nextId(now = new Date()) {
  const prefix = `RF-${now.getFullYear()}-`;
  const value = flags.reduce((max, flag) => flag.id.startsWith(prefix) ? Math.max(max, Number(flag.id.slice(prefix.length)) || 0) : max, 0) + 1;
  return `${prefix}${String(value).padStart(3, "0")}`;
}

function event(type: RedFlagActivityType, label: string, actor: RedFlagActor, remark?: string, actionId?: string): RedFlagActivity {
  return { id: `RF-ACTIVITY-${crypto.randomUUID()}`, type, label, actorId: actor.id, actorName: actor.name, at: new Date().toISOString(), remark, actionId };
}

export function createRedFlag(input: CreateRedFlagInput, actor: RedFlagActor) {
  load();
  const now = new Date().toISOString();
  const id = nextId();
  const activity = [event("raised", "Red Flag raised", actor)];
  if (input.evidence.length) activity.push(event("evidence_added", `${input.evidence.length} initial evidence photo${input.evidence.length === 1 ? "" : "s"} added`, actor));
  if (input.immediateActionTaken && input.containmentNote?.trim()) activity.push(event("containment_recorded", "Immediate containment recorded", actor, input.containmentNote.trim()));
  const flag: RedFlag = { ...input, id, title: input.title.trim(), description: input.description.trim(), location: input.location.trim(), machineAsset: input.machineAsset?.trim(), containmentNote: input.containmentNote?.trim(), status: "Open", raisedById: actor.id, raisedByName: actor.name, raisedAt: now, updatedAt: now, slaDueAt: getRedFlagSlaDueAt(input.severity, now), evidence: input.evidence.map((item) => ({ ...item, group: "initial" })), activity };
  return persist([flag, ...flags]) ? flag : null;
}

function updateFlag(id: string, updater: (flag: RedFlag) => RedFlag) {
  load();
  const current = flags.find((flag) => flag.id === id);
  if (!current) return null;
  const updated = updater(current);
  return persist(flags.map((flag) => flag.id === id ? updated : flag)) ? updated : null;
}

export function linkRedFlagAction(id: string, actionId: string, actor: RedFlagActor) {
  return updateFlag(id, (flag) => ({ ...flag, actionId, status: "Action Created", syncedActionStatus: "Assigned", reopenedAfterActionClosure: false, updatedAt: new Date().toISOString(), activity: [...flag.activity, event("action_created", `Action ${actionId} created`, actor, undefined, actionId)] }));
}

export function addRedFlagEvidence(id: string, items: RedFlagEvidence[], group: RedFlagEvidenceGroup, actor: RedFlagActor) {
  return updateFlag(id, (flag) => ({ ...flag, updatedAt: new Date().toISOString(), evidence: [...flag.evidence, ...items.map((item) => ({ ...item, group }))], activity: [...flag.activity, event("evidence_added", `${items.length} ${group} evidence photo${items.length === 1 ? "" : "s"} added`, actor)] }));
}

export function closeRedFlag(id: string, remark: string, actor: RedFlagActor) {
  if (!remark.trim()) return null;
  return updateFlag(id, (flag) => {
    if (flag.actionId && flag.status !== "Awaiting Closure") return flag;
    const now = new Date().toISOString();
    return { ...flag, status: "Closed", closureRemark: remark.trim(), closedAt: now, closedById: actor.id, closedByName: actor.name, updatedAt: now, reopenedAfterActionClosure: false, activity: [...flag.activity, event("closed", "Red Flag closed after verification", actor, remark.trim(), flag.actionId)] };
  });
}

export function reopenRedFlag(id: string, remark: string, actor: RedFlagActor) {
  if (!remark.trim()) return null;
  return updateFlag(id, (flag) => {
    const now = new Date().toISOString();
    return { ...flag, status: flag.actionId ? "In Progress" : "Open", closedAt: undefined, closedById: undefined, closedByName: undefined, closureRemark: undefined, reopenedAfterActionClosure: flag.syncedActionStatus === "Completed", updatedAt: now, activity: [...flag.activity, event("reopened", "Red Flag reopened / sent back", actor, remark.trim(), flag.actionId)] };
  });
}

function actionStatusEvent(status: MyActionStatus) {
  if (status === "Completed") return { type: "action_closed" as const, label: "Linked action closed" };
  if (["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(status)) return { type: "action_submitted" as const, label: "Linked action submitted for review" };
  if (["In Progress", "Overdue", "Rework Required"].includes(status)) return { type: "action_started" as const, label: status === "Rework Required" ? "Linked action returned for rework" : "Work started on linked action" };
  return null;
}

export function reconcileRedFlagActions(actions: MyAction[]) {
  load();
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  let changed = false;
  const next = flags.map((flag) => {
    const action = flag.actionId ? actionMap.get(flag.actionId) : undefined;
    if (!action || action.status === flag.syncedActionStatus) return flag;
    changed = true;
    const now = new Date().toISOString();
    const system = { id: "SYSTEM", name: "OPS" };
    const statusEvent = actionStatusEvent(action.status);
    const activity = statusEvent ? [...flag.activity, event(statusEvent.type, statusEvent.label, system, undefined, action.id)] : flag.activity;
    let status = flag.status;
    let reopenedAfterActionClosure = flag.reopenedAfterActionClosure;
    if (action.status === "Completed" && status !== "Closed" && !reopenedAfterActionClosure) {
      status = "Awaiting Closure";
      activity.push(event("awaiting_closure", "Moved to Awaiting Closure", system, "Action completed; issue verification is still required.", action.id));
    } else if (action.status !== "Completed" && status !== "Closed") {
      reopenedAfterActionClosure = false;
      status = ["In Progress", "Overdue", "Rework Required", "Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status) ? "In Progress" : "Action Created";
    }
    return { ...flag, status, reopenedAfterActionClosure, syncedActionStatus: action.status, updatedAt: now, activity };
  });
  if (changed) persist(next);
  return changed;
}

export function getRedFlagSummary(input = flags, now = new Date()) {
  const open = input.filter((flag) => !["Closed", "Cancelled"].includes(flag.status));
  const critical = open.filter((flag) => flag.severity === "Critical");
  const overdue = open.filter((flag) => isRedFlagOverdue(flag, now));
  const closedThisMonth = input.filter((flag) => flag.closedAt && new Date(flag.closedAt).getFullYear() === now.getFullYear() && new Date(flag.closedAt).getMonth() === now.getMonth());
  const closed = input.filter((flag) => flag.closedAt);
  const averageResolutionHours = closed.length ? Math.round(closed.reduce((sum, flag) => sum + redFlagAgeHours(flag, now), 0) / closed.length) : 0;
  return { open, critical, overdue, closedThisMonth, averageResolutionHours };
}

export function resetRedFlags() { persist(SEED_FLAGS); }
