import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { ContinuousImprovement } from "@/features/five-s/continuous-improvement/types";
import type { RedFlag } from "@/features/red-flag/types";
import type { VisualImprovement } from "@/features/visual-improvement/types";
import type { GembaState } from "@/features/gemba/types";
import type { VisualManagementState } from "@/features/visual-management/types";
import type { OrganizationAccess } from "@/lib/module-entitlements";
import {
  REPORT_MODULES,
  REPORT_TYPES,
  getReportModule,
  type ReportModuleId,
  type ReportTypeId,
} from "./report-registry";

export type ReportStatus = "Draft" | "Final" | "Archived";

export interface ReportLibraryItem {
  id: string;
  reportTypeId: ReportTypeId;
  title: string;
  module: ReportModuleId;
  moduleLabel: string;
  reference: string;
  plant: string;
  zone: string;
  generatedBy: string;
  date: string;
  status: ReportStatus;
  previewHref: string;
  sourceHref: string;
  supportsPrint: boolean;
  supportsCsv: boolean;
  supportsExcel: boolean;
}

export interface ReportLibraryInput {
  audits: FiveSAudit[];
  actions: MyAction[];
  improvements: ContinuousImprovement[];
  redFlags: RedFlag[];
  visualImprovements?: VisualImprovement[];
  visualManagement?: VisualManagementState;
  gemba: GembaState;
  access: OrganizationAccess;
  now?: Date;
}

export interface ReportLibraryFilters {
  search: string;
  module: "All" | ReportModuleId;
  plant: string;
  zone: string;
  dateFrom: string;
  dateTo: string;
  generatedBy: string;
  status: "All" | ReportStatus;
  sort: "Newest" | "Oldest";
}

export function buildAuditReportData(audits: FiveSAudit[]): ReportLibraryItem[] {
  return audits.map((audit) => item({
    id: `audit:${audit.id}`,
    reportTypeId: "auditReport",
    title: `${audit.area} ${audit.title || "Audit"} Report`,
    reference: audit.id,
    plant: audit.plant,
    zone: audit.area,
    generatedBy: audit.auditor,
    date: audit.completedAt ?? audit.startedAt ?? audit.dueDate,
    status: audit.status === "Completed" ? "Final" : "Draft",
    previewHref: `/5s/audits/${encodeURIComponent(audit.id)}/report?from=reports-audit&returnTo=${encodeURIComponent("/reports?tab=audit")}`,
    sourceHref: `/audits?audit=${encodeURIComponent(audit.id)}`,
  }));
}

export function buildActionReportData(actions: MyAction[]): ReportLibraryItem[] {
  return actions.map((action) => item({
    id: `action:${action.id}`,
    reportTypeId: action.status === "Completed" ? "completedActionReport" : "actionReport",
    title: `${action.title} · ${action.status === "Completed" ? "Completion Report" : "Action Report"}`,
    reference: action.id,
    plant: action.plant,
    zone: action.area,
    generatedBy: action.completedByName ?? action.responsiblePersonName ?? action.assignedTo,
    date: action.completedAt ?? action.reviewedAt ?? action.createdAt,
    status: action.status === "Completed" ? "Final" : "Draft",
    previewHref: action.status === "Completed"
      ? `/actions/${encodeURIComponent(action.id)}/report?from=reports-action&returnTo=${encodeURIComponent("/reports?tab=actions")}`
      : `/reports/action/${encodeURIComponent(action.id)}`,
    sourceHref: `/actions/${encodeURIComponent(action.id)}`,
  }));
}

