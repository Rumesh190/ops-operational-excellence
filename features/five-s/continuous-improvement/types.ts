export type ImprovementStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "on_hold"
  | "rejected"
  | "in_progress"
  | "awaiting_completion_review"
  | "completed";

export type TimeUnit = "Hours" | "Days" | "Weeks";

export type ImprovementBenefitType =
  | "Cost Saving"
  | "Time Saving"
  | "Space Saving"
  | "Safety Benefit"
  | "Quality Benefit"
  | "Productivity Benefit"
  | "Other";

export interface ImprovementPerson {
  id: string;
  name: string;
}

export interface ImprovementEvidence {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  mimeType?: string;
  caption?: string;
}

export type ImprovementEventType =
  | "created"
  | "updated"
  | "submitted"
  | "review_started"
  | "approved"
  | "rejected"
  | "on_hold"
  | "review_resumed"
  | "started"
  | "progress_updated"
  | "action_created"
  | "evidence_uploaded"
  | "completion_submitted"
  | "completion_returned"
  | "completion_resubmitted"
  | "completed";

export interface ImprovementEvent {
  id: string;
  type: ImprovementEventType;
  actorId: string;
  actorName: string;
  at: string;
  remark?: string;
}

export interface ContinuousImprovement {
  id: string;
  plant: string;
  zone: string;
  zoneCode: string;
  zoneLeaderId: string;
  zoneLeaderName: string;

  title: string;
  issueDescription: string;
  proposedImprovement: string;
  expectedBenefit: string;
  benefitType: ImprovementBenefitType;
  proposedSaving: number;
  estimatedTime: number;
  estimatedTimeUnit: TimeUnit;

  proposedById: string;
  proposedByName: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberNames: string[];
  participants: ImprovementPerson[];

  status: ImprovementStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewDecision?: "approved" | "rejected" | "on_hold";
  reviewRemark?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  holdReason?: string;
  heldAt?: string;
  heldById?: string;
  heldByName?: string;

  implementationProcess?: string;
  actionTaken?: string;
  progressNotes?: string;
  actionIds: string[];
  actualBenefit?: string;
  actualSaving?: number;
  completionRemark?: string;
  completionReviewRemark?: string;
  completionReviewedAt?: string;
  completionReviewedById?: string;
  completionReviewedByName?: string;

  /** Existing current-state images. Kept as an alias for the legacy CI model. */
  existingPhotos: ImprovementEvidence[];
  /** Completion images. Kept as an alias for the legacy CI model. */
  evidence: ImprovementEvidence[];
  beforeEvidence: ImprovementEvidence[];
  afterEvidence: ImprovementEvidence[];

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  startedAt?: string;
  completionSubmittedAt?: string;
  completedAt?: string;
  completedById?: string;
  completedByName?: string;
  timeline: ImprovementEvent[];
}

export interface CreateImprovementInput {
  title: string;
  plant?: string;
  zone?: string;
  issueDescription: string;
  proposedImprovement?: string;
  expectedBenefit?: string;
  benefitType?: ImprovementBenefitType;
  proposedSaving?: number;
  estimatedTime: number;
  estimatedTimeUnit: TimeUnit;
  memberIds: string[];
  existingPhotos?: ImprovementEvidence[];
  beforeEvidence?: ImprovementEvidence[];
}

export interface ProposalUpdateInput {
  title: string;
  issueDescription: string;
  proposedImprovement: string;
  expectedBenefit: string;
  benefitType: ImprovementBenefitType;
  proposedSaving?: number;
  estimatedTime: number;
  estimatedTimeUnit: TimeUnit;
  memberIds: string[];
  beforeEvidence: ImprovementEvidence[];
}

export interface ImplementationUpdateInput {
  implementationProcess?: string;
  actionTaken?: string;
  progressNotes?: string;
  actualBenefit?: string;
  actualSaving?: number;
  afterEvidence?: ImprovementEvidence[];
}

export interface ImprovementActor {
  id: string;
  name: string;
}
