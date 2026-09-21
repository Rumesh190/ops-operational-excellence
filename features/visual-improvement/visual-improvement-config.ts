import type { VisualImprovement, VisualImprovementCategory, VisualImprovementStatus } from "./types";

export const VISUAL_IMPROVEMENT_CATEGORIES: readonly VisualImprovementCategory[] = [
  "Organization & Layout",
  "Cleanliness & Hygiene",
  "Safety",
  "Visual Management",
  "Storage",
  "Workflow",
  "Space Utilization",
  "Ergonomics",
  "Quality",
  "Other",
] as const;

export const VISUAL_IMPROVEMENT_STATUSES: readonly VisualImprovementStatus[] = [
  "Draft",
  "Planned",
  "In Progress",
  "Awaiting Review",
  "Completed",
  "Returned",
] as const;

export const VISUAL_IMPROVEMENT_STATUS_LABELS: Record<VisualImprovementStatus, string> = {
  Draft: "Draft",
  Planned: "Planned",
  "In Progress": "In Progress",
  "Awaiting Review": "Awaiting Review",
  Completed: "Completed",
  Returned: "Returned",
};

export function generateVisualImprovementId(records: readonly Pick<VisualImprovement, "id">[], year = new Date().getFullYear()) {
  const prefix = `VI-${year}-`;
  const next = records.reduce((largest, record) => {
    if (!record.id.startsWith(prefix)) return largest;
    return Math.max(largest, Number(record.id.slice(prefix.length)) || 0);
  }, 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
