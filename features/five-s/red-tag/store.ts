"use client";

import { useSyncExternalStore } from "react";
import type { DemoUser } from "@/lib/current-user";
import type { MyAction, MyActionStatus } from "@/features/five-s/types/my-actions";
import type { RedTag, RedTagDisposition, RedTagEvidence, RedTagHistoryEvent } from "./types";
import { safeSetStorage, STORAGE_FULL_MESSAGE } from "@/lib/browser-storage";

export const RED_TAG_STORAGE_KEY = "five-s-red-tags-v1";
const DEMO_TAG: RedTag = {
  id: "RT-EGM-ZA-001", tagNumber: "RT-EGM-ZA-001", plant: "Egmore Plant", zone: "Zone A",
  section: "Production", itemName: "Hydraulic Press 04", quantity: 1, reason: "Unclean Area",
  remarks: "Oil residue and unwanted material found around the machine base.",
  requiredAction: "Clean the machine area, remove unwanted material and inspect for leakage.",
  responsiblePersonId: "USR-SIVA", responsiblePersonName: "Siva", targetDate: "2026-08-26", status: "Open",
  createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-08-25T10:30:00+05:30",
  imageUrl: "/demo-5s/not-good-example.png",
  history: [{ id: "RTH-001", type: "created", label: "Red Tag created", actor: "Lakshman", at: "2026-08-25T10:30:00+05:30" }],
};

