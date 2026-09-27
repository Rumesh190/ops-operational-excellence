import type { ContinuousImprovement, ImprovementBenefitType, ImprovementStatus } from "./types";

export const IMPROVEMENT_STATUSES: readonly ImprovementStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "on_hold",
  "rejected",
  "in_progress",
  "awaiting_completion_review",
  "completed",
];

export const IMPROVEMENT_STATUS_LABELS: Record<ImprovementStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  on_hold: "On Hold",
  rejected: "Rejected",
  in_progress: "In Progress",
  awaiting_completion_review: "Awaiting Completion Review",
  completed: "Completed",
};

export const IMPROVEMENT_BENEFIT_TYPES: readonly ImprovementBenefitType[] = [
  "Cost Saving",
  "Time Saving",
  "Space Saving",
  "Safety Benefit",
  "Quality Benefit",
  "Productivity Benefit",
  "Other",
];

export const IMPROVEMENT_PIPELINE = [
  { id: "proposed", label: "Proposed", statuses: ["draft", "submitted"] },
  { id: "review", label: "Under Review", statuses: ["under_review", "on_hold"] },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "implementation", label: "In Progress", statuses: ["in_progress"] },
  { id: "completion", label: "Completion Review", statuses: ["awaiting_completion_review"] },
  { id: "completed", label: "Completed", statuses: ["completed"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; statuses: readonly ImprovementStatus[] }>;

export type ImprovementQuickFilter = "proposal" | "under-review" | "in-progress";

export const IMPROVEMENT_QUICK_FILTERS = [
  { id: "proposal", label: "Proposal", statuses: ["draft", "submitted"] },
  { id: "under-review", label: "Under Review", statuses: ["submitted", "under_review"] },
  { id: "in-progress", label: "In Progress", statuses: ["in_progress"] },
] as const satisfies ReadonlyArray<{ id: ImprovementQuickFilter; label: string; statuses: readonly ImprovementStatus[] }>;

export function matchesImprovementQuickFilter(item: Pick<ContinuousImprovement, "status">, filter: ImprovementQuickFilter) {
  const definition = IMPROVEMENT_QUICK_FILTERS.find((entry) => entry.id === filter);
  return definition ? (definition.statuses as readonly ImprovementStatus[]).includes(item.status) : true;
}

export function generateImprovementId(records: readonly Pick<ContinuousImprovement, "id">[], year = new Date().getFullYear()) {
  const prefix = `CI-${year}-`;
  const next = records.reduce((maximum, record) => {
    if (!record.id.startsWith(prefix)) return maximum;
    return Math.max(maximum, Number(record.id.slice(prefix.length)) || 0);
  }, 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
