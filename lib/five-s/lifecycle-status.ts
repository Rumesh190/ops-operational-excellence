import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { MyActionStatus } from "@/features/five-s/types/my-actions";

export type AuditLifecycleStage = "Draft" | "In Progress" | "Review" | "Completed";
export type ActionLifecycleStage = "Assigned" | "In Progress" | "Submitted for Review" | "Under Review" | "Rework" | "Closed";

export const AUDIT_LIFECYCLE_STAGES: AuditLifecycleStage[] = ["Draft", "In Progress", "Review", "Completed"];
export const ACTION_LIFECYCLE_STAGES: ActionLifecycleStage[] = ["Assigned", "In Progress", "Submitted for Review", "Under Review", "Rework", "Closed"];

export function getAuditLifecycleStage(audit: FiveSAudit): AuditLifecycleStage {
  if (audit.status === "Completed") return "Completed";
  if (audit.completionPercentage >= 100) return "Review";
  if (audit.status === "In Progress" || audit.completionPercentage > 0) return "In Progress";
  return "Draft";
}

export function getActionLifecycleStage(status: MyActionStatus): ActionLifecycleStage {
  if (status === "Completed") return "Closed";
  if (status === "Rework Required") return "Rework";
  if (["Pending Review", "Awaiting Review"].includes(status)) return "Under Review";
  if (status === "Pending Auditor Review") return "Submitted for Review";
  if (["In Progress", "Overdue"].includes(status)) return "In Progress";
  return "Assigned";
}
