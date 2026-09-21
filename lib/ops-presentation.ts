export type OpsBadgeVariant = "default" | "secondary" | "outline" | "muted" | "success" | "warning" | "danger" | "info";
export type OpsStatusFamily = "neutral" | "informational" | "attention" | "critical" | "positive" | "returned";

const STATUS_FAMILIES: Record<string, OpsStatusFamily> = {
  draft: "neutral",
  open: "neutral",
  assigned: "informational",
  submitted: "informational",
  "under review": "informational",
  "action created": "informational",
  "in progress": "informational",
  "awaiting review": "attention",
  "pending review": "attention",
  "pending auditor review": "attention",
  "awaiting assignment": "attention",
  "awaiting closure": "attention",
  "awaiting completion review": "attention",
  "pending verification": "attention",
  pending: "attention",
  "on hold": "attention",
  "due soon": "attention",
  overdue: "critical",
  critical: "critical",
  escalated: "critical",
  failed: "critical",
  approved: "positive",
  verified: "positive",
  closed: "positive",
  completed: "positive",
  active: "positive",
  resolved: "positive",
  returned: "returned",
  rework: "returned",
  "rework required": "returned",
  rejected: "returned",
  cancelled: "neutral",
  inactive: "neutral",
  archived: "neutral",
  final: "positive",
};

const FAMILY_VARIANTS: Record<OpsStatusFamily, OpsBadgeVariant> = {
  neutral: "secondary",
  informational: "info",
  attention: "warning",
  critical: "danger",
  positive: "success",
  returned: "danger",
};

export function normalizeOpsStatus(status: string) {
  return status.trim().replaceAll("_", " ").replace(/\s+/g, " ").toLowerCase();
}

export function getOpsStatusFamily(status: string): OpsStatusFamily {
  return STATUS_FAMILIES[normalizeOpsStatus(status)] ?? "neutral";
}

export function getOpsStatusVariant(status: string): OpsBadgeVariant {
  return FAMILY_VARIANTS[getOpsStatusFamily(status)];
}

export const OPS_PRIORITY = {
  Critical: { rank: 4, variant: "danger" as const, dot: "bg-red-500" },
  High: { rank: 3, variant: "danger" as const, dot: "bg-orange-500" },
  Medium: { rank: 2, variant: "warning" as const, dot: "bg-amber-500" },
  Low: { rank: 1, variant: "secondary" as const, dot: "bg-slate-400" },
};

export type OpsSourceId = "audit" | "gemba" | "redFlag" | "redTag" | "continuousImprovement" | "visualManagement" | "manual";

export const OPS_SOURCE_LABELS: Record<OpsSourceId, string> = {
  audit: "Audit",
  gemba: "Gemba",
  redFlag: "Red Flag",
  redTag: "Red Tag",
  continuousImprovement: "Continuous Improvement",
  visualManagement: "Visual Management",
  manual: "Manual",
};
