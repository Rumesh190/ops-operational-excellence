export type VisualImprovementStatus =
  | "Draft"
  | "Planned"
  | "In Progress"
  | "Awaiting Review"
  | "Completed"
  | "Returned";

export type VisualImprovementCategory =
  | "Organization & Layout"
  | "Cleanliness & Hygiene"
  | "Safety"
  | "Visual Management"
  | "Storage"
  | "Workflow"
  | "Space Utilization"
  | "Ergonomics"
  | "Quality"
  | "Other";

export interface VisualImprovementPerson {
  id: string;
  name: string;
}

export interface VisualImprovementEvidence {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type VisualImprovementActivityType =
  | "created"
  | "planned"
  | "started"
  | "before_evidence_added"
  | "after_evidence_added"
  | "action_created"
  | "submitted"
  | "returned"
  | "resubmitted"
  | "completed"
  | "updated";

export interface VisualImprovementActivity {
  id: string;
  type: VisualImprovementActivityType;
  label: string;
  actorId: string;
  actorName: string;
  at: string;
  remark?: string;
  actionId?: string;
}

export interface VisualImprovement {
  id: string;
  title: string;
  plant: string;
  zone: string;
  location: string;
  category: VisualImprovementCategory;
  ownerId: string;
  ownerName: string;
  participants: VisualImprovementPerson[];
  status: VisualImprovementStatus;
  beforeDescription: string;
  beforeEvidence: VisualImprovementEvidence[];
  afterDescription?: string;
  afterEvidence: VisualImprovementEvidence[];
  expectedBenefit: string;
  proposedCostSaving?: number;
  actualCostSaving?: number;
  benefitDescription?: string;
  timeSaved?: string;
  spaceSaved?: string;
  safetyBenefit?: string;
  qualityBenefit?: string;
  otherBenefit?: string;
  estimatedCompletionDate?: string;
  completionNotes?: string;
  actionId?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  submittedAt?: string;
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewRemark?: string;
  activity: VisualImprovementActivity[];
}

export interface CreateVisualImprovementInput {
  title: string;
  plant: string;
  zone: string;
  location: string;
  category: VisualImprovementCategory;
  owner: VisualImprovementPerson;
  participants: VisualImprovementPerson[];
  beforeDescription: string;
  beforeEvidence: VisualImprovementEvidence[];
  expectedBenefit: string;
  proposedCostSaving?: number;
  estimatedCompletionDate?: string;
}

export interface UpdateVisualImprovementInput {
  title?: string;
  location?: string;
  category?: VisualImprovementCategory;
  beforeDescription?: string;
  beforeEvidence?: VisualImprovementEvidence[];
  afterDescription?: string;
  afterEvidence?: VisualImprovementEvidence[];
  proposedCostSaving?: number;
  actualCostSaving?: number;
  benefitDescription?: string;
  timeSaved?: string;
  spaceSaved?: string;
  safetyBenefit?: string;
  qualityBenefit?: string;
  otherBenefit?: string;
  completionNotes?: string;
  estimatedCompletionDate?: string;
}

export interface VisualImprovementActor {
  id: string;
  name: string;
}
