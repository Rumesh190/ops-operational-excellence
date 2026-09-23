/**
 * "Draft" is a legacy status value kept in the union for backward
 * compatibility with existing persisted records; `gemba-store.ts` normalizes
 * any legacy "Draft" walk to "Scheduled" on load. New walks are only ever
 * created with "Scheduled".
 */
export type GembaWalkStatus = "Draft" | "Scheduled" | "In Progress" | "Completed";
export type GembaObservationType = "Positive" | "Opportunity" | "Issue";

/** Issue observations require photo evidence regardless of how the observation was captured (manual or voice); the user's final selected type is what's evaluated, not any earlier AI suggestion. */
export function isEvidencePhotoRequired(type: GembaObservationType) {
  return type === "Issue";
}

export interface GembaParticipant {
  id: string;
  name: string;
  role: string;
  /** Set only for participants added from outside the walk's own zone, so the UI can subtly show where they normally work. */
  homeZone?: string;
}

export interface GembaEvidence {
  id: string;
  name: string;
  /**
   * Displayable URL: a static path for seed/demo assets, or a session-local
   * object/data URL for a just-captured photo before persistence completes.
   * Never persisted to localStorage when it is a `blob:`/`data:` URL — see
   * `sanitizeEvidenceForPersist` in gemba-store.ts. Absent once only the
   * IndexedDB-backed `storageKey` remains (e.g. after a page refresh).
   */
  url?: string;
  /** IndexedDB key for the photo Blob (lib/gemba/gemba-photo-storage.ts). Present for any photo added since the IndexedDB migration. */
  storageKey?: string;
  mimeType?: string;
  size?: number;
  note?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type GembaActivityType =
  | "draft_saved"
  | "walk_started"
  | "observation_added"
  | "photo_uploaded"
  | "voice_note_added"
  | "action_created"
  | "red_tag_created"
  | "observation_edited"
  | "walk_completed";

export interface GembaVoiceNote {
  id: string;
  durationSeconds: number;
  mimeType: string;
  transcript?: string;
  /** Session-local object URL for playback. May become unavailable after a page refresh — this is a browser-only demo persistence limitation, not a data-loss bug. */
  audioUrl?: string;
  createdAt: string;
  createdBy: string;
}

export interface GembaActivity {
  id: string;
  type: GembaActivityType;
  label: string;
  userId: string;
  userName: string;
  at: string;
  observationId?: string;
  actionId?: string;
}

export interface GembaObservation {
  id: string;
  gembaId: string;
  type: GembaObservationType;
  title: string;
  description: string;
  location: string;
  peopleInvolved: string[];
  evidence: GembaEvidence[];
  voiceNote?: GembaVoiceNote;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  actionId?: string;
  redTagId?: string;
  noActionReason?: string;
}

export interface GembaWalk {
  id: string;
  plant: string;
  zone: string;
  leadId: string;
  leadName: string;
  participants: GembaParticipant[];
  purpose: string;
  notes?: string;
  scheduledDate: string;
  /** Only meaningful for a "Scheduled" walk; absent for legacy/"Start now" walks. */
  scheduledTime?: string;
  status: GembaWalkStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  observationIds: string[];
  actionIds: string[];
  activity: GembaActivity[];
}

export interface GembaState {
  walks: GembaWalk[];
  observations: GembaObservation[];
}

export interface GembaActor {
  id: string;
  name: string;
}

