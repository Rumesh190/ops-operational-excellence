"use client";

import { useSyncExternalStore } from "react";
import type { DemoUser } from "@/lib/current-user";
import type { MyAction, MyActionStatus } from "@/features/five-s/types/my-actions";
import { RED_TAG_CATEGORIES, RED_TAG_DECISIONS, type RedTag, type RedTagDecision, type RedTagDisposition, type RedTagEvidence, type RedTagHistoryEvent, type RedTagStatus } from "./types";
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
function persist(next: RedTag[]) {
  const result = safeSetStorage(RED_TAG_STORAGE_KEY, next);
  if (!result.success) {
    if (typeof window !== "undefined") window.alert(result.reason === "quota" ? STORAGE_FULL_MESSAGE : result.message);
    return false;
  }
  tags = next;
  listeners.forEach((listener) => listener());
  return true;
}
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function snapshot() { load(); return tags; }
function serverSnapshot() { return SERVER_TAGS; }

export function useRedTags() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function getRedTags() { load(); return tags; }
export function getRedTag(id: string) { load(); return tags.find((item) => item.id === id); }

export function normalizeRedTagStatus(status: string, tag?: Partial<RedTag>): RedTagStatus {
  if (status === "Resolved") return "Awaiting Verification";
  if (status === "In Progress") return tag?.decisionRecord ? "Disposition In Progress" : "Under Review";
  if (["Open", "Under Review", "Decision Made", "Disposition In Progress", "Awaiting Verification", "Closed"].includes(status)) return status as RedTagStatus;
  return "Open";
}

export function normalizeRedTag(tag: RedTag): RedTag {
  const legacyStatus = String((tag as { status?: string }).status ?? "Open");
  const afterEvidence = tag.afterEvidence?.length ? tag.afterEvidence : tag.dispositionDetails?.evidence?.length ? tag.dispositionDetails.evidence : tag.closure?.evidence ?? [];
  return {
    ...tag,
    status: normalizeRedTagStatus(legacyStatus, tag),
    afterEvidence,
    removalConfirmed: tag.removalConfirmed ?? false,
    history: tag.history ?? [],
    dispositionDetails: tag.dispositionDetails ? { ...tag.dispositionDetails, evidence: tag.dispositionDetails.evidence ?? [] } : undefined,
  };
}

function history(type: RedTagHistoryEvent["type"], label: string, actor: Pick<DemoUser, "id" | "name">, at = new Date().toISOString()): RedTagHistoryEvent {
  return { id: `RTH-${crypto.randomUUID()}`, type, label, actor: actor.name, actorId: actor.id, at };
}

function updateTag(id: string, updater: (tag: RedTag) => RedTag) {
  load();
  const current = tags.find((item) => item.id === id);
  if (!current) return undefined;
  const updated = updater(current);
  const next = tags.map((item) => item.id === id ? updated : item);
  return persist(next) ? updated : undefined;
}

export const RED_TAG_VALID_TRANSITIONS: Readonly<Record<RedTagStatus, readonly RedTagStatus[]>> = {
  Open: ["Under Review"],
  "Under Review": ["Decision Made"],
  "Decision Made": ["Disposition In Progress"],
  "Disposition In Progress": ["Awaiting Verification"],
  "Awaiting Verification": ["Closed"],
  Closed: [],
  "In Progress": [],
};

