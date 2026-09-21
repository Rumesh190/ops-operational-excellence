export type VisualManagementTier = string;
export type VisualManagementKpiSection = string;
export type VisualManagementKpiStatus = "Green" | "Amber" | "Red";
export type VisualManagementBoardStatus = "Active" | "Inactive" | "Paused";
export type VisualManagementMeetingStatus = "In Progress" | "Completed";
export type VisualManagementEscalationStatus = "Open" | "Acknowledged" | "In Progress" | "Resolved" | "Returned";

export interface VisualManagementPerson {
  id: string;
  name: string;
}

export interface VisualManagementKpiEvidence {
  id: string;
  name: string;
  url?: string;
}

export interface VisualManagementKpiEntry {
  section: VisualManagementKpiSection;
  status: VisualManagementKpiStatus;
  target: string;
  actual: string;
  note: string;
  evidence?: VisualManagementKpiEvidence[];
}

export interface VisualManagementBoard {
  id: string;
  name: string;
  plant: string;
  zone?: string;
  tier: VisualManagementTier;
  owner: VisualManagementPerson;
  members: VisualManagementPerson[];
  meetingFrequency: string;
  sections: VisualManagementKpiEntry[];
  status: VisualManagementBoardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VisualManagementParticipant extends VisualManagementPerson {
  attendance: "Present" | "Absent";
  guest?: boolean;
}

export type VisualManagementFollowUpType =
  | "Action"
  | "Red Flag"
  | "Continuous Improvement"
  | "Gemba"
  | "Escalation"
  | "Information Only";

export interface VisualManagementTopic {
  id: string;
  meetingId: string;
  section: VisualManagementKpiSection;
  title: string;
  description: string;
  owner?: VisualManagementPerson;
  decision?: string;
  followUpRequired?: boolean;
  followUpType?: VisualManagementFollowUpType;
  linkedActionId?: string;
  linkedRedFlagId?: string;
  linkedCIId?: string;
  linkedGembaId?: string;
  escalationId?: string;
  createdBy: VisualManagementPerson;
  createdAt: string;
}

export interface VisualManagementDecision {
  id: string;
  meetingId: string;
  decision: string;
  owner?: VisualManagementPerson;
  relatedTopicId?: string;
  linkedActionId?: string;
  createdAt: string;
}

export interface VisualManagementMeeting {
  id: string;
  boardId: string;
  /** Immutable display snapshot used after a Board is renamed or deactivated. */
  boardName?: string;
  plant: string;
  zone?: string;
  tier: VisualManagementTier;
  lead: VisualManagementPerson;
  participants: VisualManagementParticipant[];
  startedAt: string;
  completedAt?: string;
  kpiEntries: VisualManagementKpiEntry[];
  topicIds: string[];
  decisionIds: string[];
  actionIds: string[];
  redFlagIds: string[];
  continuousImprovementIds: string[];
  gembaIds: string[];
  escalationIds: string[];
  status: VisualManagementMeetingStatus;
}

export interface VisualManagementEscalation {
  id: string;
  sourceBoardId: string;
  sourceMeetingId: string;
  targetBoardId: string;
  topicId: string;
  actionId?: string;
  reason: string;
  status: VisualManagementEscalationStatus;
  createdBy: VisualManagementPerson;
  createdAt: string;
  updatedAt: string;
}

export interface VisualManagementState {
  boards: VisualManagementBoard[];
  meetings: VisualManagementMeeting[];
  topics: VisualManagementTopic[];
  decisions: VisualManagementDecision[];
  escalations: VisualManagementEscalation[];
}
