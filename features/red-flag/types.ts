import type { MyActionStatus } from "@/features/five-s/types/my-actions";

export type RedFlagSeverity = "Critical" | "High" | "Medium" | "Low";
export type RedFlagStatus = "Open" | "Action Created" | "In Progress" | "Awaiting Closure" | "Closed" | "Cancelled";
export type RedFlagEvidenceGroup = "initial" | "additional" | "closure";

export interface RedFlagEvidence {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  note?: string;
  group: RedFlagEvidenceGroup;
  uploadedAt: string;
  uploadedBy: string;
}

export type RedFlagActivityType =
  | "raised"
  | "evidence_added"
  | "containment_recorded"
  | "action_created"
  | "action_started"
  | "action_submitted"
  | "action_closed"
  | "awaiting_closure"
  | "closed"
  | "reopened"
  | "cancelled";

export interface RedFlagActivity {
  id: string;
  type: RedFlagActivityType;
  label: string;
  actorId: string;
  actorName: string;
  at: string;
  remark?: string;
  actionId?: string;
}

export interface RedFlag {
  id: string;
  title: string;
  description: string;
  plant: string;
  zone: string;
  location: string;
  machineAsset?: string;
  severity: RedFlagSeverity;
  status: RedFlagStatus;
  immediateActionTaken: boolean;
  containmentNote?: string;
  raisedById: string;
  raisedByName: string;
  raisedAt: string;
  updatedAt: string;
  slaDueAt: string;
  actionId?: string;
  syncedActionStatus?: MyActionStatus;
  reopenedAfterActionClosure?: boolean;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
  closureRemark?: string;
  evidence: RedFlagEvidence[];
  activity: RedFlagActivity[];
}

export interface RedFlagActor {
  id: string;
  name: string;
}

export interface CreateRedFlagInput {
  title: string;
  description: string;
  plant: string;
  zone: string;
  location: string;
  machineAsset?: string;
  severity: RedFlagSeverity;
  immediateActionTaken: boolean;
  containmentNote?: string;
  evidence: RedFlagEvidence[];
}
