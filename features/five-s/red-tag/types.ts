export const RED_TAG_REASONS = [
  "Undefined Items", "Mix Up", "Same Material in Different Areas", "No Material Labelling",
  "No Quantity Mentioned", "Unclean Area", "Waste", "Others",
] as const;

export const RED_TAG_REASON_GROUPS = {
  Identification: ["Unidentified item", "No/incorrect labelling", "Unclear ownership", "Unknown quantity"],
  Organization: ["Wrong location", "Mixed materials", "Duplicate items", "No defined storage location"],
  Usage: ["Unused", "Obsolete", "Excess", "Damaged", "Expired"],
  "Inventory / Waste": ["Excess inventory", "Scrap/waste", "Redundant item"],
  Other: ["Free Text"],
} as const;
export type RedTagReasonCategory = keyof typeof RED_TAG_REASON_GROUPS;
export type RedTagCategorizedReason = (typeof RED_TAG_REASON_GROUPS)[RedTagReasonCategory][number];

export const RED_TAG_SECTIONS = [
  "Production", "Assembly", "Quality", "Maintenance", "Stores", "Warehouse", "Utilities", "Office", "Other",
] as const;

export const RED_TAG_CATEGORIES = ["Equipment", "Tools", "Materials", "Furniture", "Documents", "Other"] as const;

export const RED_TAG_DECISIONS = ["keep", "relocate", "return", "repair", "sell_reuse", "scrap", "further_evaluation"] as const;
export const RED_TAG_DECISION_LABELS: Record<RedTagDecision, string> = {
  keep: "Keep", relocate: "Relocate", return: "Return", repair: "Repair",
  sell_reuse: "Sell / Reuse", scrap: "Scrap", further_evaluation: "Further Evaluation",
};

/** Legacy verification choices retained only so historical persisted records remain readable. */
export const RED_TAG_DISPOSITIONS = ["Keep", "Relocate", "Repair", "Return", "Dispose", "Other"] as const;

/** `In Progress` remains accepted only for the legacy Action-synchronization compatibility path. */
export type RedTagStatus = "Open" | "Under Review" | "Decision Made" | "Disposition In Progress" | "Awaiting Verification" | "Closed" | "In Progress";
export type RedTagReason = (typeof RED_TAG_REASONS)[number] | RedTagCategorizedReason;
export type RedTagDisposition = (typeof RED_TAG_DISPOSITIONS)[number];
export type RedTagDecision = (typeof RED_TAG_DECISIONS)[number];
export type RedTagCategory = (typeof RED_TAG_CATEGORIES)[number];

export function getRedTagReasonDisplay(reason: RedTagReason, customReason?: string) {
  return (reason === "Free Text" || reason === "Others") && customReason?.trim() ? customReason.trim() : reason;
}

export const RED_TAG_LIFECYCLE_STAGES = ["Tagged", "Review", "Decision", "Disposition", "Closed"] as const;
export type RedTagLifecycleStage = (typeof RED_TAG_LIFECYCLE_STAGES)[number];

export function getRedTagLifecycleStageIndex(status: RedTagStatus) {
  if (status === "Open") return 0;
  if (status === "Under Review") return 1;
  if (status === "Decision Made") return 2;
  if (status === "Disposition In Progress" || status === "In Progress" || status === "Awaiting Verification") return 3;
  return 4;
}

export interface RedTagEvidence {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RedTagHistoryEvent {
  id: string;
  type: "created" | "printed" | "action_created" | "review_submitted" | "reviewed" | "decision_recorded" | "decision_updated" | "disposition_started" | "disposition_completed" | "keep_confirmed" | "started" | "awaiting_verification" | "verified" | "verification_failed" | "removed" | "closed";
  label: string;
  actor: string;
  actorId?: string;
  at: string;
}

export interface RedTagReview {
  reviewerId: string;
  reviewerName: string;
  submittedAt: string;
  reviewedAt?: string;
  comments?: string;
}

export interface RedTagDecisionRecord {
  type: RedTagDecision;
  decidedAt: string;
  decidedByUserId: string;
  decidedByName: string;
  comments?: string;
}

export interface RedTagDispositionDetails {
  decision: RedTagDecision;
  responsiblePersonId: string;
  responsiblePersonName: string;
  targetDate: string;
  startedAt: string;
  startedByUserId: string;
  startedByName: string;
  executionNotes?: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByName?: string;
  completionNotes?: string;
  responsibleConfirmed?: boolean;
  evidence: RedTagEvidence[];
  approval?: { approved: boolean; approvedAt: string; approvedByUserId: string; approvedByName: string; comment?: string };
}

export interface RedTagKeepConfirmation {
  justification: string;
  confirmedAt: string;
  confirmedByUserId: string;
  confirmedByName: string;
}

export interface RedTagClosure {
  verificationResult: "Passed" | "Failed";
  verificationDetails: string;
  verifiedAt: string;
  verifiedByUserId: string;
  verifiedByName: string;
  evidence?: RedTagEvidence[];
  closedAt?: string;
  closedByUserId?: string;
  closedByName?: string;
}

export interface RedTag {
  id: string;
  tagNumber: string;
  plant: string;
  zone: string;
  section: string;
  itemName: string;
  /** Legacy field retained so historical Red Tags remain readable. */
  quantity?: number;
  department?: string;
  category?: RedTagCategory;
  estimatedValue?: number;
  reason: RedTagReason;
  reasonCategory?: RedTagReasonCategory;
  customReason?: string;
  remarks: string;
  /** Legacy client workflow fields; V2 records capture responsibility/target in dispositionDetails. */
  requiredAction?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  targetDate?: string;
  status: RedTagStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  imageUrl?: string;
  actionId?: string;
  syncedActionStatus?: import("@/features/five-s/types/my-actions").MyActionStatus;
  disposition?: RedTagDisposition;
  dispositionNote?: string;
  verificationRemark?: string;
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  removedByUserId?: string;
  removedByName?: string;
  removedAt?: string;
  removalConfirmed?: boolean;
  afterEvidence?: RedTagEvidence[];
  review?: RedTagReview;
  decisionRecord?: RedTagDecisionRecord;
  handlingMode?: "direct" | "linked_action";
  dispositionDetails?: RedTagDispositionDetails;
  keepConfirmation?: RedTagKeepConfirmation;
  closure?: RedTagClosure;
  closedAt?: string;
  history: RedTagHistoryEvent[];
}
