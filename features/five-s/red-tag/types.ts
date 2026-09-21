export const RED_TAG_REASONS = [
  "Undefined Items", "Mix Up", "Same Material in Different Areas", "No Material Labelling",
  "No Quantity Mentioned", "Unclean Area", "Waste", "Others",
] as const;

export const RED_TAG_SECTIONS = [
  "Production", "Assembly", "Quality", "Maintenance", "Stores", "Warehouse", "Utilities", "Office", "Other",
] as const;

export const RED_TAG_DISPOSITIONS = ["Keep", "Relocate", "Repair", "Return", "Dispose", "Other"] as const;

export type RedTagStatus = "Open" | "In Progress" | "Awaiting Verification" | "Closed";
export type RedTagReason = (typeof RED_TAG_REASONS)[number];
export type RedTagDisposition = (typeof RED_TAG_DISPOSITIONS)[number];

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
  type: "created" | "printed" | "action_created" | "started" | "awaiting_verification" | "verified" | "removed" | "closed";
  label: string;
  actor: string;
  at: string;
}

export interface RedTag {
  id: string;
  tagNumber: string;
  plant: string;
  zone: string;
  section: string;
  itemName: string;
  quantity: number;
  reason: RedTagReason;
  customReason?: string;
  remarks: string;
  requiredAction: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  targetDate: string;
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
  closedAt?: string;
  history: RedTagHistoryEvent[];
}