export function buildCIReportData(improvements: ContinuousImprovement[]): ReportLibraryItem[] {
  return improvements.map((improvement) => item({
    id: `ci:${improvement.id}`,
    reportTypeId: "improvementReport",
    title: `${improvement.title} · Improvement Report`,
    reference: improvement.id,
    plant: improvement.plant,
    zone: improvement.zone,
    generatedBy: improvement.completedByName ?? improvement.proposedByName,
    date: improvement.completedAt ?? improvement.updatedAt ?? improvement.createdAt,
    status: improvement.status === "completed" ? "Final" : "Draft",
    previewHref: `/continuous-improvement/${encodeURIComponent(improvement.id)}/report`,
    sourceHref: `/continuous-improvement/${encodeURIComponent(improvement.id)}`,
  }));
}

export function buildRedFlagReportData(redFlags: RedFlag[]): ReportLibraryItem[] {
  return redFlags.map((flag) => item({
    id: `red-flag:${flag.id}`,
    reportTypeId: flag.status === "Closed" ? "redFlagClosureReport" : "redFlagReport",
    title: `${flag.title} · ${flag.status === "Closed" ? "Closure Report" : "Red Flag Report"}`,
    reference: flag.id,
    plant: flag.plant,
    zone: flag.zone,
    generatedBy: flag.closedByName ?? flag.raisedByName,
    date: flag.closedAt ?? flag.updatedAt ?? flag.raisedAt,
    status: flag.status === "Closed" ? "Final" : "Draft",
    previewHref: `/red-flag/${encodeURIComponent(flag.id)}/report`,
    sourceHref: `/red-flag/${encodeURIComponent(flag.id)}`,
  }));
}

export function buildVisualImprovementReportData(improvements: VisualImprovement[]): ReportLibraryItem[] {
  return improvements.filter((improvement) => improvement.status === "Completed").map((improvement) => item({
    id: `visual:${improvement.id}`,
    reportTypeId: "visualBeforeAfterReport",
    title: `${improvement.title} · Before & After Report`,
    reference: improvement.id,
    plant: improvement.plant,
    zone: improvement.zone,
    generatedBy: improvement.completedByName ?? improvement.ownerName,
    date: improvement.completedAt ?? improvement.updatedAt,
    status: "Final",
    previewHref: `/visual-improvement/${encodeURIComponent(improvement.id)}/report`,
    sourceHref: `/visual-improvement/${encodeURIComponent(improvement.id)}`,
  }));
}

export function buildVisualManagementReportData(state: VisualManagementState): ReportLibraryItem[] {
  const boards = new Map(state.boards.map((board) => [board.id, board]));
  return state.meetings.map((meeting) => {
    const board = boards.get(meeting.boardId);
    return item({
      id: `visual-management:${meeting.id}`,
      reportTypeId: "visualManagementMeetingReport",
      title: `${board?.name ?? meeting.boardId} · Meeting Report`,
      reference: meeting.id,
      plant: meeting.plant,
      zone: meeting.zone ?? "All Zones",
      generatedBy: meeting.lead.name,
      date: meeting.completedAt ?? meeting.startedAt,
      status: meeting.status === "Completed" ? "Final" : "Draft",
      previewHref: `/visual-management/meetings/${encodeURIComponent(meeting.id)}`,
      sourceHref: `/visual-management/meetings/${encodeURIComponent(meeting.id)}`,
    });
  });
}

export function buildGembaReportData(gemba: GembaState): ReportLibraryItem[] {
  return gemba.walks.map((walk) => item({
    id: `gemba:${walk.id}`,
    reportTypeId: "gembaWalkReport",
    title: `${walk.zone} Gemba Walk Report`,
    reference: walk.id,
    plant: walk.plant,
    zone: walk.zone,
    generatedBy: walk.leadName,
    date: walk.completedAt ?? walk.updatedAt ?? walk.scheduledDate,
    status: walk.status === "Completed" ? "Final" : "Draft",
    previewHref: `/gemba/${encodeURIComponent(walk.id)}/report`,
    sourceHref: `/gemba/${encodeURIComponent(walk.id)}`,
  }));
}

