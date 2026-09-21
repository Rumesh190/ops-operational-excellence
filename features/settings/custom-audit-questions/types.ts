import type {
  AuditQuestionResponseType,
  FiveSAuditStage,
} from "@/features/five-s/types/five-s";

export interface CustomAuditQuestion {
  id: string;
  organizationId?: string;
  question: string;
  stage: FiveSAuditStage;
  responseType: AuditQuestionResponseType;
  mandatory: boolean;
  requireEvidenceOnNonCompliance: boolean;
  instruction?: string;
  referenceImage?: string;
  active: boolean;
  order: number;
  source: "custom";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomAuditQuestionInput = Omit<
  CustomAuditQuestion,
  "id" | "source" | "createdBy" | "createdAt" | "updatedAt"
>;
