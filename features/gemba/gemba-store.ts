"use client";

import { useSyncExternalStore } from "react";

import { safeSetStorage } from "@/lib/browser-storage";
import type {
  GembaActor,
  GembaEvidence,
  GembaObservation,
  GembaObservationType,
  GembaParticipant,
  GembaState,
  GembaWalk,
} from "./types";

const STORAGE_KEY = "ops-gemba-v1";

const SEED_OBSERVATIONS: GembaObservation[] = [
  {
    id: "GEM-2026-014-OBS-01", gembaId: "GEM-2026-014", type: "Issue",
    title: "Material blocking emergency exit", description: "Two return-material pallets were inside the marked emergency-exit clearance area.",
    location: "Packing Area", peopleInvolved: ["Siva Kumar"],
    evidence: [{ id: "GEM-EV-014-01", name: "blocked-exit.jpg", url: "/demo-5s/not-good-example.png", mimeType: "image/jpeg", uploadedAt: "2026-09-12T10:18:00+05:30", uploadedBy: "Rumesh", note: "Exit route before correction" }],
    createdById: "USR-RUMESH", createdByName: "Rumesh", createdAt: "2026-09-12T10:18:00+05:30", updatedAt: "2026-09-12T10:24:00+05:30", actionId: "ACT-GEM-014-01",
  },
  {
    id: "GEM-2026-014-OBS-02", gembaId: "GEM-2026-014", type: "Positive",
    title: "Tools correctly stored and labelled", description: "The packing changeover tools were returned to clearly labelled shadow-board positions.",
    location: "Packing Area", peopleInvolved: ["Raj Kumar"],
    evidence: [{ id: "GEM-EV-014-02", name: "tool-board.jpg", url: "/demo-5s/good-example.png", mimeType: "image/jpeg", uploadedAt: "2026-09-12T10:26:00+05:30", uploadedBy: "Rumesh" }],
    createdById: "USR-RUMESH", createdByName: "Rumesh", createdAt: "2026-09-12T10:26:00+05:30", updatedAt: "2026-09-12T10:26:00+05:30",
  },
  {
    id: "GEM-2026-014-OBS-03", gembaId: "GEM-2026-014", type: "Opportunity",
    title: "Move label stock closer to point of use", description: "Operators walk to the far rack several times per batch to collect label rolls.",
    location: "Label Station", peopleInvolved: ["Suburamiani"], evidence: [],
    createdById: "USR-RUMESH", createdByName: "Rumesh", createdAt: "2026-09-12T10:34:00+05:30", updatedAt: "2026-09-12T10:40:00+05:30", actionId: "ACT-GEM-014-02",
  },
  {
    id: "GEM-2026-014-OBS-04", gembaId: "GEM-2026-014", type: "Issue",
    title: "Loose stretch-wrap corrected during walk", description: "Loose film created a trip risk beside the pallet wrapper and was removed immediately.",
    location: "Dispatch Lane", peopleInvolved: [], evidence: [], noActionReason: "No action required — corrected immediately.",
    createdById: "USR-RUMESH", createdByName: "Rumesh", createdAt: "2026-09-12T10:46:00+05:30", updatedAt: "2026-09-12T10:46:00+05:30",
  },
  {
    id: "GEM-2026-015-OBS-01", gembaId: "GEM-2026-015", type: "Positive",
    title: "First-piece check is clearly visible", description: "Operators can see the approved sample and acceptance points without leaving the workstation.",
    location: "Assembly Cell 2", peopleInvolved: ["Ritika"],
    evidence: [{ id: "GEM-EV-015-01", name: "first-piece-board.jpg", url: "/demo-5s/good-example.png", mimeType: "image/jpeg", uploadedAt: "2026-09-14T09:20:00+05:30", uploadedBy: "Lakshman" }],
    createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-09-14T09:20:00+05:30", updatedAt: "2026-09-14T09:20:00+05:30",
  },
  {
    id: "GEM-2026-015-OBS-02", gembaId: "GEM-2026-015", type: "Issue",
    title: "Coolant container missing identification", description: "A refill container beside CNC-03 has no contents or hazard label.",
    location: "CNC-03", peopleInvolved: ["James"], evidence: [],
    createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-09-14T09:31:00+05:30", updatedAt: "2026-09-14T09:31:00+05:30",
  },
  {
    id: "GEM-2026-011-OBS-01", gembaId: "GEM-2026-011", type: "Positive",
    title: "Cleaning station is maintained", description: "All cleaning equipment is present, labelled, and ready for use.",
    location: "Cleaning Point", peopleInvolved: ["Meena"], evidence: [],
    createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-09-04T14:12:00+05:30", updatedAt: "2026-09-04T14:12:00+05:30",
  },
  {
    id: "GEM-2026-011-OBS-02", gembaId: "GEM-2026-011", type: "Opportunity",
    title: "Add min-max markers to consumable rack", description: "Simple markers would make replenishment needs visible before stock runs out.",
    location: "Consumables Rack", peopleInvolved: ["Vijay"], evidence: [], noActionReason: "Team will trial visual markers during the next shift.",
    createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-09-04T14:28:00+05:30", updatedAt: "2026-09-04T14:28:00+05:30",
  },
];

