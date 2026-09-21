import type { AccessCapabilityId } from "@/lib/modules";

export type ReportModuleId =
  | "audit"
  | "actions"
  | "continuousImprovement"
  | "redFlag"
  | "visualManagement"
  | "visualImprovement"
  | "gemba";

export type ReportTypeId =
  | "auditReport"
  | "nonComplianceSummary"
  | "beforeAfterSummary"
  | "actionReport"
  | "completedActionReport"
  | "overdueActionSummary"
  | "improvementReport"
  | "benefitSavingsSummary"
  | "redFlagReport"
  | "redFlagClosureReport"
  | "visualManagementMeetingReport"
  | "visualBeforeAfterReport"
  | "visualSavingsSummary"
  | "gembaWalkReport"
  | "gembaObservationSummary"
  | "gembaActionSummary";

export interface ReportTypeDefinition {
  id: ReportTypeId;
  label: string;
  module: ReportModuleId;
  sourceType: "record" | "summary";
  supportsPrint: boolean;
  supportsCsv: boolean;
  supportsExcel: boolean;
}

export const REPORT_MODULES: ReadonlyArray<{
  id: ReportModuleId;
  label: string;
  entitlement: AccessCapabilityId;
}> = [
  { id: "gemba", label: "Gemba", entitlement: "gemba" },
  { id: "redFlag", label: "Red Flag", entitlement: "redFlag" },
  { id: "continuousImprovement", label: "Continuous Improvement", entitlement: "continuousImprovement" },
  { id: "audit", label: "Audit", entitlement: "audit" },
  { id: "actions", label: "Actions", entitlement: "actions" },
  { id: "visualManagement", label: "Visual Management", entitlement: "visualManagement" },
] as const;

const LEGACY_REPORT_MODULES: ReadonlyArray<{ id: ReportModuleId; label: string; entitlement: AccessCapabilityId }> = [
  { id: "visualImprovement", label: "Legacy Improvement", entitlement: "visualImprovement" },
];

export const REPORT_TYPES: Record<ReportTypeId, ReportTypeDefinition> = {
  auditReport: definition("auditReport", "Audit Report", "audit", "record", true, false),
  nonComplianceSummary: definition("nonComplianceSummary", "Non-Compliance Summary", "audit", "summary", true, true),
  beforeAfterSummary: definition("beforeAfterSummary", "Before & After Summary", "audit", "summary", true, true),
  actionReport: definition("actionReport", "Action Report", "actions", "record", true, false),
  completedActionReport: definition("completedActionReport", "Completed Action Report", "actions", "record", true, false),
  overdueActionSummary: definition("overdueActionSummary", "Overdue Action Summary", "actions", "summary", true, true),
  improvementReport: definition("improvementReport", "Improvement Report", "continuousImprovement", "record", true, false),
  benefitSavingsSummary: definition("benefitSavingsSummary", "Benefit / Savings Summary", "continuousImprovement", "summary", true, true),
  redFlagReport: definition("redFlagReport", "Red Flag Report", "redFlag", "record", true, false),
  redFlagClosureReport: definition("redFlagClosureReport", "Closure Report", "redFlag", "record", true, false),
  visualManagementMeetingReport: definition("visualManagementMeetingReport", "Visual Management Meeting Report", "visualManagement", "record", true, false),
  visualBeforeAfterReport: definition("visualBeforeAfterReport", "Before & After Improvement Report", "visualImprovement", "record", true, false),
  visualSavingsSummary: definition("visualSavingsSummary", "Savings / Benefit Report", "visualImprovement", "summary", true, true),
  gembaWalkReport: definition("gembaWalkReport", "Gemba Walk Report", "gemba", "record", true, false),
  gembaObservationSummary: definition("gembaObservationSummary", "Observation Summary", "gemba", "summary", true, true),
  gembaActionSummary: definition("gembaActionSummary", "Gemba Action Summary", "gemba", "summary", true, true),
};

/** Product-facing report registry. Legacy definitions remain addressable only through direct compatibility routes. */
export const REPORT_TYPE_REGISTRY = Object.values(REPORT_TYPES).filter((report) => report.module !== "visualImprovement");

export function getReportType(id: string) {
  return REPORT_TYPES[id as ReportTypeId];
}

export function getReportModule(id: ReportModuleId) {
  return [...REPORT_MODULES, ...LEGACY_REPORT_MODULES].find((module) => module.id === id)!;
}

function definition(
  id: ReportTypeId,
  label: string,
  module: ReportModuleId,
  sourceType: ReportTypeDefinition["sourceType"],
  supportsPrint: boolean,
  supportsCsv: boolean,
): ReportTypeDefinition {
  return { id, label, module, sourceType, supportsPrint, supportsCsv, supportsExcel: false };
}
