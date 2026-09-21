export type FiveSCategory =
  | "Sort"
  | "Set in Order"
  | "Shine"
  | "Standardize"
  | "Sustain";

export type FiveSAuditStage = FiveSCategory | "General";
export type AuditQuestionSource = "standard" | "custom";
export type AuditQuestionResponseType = "Compliance" | "Yes / No" | "Text";

export type FiveSAuditStatus =
  | "Draft"
  | "In Progress"
  | "Completed";

export type FiveSQuestionStatus =
  | "Not Started"
  | "Pass"
  | "Fail"
  | "NA";

export type FiveSActionStatus =
  | "Open"
  | "In Progress"
  | "Completed"
  | "Overdue";

/* =========================================================
   EVIDENCE
   ========================================================= */

export interface FiveSEvidence {
  id: string;
  name: string;

  type:
    | "image"
    | "document";

  size: number;

  dataUrl: string;

  uploadedAt: string;

  uploadedBy: string;
}

/* =========================================================
   QUESTION
   ========================================================= */

export interface FiveSQuestion {
  id: string;

  category: FiveSAuditStage;

  question: string;

  description?: string;

  referenceImage?: string;

  referenceTitleKey?: string;

  referenceGuidanceKey?: string;

  referenceAltKey?: string;

  maxScore: number;

  score: number | null;

  status: FiveSQuestionStatus;

  observation?: string;

  evidence?: FiveSEvidence[];

  actionRequired: boolean;

  actionId?: string;

  /** Snapshot metadata. Missing values on legacy audits are treated as standard Compliance questions. */
  questionSource?: AuditQuestionSource;
  customQuestionId?: string;
  responseType?: AuditQuestionResponseType;
  mandatory?: boolean;
  requireEvidenceOnNonCompliance?: boolean;
  textResponse?: string;
  yesNoResponse?: "Yes" | "No";
}

/* =========================================================
   SECTION
   ========================================================= */

export interface FiveSSection {
  category: FiveSAuditStage;

  description: string;

  questions: FiveSQuestion[];

  score: number;

  maxScore: number;
}

/* =========================================================
   AUDIT
   ========================================================= */

export interface FiveSAudit {
  id: string;

  title: string;

  plant: string;

  department: string;

  area: string;

  auditor: string;

  status: FiveSAuditStatus;

  score: number;

  maxScore: number;

  completionPercentage: number;

  startedAt?: string;

  completedAt?: string;

  auditorSignature?: {
    userId: string;
    userName: string;
    signedAt: string;
    signatureImage: string;
  };

  dueDate: string;

  sections: FiveSSection[];
}

/* =========================================================
   ACTION
   ========================================================= */

export interface FiveSAction {
  id: string;

  auditId: string;

  auditTitle: string;

  title: string;

  description: string;

  category: FiveSCategory;

  plant: string;

  department: string;

  area: string;

  assignedTo: string;

  status: FiveSActionStatus;

  priority:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";

  dueDate: string;

  createdAt: string;

  completedAt?: string;

  evidence?: FiveSEvidence[];
}