const SEED_WALKS: GembaWalk[] = [
  {
    id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "USR-LAKSHMAN", leadName: "Lakshman",
    participants: [{ id: "USR-RITIKA", name: "Ritika", role: "Zone Member" }, { id: "USR-JAMES", name: "James", role: "Zone Member" }],
    purpose: "Observe material flow and first-piece quality controls", notes: "Morning shift walk", scheduledDate: "2026-09-14", status: "In Progress",
    createdAt: "2026-09-14T09:00:00+05:30", updatedAt: "2026-09-14T09:31:00+05:30", startedAt: "2026-09-14T09:10:00+05:30",
    observationIds: ["GEM-2026-015-OBS-01", "GEM-2026-015-OBS-02"], actionIds: [],
    activity: [
      { id: "GEM-ACT-015-01", type: "walk_started", label: "Walk started", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-14T09:10:00+05:30" },
      { id: "GEM-ACT-015-02", type: "observation_added", label: "Positive observation added", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-14T09:20:00+05:30", observationId: "GEM-2026-015-OBS-01" },
      { id: "GEM-ACT-015-03", type: "photo_uploaded", label: "Photo uploaded", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-14T09:20:00+05:30", observationId: "GEM-2026-015-OBS-01" },
      { id: "GEM-ACT-015-04", type: "observation_added", label: "Issue observation added", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-14T09:31:00+05:30", observationId: "GEM-2026-015-OBS-02" },
    ],
  },
  {
    id: "GEM-2026-016", plant: "Egmore Plant", zone: "Zone C", leadId: "USR-LAKSHMAN", leadName: "Lakshman",
    participants: [{ id: "USR-NASAR", name: "Nasar", role: "Zone Member" }], purpose: "Observe end-of-shift machine care", notes: "Coordinate with maintenance", scheduledDate: "2026-09-15", status: "Draft",
    createdAt: "2026-09-14T12:20:00+05:30", updatedAt: "2026-09-14T12:20:00+05:30", observationIds: [], actionIds: [],
    activity: [{ id: "GEM-ACT-016-01", type: "draft_saved", label: "Draft walk saved", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-14T12:20:00+05:30" }],
  },
  {
    id: "GEM-2026-014", plant: "Egmore Plant", zone: "Zone B", leadId: "USR-RUMESH", leadName: "Rumesh",
    participants: [{ id: "USR-SIVA-KUMAR", name: "Siva Kumar", role: "Zone Member" }, { id: "USR-RAJ-KUMAR", name: "Raj Kumar", role: "Zone Member" }, { id: "USR-SUBURAMIANI", name: "Suburamiani", role: "Zone Member" }],
    purpose: "Observe packing safety and motion waste", scheduledDate: "2026-09-12", status: "Completed",
    createdAt: "2026-09-12T09:58:00+05:30", updatedAt: "2026-09-12T11:10:00+05:30", startedAt: "2026-09-12T10:05:00+05:30", completedAt: "2026-09-12T11:10:00+05:30",
    observationIds: ["GEM-2026-014-OBS-01", "GEM-2026-014-OBS-02", "GEM-2026-014-OBS-03", "GEM-2026-014-OBS-04"], actionIds: ["ACT-GEM-014-01", "ACT-GEM-014-02"],
    activity: [
      { id: "GEM-ACT-014-01", type: "walk_started", label: "Walk started", userId: "USR-RUMESH", userName: "Rumesh", at: "2026-09-12T10:05:00+05:30" },
      { id: "GEM-ACT-014-02", type: "observation_added", label: "Issue observation added", userId: "USR-RUMESH", userName: "Rumesh", at: "2026-09-12T10:18:00+05:30", observationId: "GEM-2026-014-OBS-01" },
      { id: "GEM-ACT-014-03", type: "photo_uploaded", label: "Photo uploaded", userId: "USR-RUMESH", userName: "Rumesh", at: "2026-09-12T10:18:00+05:30", observationId: "GEM-2026-014-OBS-01" },
      { id: "GEM-ACT-014-04", type: "action_created", label: "Action ACT-GEM-014-01 created", userId: "USR-RUMESH", userName: "Rumesh", at: "2026-09-12T10:24:00+05:30", observationId: "GEM-2026-014-OBS-01", actionId: "ACT-GEM-014-01" },
      { id: "GEM-ACT-014-05", type: "walk_completed", label: "Walk completed", userId: "USR-RUMESH", userName: "Rumesh", at: "2026-09-12T11:10:00+05:30" },
    ],
  },
  {
    id: "GEM-2026-011", plant: "Egmore Plant", zone: "Zone D", leadId: "USR-LAKSHMAN", leadName: "Lakshman",
    participants: [{ id: "USR-MEENA", name: "Meena", role: "Zone Member" }, { id: "USR-VIJAY", name: "Vijay", role: "Zone Member" }],
    purpose: "Observe workplace readiness and replenishment", scheduledDate: "2026-09-04", status: "Completed",
    createdAt: "2026-09-04T13:52:00+05:30", updatedAt: "2026-09-04T14:45:00+05:30", startedAt: "2026-09-04T14:00:00+05:30", completedAt: "2026-09-04T14:45:00+05:30",
    observationIds: ["GEM-2026-011-OBS-01", "GEM-2026-011-OBS-02"], actionIds: [],
    activity: [
      { id: "GEM-ACT-011-01", type: "walk_started", label: "Walk started", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-04T14:00:00+05:30" },
      { id: "GEM-ACT-011-02", type: "walk_completed", label: "Walk completed", userId: "USR-LAKSHMAN", userName: "Lakshman", at: "2026-09-04T14:45:00+05:30" },
    ],
  },
];

export const GEMBA_SEED_STATE: GembaState = { walks: SEED_WALKS, observations: SEED_OBSERVATIONS };

let state: GembaState = GEMBA_SEED_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Partial<GembaState>;
    if (Array.isArray(parsed.walks) && Array.isArray(parsed.observations)) state = parsed as GembaState;
  } catch { /* keep the complete demo state */ }
}

function persist(next: GembaState) {
  const previous = state;
  state = next;
  const result = safeSetStorage(STORAGE_KEY, state);
  if (!result.success) { state = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) { load(); listeners.add(listener); return () => listeners.delete(listener); }
function snapshot() { load(); return state; }
function serverSnapshot() { return GEMBA_SEED_STATE; }

export function useGembaStore() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function getGembaState() { load(); return state; }
export function getGembaWalk(id: string) { load(); return state.walks.find((walk) => walk.id === id); }
export function getGembaObservations(walkId: string) { load(); return state.observations.filter((observation) => observation.gembaId === walkId); }

function nextWalkId(now = new Date()) {
  const year = now.getFullYear();
  const prefix = `GEM-${year}-`;
  const number = state.walks.reduce((max, walk) => walk.id.startsWith(prefix) ? Math.max(max, Number(walk.id.slice(prefix.length)) || 0) : max, 0) + 1;
  return `${prefix}${String(number).padStart(3, "0")}`;
}

function nextObservationId(walkId: string) {
  const prefix = `${walkId}-OBS-`;
  const number = state.observations.reduce((max, observation) => observation.id.startsWith(prefix) ? Math.max(max, Number(observation.id.slice(prefix.length)) || 0) : max, 0) + 1;
  return `${prefix}${String(number).padStart(2, "0")}`;
}

function event(type: GembaWalk["activity"][number]["type"], label: string, actor: GembaActor, extra: Partial<GembaWalk["activity"][number]> = {}) {
  return { id: `GEM-ACT-${crypto.randomUUID()}`, type, label, userId: actor.id, userName: actor.name, at: new Date().toISOString(), ...extra };
}

export interface CreateGembaWalkInput {
  plant: string;
  zone: string;
  leadId: string;
  leadName: string;
  participants: GembaParticipant[];
  purpose: string;
  notes?: string;
  scheduledDate: string;
}

export function createGembaWalk(input: CreateGembaWalkInput, actor: GembaActor, startNow: boolean) {
  load();
  const now = new Date().toISOString();
  const walk: GembaWalk = {
    ...input, id: nextWalkId(), status: startNow ? "In Progress" : "Draft", createdAt: now, updatedAt: now,
    startedAt: startNow ? now : undefined, observationIds: [], actionIds: [],
    activity: [event(startNow ? "walk_started" : "draft_saved", startNow ? "Walk started" : "Draft walk saved", actor)],
  };
  return persist({ ...state, walks: [walk, ...state.walks] }) ? walk : null;
}

export function startGembaWalk(walkId: string, actor: GembaActor) {
  load();
  const now = new Date().toISOString();
  const next = state.walks.map((walk) => walk.id === walkId && walk.status === "Draft" ? {
    ...walk, status: "In Progress" as const, startedAt: now, updatedAt: now, activity: [...walk.activity, event("walk_started", "Walk started", actor)],
  } : walk);
  return persist({ ...state, walks: next });
}

export interface SaveObservationInput {
  type: GembaObservationType;
  title: string;
  description: string;
  location: string;
  peopleInvolved: string[];
  evidence: GembaEvidence[];
  noActionReason?: string;
}

export function saveGembaObservation(walkId: string, input: SaveObservationInput, actor: GembaActor, observationId?: string) {
  load();
  const walk = state.walks.find((item) => item.id === walkId);
  if (!walk || walk.status !== "In Progress") return null;
  const now = new Date().toISOString();
  const existing = observationId ? state.observations.find((item) => item.id === observationId && item.gembaId === walkId) : undefined;
  const observation: GembaObservation = existing
    ? { ...existing, ...input, updatedAt: now }
    : { ...input, id: nextObservationId(walkId), gembaId: walkId, createdById: actor.id, createdByName: actor.name, createdAt: now, updatedAt: now };
  const observations = existing ? state.observations.map((item) => item.id === observation.id ? observation : item) : [observation, ...state.observations];
  const activity = [...walk.activity, event(existing ? "observation_edited" : "observation_added", existing ? `Observation ${observation.id} edited` : `${observation.type} observation added`, actor, { observationId: observation.id })];
  const photosAdded = Math.max(0, observation.evidence.length - (existing?.evidence.length ?? 0));
  if (photosAdded) activity.push(event("photo_uploaded", `${photosAdded} photo${photosAdded === 1 ? "" : "s"} uploaded`, actor, { observationId: observation.id }));
  const walks = state.walks.map((item) => item.id === walkId ? { ...item, updatedAt: now, observationIds: existing ? item.observationIds : [...item.observationIds, observation.id], activity } : item);
  return persist({ walks, observations }) ? observation : null;
}

export function linkGembaAction(walkId: string, observationId: string, actionId: string, actor: GembaActor) {
  load();
  const now = new Date().toISOString();
  const observations = state.observations.map((item) => item.id === observationId && item.gembaId === walkId ? { ...item, actionId, updatedAt: now } : item);
  const walks = state.walks.map((walk) => walk.id === walkId ? {
    ...walk, updatedAt: now, actionIds: walk.actionIds.includes(actionId) ? walk.actionIds : [...walk.actionIds, actionId],
    activity: [...walk.activity, event("action_created", `Action ${actionId} created`, actor, { observationId, actionId })],
  } : walk);
  return persist({ walks, observations });
}

export function completeGembaWalk(walkId: string, actor: GembaActor) {
  load();
  const now = new Date().toISOString();
  const walks = state.walks.map((walk) => walk.id === walkId && walk.status === "In Progress" ? {
    ...walk, status: "Completed" as const, completedAt: now, updatedAt: now,
    activity: [...walk.activity, event("walk_completed", "Walk completed", actor)],
  } : walk);
  return persist({ ...state, walks });
}

export function getGembaSummary(input: GembaState, now = new Date()) {
  const thisMonth = input.walks.filter((walk) => {
    const date = new Date(walk.startedAt ?? walk.scheduledDate);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  return {
    walksThisMonth: thisMonth.length,
    openObservations: input.observations.filter((item) => item.type !== "Positive" && !item.actionId && !item.noActionReason).length,
    actionsCreated: input.walks.reduce((sum, walk) => sum + walk.actionIds.length, 0),
    completedWalks: input.walks.filter((walk) => walk.status === "Completed").length,
    positiveObservations: input.observations.filter((item) => item.type === "Positive").length,
  };
}