function canTransition(from: RedTagStatus, to: RedTagStatus) {
  return RED_TAG_VALID_TRANSITIONS[from].includes(to);
}
export function getNextTagNumber(zoneCode = "ZA") {
  load();
  const prefix = `RT-EGM-${zoneCode}-`;
  const highest = tags.reduce((max, tag) => tag.tagNumber.startsWith(prefix) ? Math.max(max, Number(tag.tagNumber.slice(-3)) || 0) : max, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
export function createRedTag<T extends Omit<RedTag, "id" | "tagNumber" | "status" | "createdAt" | "history">>(input: T, user: DemoUser): RedTag & T {
  const zoneCode = input.zone.replace("Zone ", "Z").toUpperCase();
  const tagNumber = getNextTagNumber(zoneCode);
  const createdAt = new Date().toISOString();
  const tag = { ...input, id: tagNumber, tagNumber, status: "Open" as const, createdAt, history: [
    { id: `RTH-${crypto.randomUUID()}`, type: "created", label: "Red Tag created", actor: user.name, at: createdAt },
  ] } as RedTag & T;
  if (!persist([tag, ...tags])) throw new Error("Unable to save this Red Tag. Please try again.");
  return tag;
}

export type CreateRedTagV2Input = Omit<RedTag, "id" | "tagNumber" | "status" | "createdAt" | "history" | "requiredAction" | "responsiblePersonId" | "responsiblePersonName" | "targetDate"> &
  Required<Pick<RedTag, "department" | "category" | "imageUrl">>;

/** Validates the physical-item fields required by the V2 create experience. */
export function createRedTagV2(input: CreateRedTagV2Input, user: DemoUser) {
  if (!input.itemName.trim() || !input.remarks.trim() || !input.section.trim() || !input.department.trim() || !input.imageUrl?.trim()) return undefined;
  if (!Number.isFinite(input.quantity) || input.quantity < 1 || !RED_TAG_CATEGORIES.includes(input.category)) return undefined;
  if (input.reason === "Others" && !input.customReason?.trim()) return undefined;
  if (input.estimatedValue !== undefined && (!Number.isFinite(input.estimatedValue) || input.estimatedValue < 0)) return undefined;
  return createRedTag(input, user);
}
export function markTagPrinted(id: string, user: DemoUser) {
  load();
  const tag = tags.find((item) => item.id === id);
  if (!tag || tag.history.some((event) => event.type === "printed")) return;
  const next = tags.map((item) => item.id === id ? { ...item, history: [...item.history, {
    id: `RTH-${crypto.randomUUID()}`, type: "printed" as const, label: "Tag printed", actor: user.name, at: new Date().toISOString(),
  }] } : item);
  persist(next);
}

export function linkRedTagAction(id: string, actionId: string, actor: DemoUser) {
  const current = getRedTag(id);
  if (!current || current.actionId || current.status === "Closed") return undefined;
  return updateTag(id, (tag) => ({
    ...tag,
    actionId,
    syncedActionStatus: "Assigned",
    history: [...tag.history, history("action_created", `Action ${actionId} created`, actor)],
  }));
}

export interface SubmitRedTagForReviewInput {
  reviewerId: string;
  reviewerName: string;
  comments?: string;
}

export function submitRedTagForReview(id: string, input: SubmitRedTagForReviewInput, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || !canTransition(tag.status, "Under Review") || !input.reviewerId || !input.reviewerName.trim()) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Under Review",
    review: { reviewerId: input.reviewerId, reviewerName: input.reviewerName.trim(), submittedAt: now, comments: input.comments?.trim() || undefined },
    history: [...current.history, history("review_submitted", `Submitted for review to ${input.reviewerName.trim()}`, actor, now)],
  }));
}

export interface RecordRedTagDecisionInput {
  decision: RedTagDecision;
  comments?: string;
}

export function recordRedTagDecision(id: string, input: RecordRedTagDecisionInput, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || !canTransition(tag.status, "Decision Made") || !tag.review || tag.review.reviewerId !== actor.id || !RED_TAG_DECISIONS.includes(input.decision)) return undefined;
  const now = new Date().toISOString();
  const comments = input.comments?.trim() || tag.review.comments;
  return updateTag(id, (current) => ({
    ...current,
    status: "Decision Made",
    review: { ...current.review!, reviewedAt: now, comments },
    decisionRecord: { type: input.decision, decidedAt: now, decidedByUserId: actor.id, decidedByName: actor.name, comments },
    history: [...current.history, history("reviewed", "Red Tag review completed", actor, now), history("decision_recorded", `Decision recorded: ${input.decision}`, actor, now)],
  }));
}

