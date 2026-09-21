export type GembaWalkStatus = "Draft" | "In Progress" | "Completed";
export type GembaObservationType = "Positive" | "Opportunity" | "Issue";

export interface GembaParticipant {
  id: string;
  name: string;
  role: string;
}

export interface GembaEvidence {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  note?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type GembaActivityType =
  | "draft_saved"
  | "walk_started"
  | "observation_added"
  | "photo_uploaded"
  | "action_created"
  | "observation_edited"
  | "walk_completed";

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
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  actionId?: string;
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