export function buildReportLibrary(input: ReportLibraryInput): ReportLibraryItem[] {
  const now = input.now ?? new Date();
  const sources: Record<ReportModuleId, ReportLibraryItem[]> = {
    audit: [
      ...buildAuditReportData(input.audits),
      summaryItem("nonComplianceSummary", input.audits[0]?.plant, now),
      summaryItem("beforeAfterSummary", input.audits[0]?.plant, now),
    ],
    actions: [
      ...buildActionReportData(input.actions),
      summaryItem("overdueActionSummary", input.actions[0]?.plant, now),
    ],
    continuousImprovement: [
      ...buildCIReportData(input.improvements),
      summaryItem("benefitSavingsSummary", input.improvements[0]?.plant, now),
    ],
    redFlag: buildRedFlagReportData(input.redFlags),
    visualManagement: buildVisualManagementReportData(input.visualManagement ?? { boards: [], meetings: [], topics: [], decisions: [], escalations: [] }),
    visualImprovement: [],
    gemba: [
      ...buildGembaReportData(input.gemba),
      summaryItem("gembaObservationSummary", input.gemba.walks[0]?.plant, now),
      summaryItem("gembaActionSummary", input.gemba.walks[0]?.plant, now),
    ],
  };
  return REPORT_MODULES.flatMap((module) => input.access[module.entitlement] ? sources[module.id] : []);
}

export function filterReportLibrary(items: ReportLibraryItem[], filters: ReportLibraryFilters) {
  const query = filters.search.trim().toLowerCase();
  const filtered = items.filter((report) => {
    const haystack = [report.title, report.moduleLabel, report.reference, report.plant, report.zone, report.generatedBy, report.status].join(" ").toLowerCase();
    const day = report.date.slice(0, 10);
    return (!query || haystack.includes(query))
      && (filters.module === "All" || report.module === filters.module)
      && (filters.plant === "All" || report.plant === filters.plant)
      && (filters.zone === "All" || report.zone === filters.zone)
      && (!filters.dateFrom || day >= filters.dateFrom)
      && (!filters.dateTo || day <= filters.dateTo)
      && (filters.generatedBy === "All" || report.generatedBy === filters.generatedBy)
      && (filters.status === "All" || report.status === filters.status);
  });
  return filtered.sort((left, right) => filters.sort === "Oldest"
    ? left.date.localeCompare(right.date)
    : right.date.localeCompare(left.date));
}

export function getEnabledReportModules(access: OrganizationAccess) {
  return REPORT_MODULES.filter((module) => access[module.entitlement]);
}

function item(input: Omit<ReportLibraryItem, "module" | "moduleLabel" | "supportsPrint" | "supportsCsv" | "supportsExcel">): ReportLibraryItem {
  const type = REPORT_TYPES[input.reportTypeId];
  return {
    ...input,
    module: type.module,
    moduleLabel: getReportModule(type.module).label,
    supportsPrint: type.supportsPrint,
    supportsCsv: type.supportsCsv,
    supportsExcel: type.supportsExcel,
  };
}

function summaryItem(reportTypeId: ReportTypeId, plant: string | undefined, now: Date) {
  const type = REPORT_TYPES[reportTypeId];
  const reference = `OPS-${reportTypeId.replace(/[a-z]/g, "").slice(0, 8)}-${formatDateId(now)}`;
  return item({
    id: `summary:${reportTypeId}`,
    reportTypeId,
    title: type.label,
    reference,
    plant: plant ?? "All Plants",
    zone: "All Zones",
    generatedBy: "OPS",
    date: now.toISOString(),
    status: "Final",
    previewHref: `/reports/summary/${reportTypeId}`,
    sourceHref: sourceRoute(type.module),
  });
}

function sourceRoute(module: ReportModuleId) {
  return {
    audit: "/audits",
    actions: "/actions",
    continuousImprovement: "/continuous-improvement",
    redFlag: "/red-flag",
    visualManagement: "/visual-management/meetings",
    visualImprovement: "/visual-improvement",
    gemba: "/gemba",
  }[module];
}

function formatDateId(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}