export interface StartRedTagDispositionInput {
  responsiblePersonId: string;
  responsiblePersonName: string;
  targetDate: string;
  executionNotes?: string;
  approval?: { approved: boolean; approvedAt: string; approvedByUserId: string; approvedByName: string; comment?: string };
}

export function startRedTagDisposition(id: string, input: StartRedTagDispositionInput, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || !canTransition(tag.status, "Disposition In Progress") || !tag.decisionRecord) return undefined;
  if (["keep", "further_evaluation"].includes(tag.decisionRecord.type)) return undefined;
  if (!input.responsiblePersonId || !input.responsiblePersonName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Disposition In Progress",
    dispositionDetails: {
      decision: current.decisionRecord!.type,
      responsiblePersonId: input.responsiblePersonId,
      responsiblePersonName: input.responsiblePersonName.trim(),
      targetDate: input.targetDate,
      startedAt: now,
      startedByUserId: actor.id,
      startedByName: actor.name,
      executionNotes: input.executionNotes?.trim() || undefined,
      evidence: [],
      approval: input.approval,
    },
    history: [...current.history, history("disposition_started", "Disposition started", actor, now)],
  }));
}

export interface CompleteRedTagDispositionInput {
  evidence: RedTagEvidence[];
  completionNotes?: string;
  responsibleConfirmed?: boolean;
}

export function completeRedTagDisposition(id: string, evidenceOrInput: RedTagEvidence[] | CompleteRedTagDispositionInput, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || !canTransition(tag.status, "Awaiting Verification") || !tag.decisionRecord || !tag.dispositionDetails) return undefined;
  if (["keep", "further_evaluation"].includes(tag.decisionRecord.type)) return undefined;
  if (tag.actionId && tag.syncedActionStatus !== "Completed") return undefined;
  const input = Array.isArray(evidenceOrInput) ? { evidence: evidenceOrInput } : evidenceOrInput;
  if (!input.evidence.length || !input.completionNotes?.trim() || input.responsibleConfirmed !== true) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Awaiting Verification",
    dispositionDetails: { ...current.dispositionDetails!, completedAt: now, completedByUserId: actor.id, completedByName: actor.name, completionNotes: input.completionNotes?.trim() || undefined, responsibleConfirmed: input.responsibleConfirmed, evidence: [...current.dispositionDetails!.evidence, ...input.evidence] },
    afterEvidence: [...(current.afterEvidence ?? []), ...input.evidence],
    history: [...current.history, history("disposition_completed", "Disposition completed; awaiting verification", actor, now), history("awaiting_verification", "Awaiting physical verification", actor, now)],
  }));
}

export interface VerifyRedTagDispositionInput {
  passed: boolean;
  details: string;
  evidence?: RedTagEvidence[];
}

export function verifyRedTagDisposition(id: string, input: VerifyRedTagDispositionInput, actor: DemoUser) {
  const tag = getRedTag(id);
  const readyForVerification = tag?.decisionRecord?.type === "keep" ? Boolean(tag.keepConfirmation) : Boolean(tag?.dispositionDetails?.completedAt);
  if (!tag || tag.status !== "Awaiting Verification" || !readyForVerification || !input.details.trim()) return undefined;
  const afterEvidence = [...(tag.afterEvidence ?? []), ...(input.evidence ?? [])];
  if (input.passed && (!tag.imageUrl?.trim() || !afterEvidence.length)) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    afterEvidence,
    closure: { verificationResult: input.passed ? "Passed" : "Failed", verificationDetails: input.details.trim(), verifiedAt: now, verifiedByUserId: actor.id, verifiedByName: actor.name, evidence: input.evidence ?? [] },
    history: [...current.history, history(input.passed ? "verified" : "verification_failed", input.passed ? "Disposition verified" : "Disposition verification failed", actor, now)],
  }));
}