let tags: RedTag[] = [DEMO_TAG];
const SERVER_TAGS: RedTag[] = [DEMO_TAG];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(RED_TAG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) tags = parsed.map((item) => normalizeRedTag(item as RedTag));
    }
  } catch { /* retain demo data */ }
}
function emit() {
  const result = safeSetStorage(RED_TAG_STORAGE_KEY, tags);
  if (!result.success) { window.alert(result.reason === "quota" ? STORAGE_FULL_MESSAGE : result.message); return; }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function snapshot() { load(); return tags; }
function serverSnapshot() { return SERVER_TAGS; }

export function useRedTags() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function getRedTags() { load(); return tags; }
export function getRedTag(id: string) { load(); return tags.find((item) => item.id === id); }

function normalizeRedTag(tag: RedTag): RedTag {
  const legacyStatus = (tag as { status: string }).status;
  return {
    ...tag,
    status: (legacyStatus === "Resolved" ? "Awaiting Verification" : legacyStatus) as RedTag["status"],
    afterEvidence: tag.afterEvidence ?? [],
    removalConfirmed: tag.removalConfirmed ?? false,
    history: tag.history ?? [],
  };
}

function history(type: RedTagHistoryEvent["type"], label: string, actor: Pick<DemoUser, "id" | "name">): RedTagHistoryEvent {
  return { id: `RTH-${crypto.randomUUID()}`, type, label, actor: actor.name, at: new Date().toISOString() };
}

function updateTag(id: string, updater: (tag: RedTag) => RedTag) {
  load();
  const current = tags.find((item) => item.id === id);
  if (!current) return undefined;
  const updated = updater(current);
  tags = tags.map((item) => item.id === id ? updated : item);
  emit();
  return updated;
}
export function getNextTagNumber(zoneCode = "ZA") {
  load();
  const prefix = `RT-EGM-${zoneCode}-`;
  const highest = tags.reduce((max, tag) => tag.tagNumber.startsWith(prefix) ? Math.max(max, Number(tag.tagNumber.slice(-3)) || 0) : max, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
export function createRedTag(input: Omit<RedTag, "id" | "tagNumber" | "status" | "createdAt" | "history">, user: DemoUser) {
  const zoneCode = input.zone.replace("Zone ", "Z").toUpperCase();
  const tagNumber = getNextTagNumber(zoneCode);
  const createdAt = new Date().toISOString();
  const tag: RedTag = { ...input, id: tagNumber, tagNumber, status: "Open", createdAt, history: [
    { id: `RTH-${crypto.randomUUID()}`, type: "created", label: "Red Tag created", actor: user.name, at: createdAt },
  ] };
  tags = [tag, ...tags]; emit(); return tag;
}
export function markTagPrinted(id: string, user: DemoUser) {
  load();
  const tag = tags.find((item) => item.id === id);
  if (!tag || tag.history.some((event) => event.type === "printed")) return;
  tags = tags.map((item) => item.id === id ? { ...item, history: [...item.history, {
    id: `RTH-${crypto.randomUUID()}`, type: "printed" as const, label: "Tag printed", actor: user.name, at: new Date().toISOString(),
  }] } : item); emit();
}

export function linkRedTagAction(id: string, actionId: string, actor: DemoUser) {
  const current = getRedTag(id);
  if (!current || current.actionId) return undefined;
  return updateTag(id, (tag) => ({
    ...tag,
    actionId,
    syncedActionStatus: "Assigned",
    history: [...tag.history, history("action_created", `Action ${actionId} created`, actor)],
  }));
}

function isActiveActionStatus(status: MyActionStatus) {
  return ["In Progress", "Overdue", "Pending Review", "Pending Auditor Review", "Awaiting Review", "Rework Required"].includes(status);
}

export function reconcileRedTagActions(actions: MyAction[]) {
  load();
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  let changed = false;
  const system = { id: "SYSTEM", name: "OPS" } as DemoUser;
  tags = tags.map((tag) => {
    const action = tag.actionId ? actionMap.get(tag.actionId) : undefined;
    if (!action || action.status === tag.syncedActionStatus || tag.status === "Closed") return tag;
    changed = true;
    if (action.status === "Completed") return {
      ...tag,
      status: "Awaiting Verification" as const,
      syncedActionStatus: action.status,
      history: [...tag.history, history("awaiting_verification", "Action completed; awaiting physical verification", system)],
    };
    if (isActiveActionStatus(action.status)) return {
      ...tag,
      status: "In Progress" as const,
      syncedActionStatus: action.status,
      history: [...tag.history, history("started", action.status === "Rework Required" ? "Corrective Action returned for rework" : "Corrective Action in progress", system)],
    };
    return { ...tag, syncedActionStatus: action.status };
  });
  if (changed) emit();
  return changed;
}

export function addRedTagAfterEvidence(id: string, evidence: RedTagEvidence[], actor: DemoUser) {
  if (!evidence.length) return undefined;
  return updateTag(id, (tag) => ({
    ...tag,
    afterEvidence: [...(tag.afterEvidence ?? []), ...evidence],
    history: [...tag.history, history("started", `${evidence.length} after-evidence photo${evidence.length === 1 ? "" : "s"} added`, actor)],
  }));
}

export interface VerifyRedTagInput {
  disposition: RedTagDisposition;
  dispositionNote?: string;
  verificationRemark: string;
}

export function verifyRedTag(id: string, action: MyAction | undefined, input: VerifyRedTagInput, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || tag.status !== "Awaiting Verification" || !tag.actionId || action?.id !== tag.actionId || action.status !== "Completed") return undefined;
  if (!(tag.afterEvidence?.length) || !input.disposition || !input.verificationRemark.trim()) return undefined;
  if (input.disposition === "Other" && !input.dispositionNote?.trim()) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    disposition: input.disposition,
    dispositionNote: input.dispositionNote?.trim() || undefined,
    verificationRemark: input.verificationRemark.trim(),
    verifiedByUserId: actor.id,
    verifiedByName: actor.name,
    verifiedAt: now,
    history: [...current.history, history("verified", "Physical condition and disposition verified", actor)],
  }));
}

export function closeRedTagAfterRemoval(id: string, action: MyAction | undefined, removalConfirmed: boolean, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || tag.status !== "Awaiting Verification" || !tag.actionId || action?.id !== tag.actionId || action.status !== "Completed") return undefined;
  if (!tag.verifiedAt || !tag.verificationRemark || !tag.disposition || !(tag.afterEvidence?.length) || !removalConfirmed) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Closed",
    removalConfirmed: true,
    removedByUserId: actor.id,
    removedByName: actor.name,
    removedAt: now,
    closedAt: now,
    history: [...current.history, history("removed", "Physical Red Tag removal confirmed", actor), history("closed", "Red Tag closed", actor)],
  }));
}