export function confirmRedTagKeep(id: string, justification: string, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || tag.status !== "Decision Made" || tag.decisionRecord?.type !== "keep" || !justification.trim()) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Awaiting Verification",
    keepConfirmation: { justification: justification.trim(), confirmedAt: now, confirmedByUserId: actor.id, confirmedByName: actor.name },
    history: [...current.history, history("keep_confirmed", "Keep decision confirmed; awaiting verification", actor, now), history("awaiting_verification", "Awaiting Keep verification", actor, now)],
  }));
}

export function updateFurtherEvaluationDecision(id: string, decision: Exclude<RedTagDecision, "further_evaluation">, comments: string | undefined, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || tag.status !== "Decision Made" || tag.decisionRecord?.type !== "further_evaluation" || !RED_TAG_DECISIONS.includes(decision)) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    decisionRecord: { type: decision, decidedAt: now, decidedByUserId: actor.id, decidedByName: actor.name, comments: comments?.trim() || undefined },
    history: [...current.history, history("decision_updated", `Decision updated from Further Evaluation to ${decision}`, actor, now)],
  }));
}

export function closeRedTag(id: string, actor: DemoUser) {
  const tag = getRedTag(id);
  if (!tag || !canTransition(tag.status, "Closed") || tag.closure?.verificationResult !== "Passed" || !tag.imageUrl?.trim() || !(tag.afterEvidence?.length)) return undefined;
  const now = new Date().toISOString();
  return updateTag(id, (current) => ({
    ...current,
    status: "Closed",
    closedAt: now,
    closure: { ...current.closure!, closedAt: now, closedByUserId: actor.id, closedByName: actor.name },
    history: [...current.history, history("closed", "Red Tag closed", actor, now)],
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
  const next = tags.map((tag) => {
    const action = tag.actionId ? actionMap.get(tag.actionId) : undefined;
    if (!action || action.status === tag.syncedActionStatus || tag.status === "Closed") return tag;
    changed = true;
    // Legacy Action-driven tags did not have review/decision/disposition records. Keep
    // that compatibility path renderable without fabricating V2 lifecycle metadata.
    if (action.status === "Completed" && !tag.decisionRecord) return { ...tag, status: "Awaiting Verification" as const, syncedActionStatus: action.status, history: [...tag.history, history("awaiting_verification", "Linked Action completed; awaiting physical verification", system)] };
    if (isActiveActionStatus(action.status) && tag.status === "Open" && !tag.decisionRecord) return { ...tag, status: "In Progress" as const, syncedActionStatus: action.status, history: [...tag.history, history("started", action.status === "Rework Required" ? "Linked Action returned for rework" : "Linked Action in progress", system)] };
    return { ...tag, syncedActionStatus: action.status };
  });
  return changed ? persist(next) : false;
}

export function addRedTagAfterEvidence(id: string, evidence: RedTagEvidence[], actor: DemoUser) {
  if (!evidence.length) return undefined;
  const tag = getRedTag(id);
  if (!tag || tag.status === "Closed") return undefined;
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
  // Phase 3A keeps this client-specific verifier only for legacy records. V2
  // records must use verifyRedTagDisposition(), which enforces completed disposition.
  if (tag?.decisionRecord || tag?.dispositionDetails) return undefined;
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
  // Legacy compatibility only; V2 closure goes through closeRedTag().
  if (tag?.decisionRecord || tag?.dispositionDetails) return undefined;
  if (!tag || tag.status !== "Awaiting Verification" || !tag.actionId || action?.id !== tag.actionId || action.status !== "Completed") return undefined;
  if (!tag.imageUrl?.trim() || !tag.verifiedAt || !tag.verificationRemark || !tag.disposition || !(tag.afterEvidence?.length) || !removalConfirmed) return undefined;
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
