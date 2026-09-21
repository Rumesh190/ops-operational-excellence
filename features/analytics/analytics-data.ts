import type { ContinuousImprovement } from "@/features/five-s/continuous-improvement/types";
import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { GembaObservation, GembaState, GembaWalk } from "@/features/gemba/types";
import type { RedFlag } from "@/features/red-flag/types";
import type { VisualImprovement } from "@/features/visual-improvement/types";
import { getVisualManagementMetrics as getVisualManagementSummary, meetingDurationMinutes } from "@/features/visual-management/visual-management-store";
import type { VisualManagementState } from "@/features/visual-management/types";
import type { AccessCapabilityId, OperationalModuleId } from "@/lib/modules";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "6m" | "12m";
export type AnalyticsDashboardId = "executive" | "audit" | "actions" | OperationalModuleId | "visualImprovement";
export type AnalyticsTone = "neutral" | "info" | "success" | "warning" | "danger";
export type AnalyticsChartKind = "line" | "bar" | "horizontal-bar" | "stacked-bar";
export type AnalyticsValueFormat = "number" | "percent" | "money" | "hours";
export type AnalyticsSeriesTone = "information" | "supporting" | "positive" | "warning" | "critical" | "secondary" | "attention";

export interface AnalyticsFilters {
  plant: string;
  zone: string;
  period: AnalyticsPeriod;
}

export interface AnalyticsInput {
  audits: readonly FiveSAudit[];
  actions: readonly MyAction[];
  improvements: readonly ContinuousImprovement[];
  redFlags: readonly RedFlag[];
  visualImprovements?: readonly VisualImprovement[];
  visualManagement?: VisualManagementState;
  gemba: GembaState;
  access: Record<AccessCapabilityId, boolean>;
  filters: AnalyticsFilters;
  now?: Date;
}

export interface AnalyticsDashboardOption {
  id: AnalyticsDashboardId;
  label: string;
}

export interface AnalyticsComparison {
  value: number;
  favorable: boolean;
  label: string;
}

export interface AnalyticsKpi {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AnalyticsTone;
  href?: string;
  comparison?: AnalyticsComparison;
}

export type AnalyticsChartPoint = Record<string, string | number | null>;

export interface AnalyticsChartSeries {
  key: string;
  label: string;
  tone: AnalyticsSeriesTone;
}

export interface AnalyticsChart {
  id: string;
  title: string;
  description: string;
  kind: AnalyticsChartKind;
  data: AnalyticsChartPoint[];
  series: AnalyticsChartSeries[];
  valueFormat?: AnalyticsValueFormat;
  emptyMessage: string;
  wide?: boolean;
}

export interface AnalyticsModulePerformance {
  id: OperationalModuleId | "actions";
  label: string;
  value: number | null;
  detail: string;
  href: string;
}

export interface AnalyticsTransformation {
  id: string;
  title: string;
  zone: string;
  beforeUrl: string;
  afterUrl: string;
  href: string;
}

export interface AnalyticsViewModel {
  id: AnalyticsDashboardId;
  label: string;
  description: string;
  kpiRows: AnalyticsKpi[][];
  charts: AnalyticsChart[];
  insight?: string;
  modulePerformance?: AnalyticsModulePerformance[];
  transformations?: AnalyticsTransformation[];
}

interface TimeBucket {
  start: number;
  end: number;
  label: string;
}

export interface AnalyticsSelectorContext {
  now: Date;
  access: Record<AccessCapabilityId, boolean>;
  filters: AnalyticsFilters;
  buckets: TimeBucket[];
  scopedAudits: FiveSAudit[];
  audits: FiveSAudit[];
  previousAudits: FiveSAudit[];
  scopedActions: MyAction[];
  actions: MyAction[];
  previousActions: MyAction[];
  scopedImprovements: ContinuousImprovement[];
  improvements: ContinuousImprovement[];
  previousImprovements: ContinuousImprovement[];
  scopedRedFlags: RedFlag[];
  redFlags: RedFlag[];
  previousRedFlags: RedFlag[];
  scopedVisualImprovements: VisualImprovement[];
  visualImprovements: VisualImprovement[];
  previousVisualImprovements: VisualImprovement[];
  scopedGembaWalks: GembaWalk[];
  gembaWalks: GembaWalk[];
  previousGembaWalks: GembaWalk[];
  scopedGembaObservations: GembaObservation[];
  gembaObservations: GembaObservation[];
  visualManagement: VisualManagementState;
}

export interface AnalyticsModel {
  dashboards: AnalyticsDashboardOption[];
  plants: string[];
  zones: string[];
  views: Partial<Record<AnalyticsDashboardId, AnalyticsViewModel>>;
}

const DAY = 86_400_000;
const CLOSED_ACTION_STATUS = "Completed";
const ACTIVE_CI_STATUSES = new Set(["approved", "in_progress", "awaiting_completion_review"]);
const ACTIVE_VISUAL_STATUSES = new Set(["Draft", "Planned", "In Progress", "Returned"]);

const DASHBOARD_OPTIONS: readonly AnalyticsDashboardOption[] = [
  { id: "executive", label: "Executive" },
  { id: "audit", label: "Audit" },
  { id: "gemba", label: "Gemba" },
  { id: "redFlag", label: "Red Flag" },
  { id: "continuousImprovement", label: "Continuous Improvement" },
  { id: "actions", label: "Actions" },
  { id: "visualManagement", label: "Visual Management" },
] as const;

function timestamp(value?: string) {
  if (!value) return 0;
  const result = new Date(value.includes("T") ? value : `${value}T00:00:00`).getTime();
  return Number.isNaN(result) ? 0 : result;
}

function auditDate(audit: FiveSAudit) {
  return audit.completedAt ?? audit.startedAt ?? audit.dueDate;
}

function actionDate(action: MyAction) {
  return action.completedAt ?? action.createdAt;
}

function improvementDate(item: ContinuousImprovement) {
  return item.completedAt ?? item.updatedAt ?? item.createdAt;
}

function visualDate(item: VisualImprovement) {
  return item.completedAt ?? item.updatedAt ?? item.createdAt;
}

function redFlagDate(item: RedFlag) {
  return item.closedAt ?? item.raisedAt;
}

function gembaDate(item: GembaWalk) {
  return item.completedAt ?? item.startedAt ?? item.scheduledDate;
}

function periodDuration(period: AnalyticsPeriod) {
  if (period === "7d") return 7 * DAY;
  if (period === "30d") return 30 * DAY;
  if (period === "90d") return 90 * DAY;
  if (period === "6m") return 183 * DAY;
  return 365 * DAY;
}

function createBuckets(period: AnalyticsPeriod, now: Date): TimeBucket[] {
  const end = now.getTime();
  if (period === "6m" || period === "12m") {
    const count = period === "6m" ? 6 : 12;
    return Array.from({ length: count }, (_, index) => {
      const monthOffset = index - count + 1;
      const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const next = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
      return {
        start: start.getTime(),
        end: Math.min(end, next.getTime() - 1),
        label: start.toLocaleDateString("en-US", { month: "short" }),
      };
    });
  }
  const count = period === "7d" ? 7 : 6;
  const duration = periodDuration(period);
  const width = duration / count;
  return Array.from({ length: count }, (_, index) => {
    const start = end - duration + index * width;
    const bucketEnd = index === count - 1 ? end : end - duration + (index + 1) * width - 1;
    return {
      start,
      end: bucketEnd,
      label: new Date(bucketEnd).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
    };
  });
}

function within(value: string | undefined, start: number, end: number) {
  const date = timestamp(value);
  return date > 0 && date >= start && date <= end;
}

function matchesScope(plant: string, zone: string, filters: AnalyticsFilters) {
  return (filters.plant === "All" || plant === filters.plant) && (filters.zone === "All" || zone === filters.zone);
}

function actionModule(action: MyAction): OperationalModuleId | "redTag" | "visualImprovement" | "manual" {
  if (action.sourceModule && action.sourceModule !== "manual") return action.sourceModule;
  if (action.source === "Continuous Improvement") return "continuousImprovement";
  if (action.source === "Red Flag") return "redFlag";
  if (action.source === "Visual Improvement") return "visualImprovement";
  if (action.source === "Gemba") return "gemba";
  if (action.source === "Audit" || action.source === "5S Audit") return "audit";
  return "manual";
}

function actionIsVisible(action: MyAction, access: Record<AccessCapabilityId, boolean>) {
  const moduleId = actionModule(action);
  if (moduleId === "manual") return true;
  if (moduleId === "redTag") return access.redFlag;
  return access[moduleId];
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function averageOrNull(values: number[]) {
  return values.length ? average(values) : null;
}

function auditScore(audit: FiveSAudit) {
  return audit.maxScore ? Math.round((audit.score / audit.maxScore) * 100) : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDuration(hours: number) {
  if (!hours) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function comparison(current: number, previous: number, favorableWhen: "up" | "down" = "up"): AnalyticsComparison | undefined {
  if (!previous) return undefined;
  const value = Math.round(((current - previous) / previous) * 100);
  return { value, favorable: favorableWhen === "up" ? value >= 0 : value <= 0, label: "vs previous period" };
}

function scoreComparison(current: number | null, previous: number | null): AnalyticsComparison | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  const value = Math.round(((current - previous) / previous) * 100);
  return { value, favorable: value >= 0, label: "vs previous period" };
}

function groupCount<T>(items: readonly T[], label: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = label(item) || "Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts, ([name, value]) => ({ label: name, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function groupAverage<T>(items: readonly T[], label: (item: T) => string, value: (item: T) => number) {
  const groups = new Map<string, number[]>();
  items.forEach((item) => {
    const key = label(item) || "Other";
    groups.set(key, [...(groups.get(key) ?? []), value(item)]);
  });
  return Array.from(groups, ([name, values]) => ({ label: name, value: average(values) })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function countSeries<T>(items: readonly T[], buckets: TimeBucket[], date: (item: T) => string | undefined, key = "value"): AnalyticsChartPoint[] {
  return buckets.map((bucket) => ({
    label: bucket.label,
    [key]: items.filter((item) => within(date(item), bucket.start, bucket.end)).length,
  }));
}

function averageSeries<T>(items: readonly T[], buckets: TimeBucket[], date: (item: T) => string | undefined, value: (item: T) => number, key = "value"): AnalyticsChartPoint[] {
  return buckets.map((bucket) => {
    const values = items.filter((item) => within(date(item), bucket.start, bucket.end)).map(value);
    return { label: bucket.label, [key]: values.length ? average(values) : null };
  });
}

function sumSeries<T>(items: readonly T[], buckets: TimeBucket[], date: (item: T) => string | undefined, value: (item: T) => number, key: string): AnalyticsChartPoint[] {
  return buckets.map((bucket) => ({
    label: bucket.label,
    [key]: items.filter((item) => within(date(item), bucket.start, bucket.end)).reduce((sum, item) => sum + value(item), 0),
  }));
}

function mergeSeries(...sets: AnalyticsChartPoint[][]) {
  return sets[0]?.map((point, index) => Object.assign({}, ...sets.map((set) => set[index]), { label: point.label })) ?? [];
}

function kpi(id: string, label: string, value: string | number, detail: string, tone: AnalyticsTone, href?: string, delta?: AnalyticsComparison): AnalyticsKpi {
  return { id, label, value: String(value), detail, tone, href, comparison: delta };
}

function chart(config: Omit<AnalyticsChart, "emptyMessage"> & { emptyMessage?: string }): AnalyticsChart {
  return { emptyMessage: "Not enough data to display this analysis yet.", ...config };
}

function isActionOverdue(action: MyAction, now: Date) {
  return action.status === "Overdue" || (action.status !== CLOSED_ACTION_STATUS && timestamp(action.dueDate) < now.getTime());
}

function redFlagOpen(flag: RedFlag) {
  return !["Closed", "Cancelled"].includes(flag.status);
}

function closureHours(start?: string, end?: string) {
  const from = timestamp(start);
  const to = timestamp(end);
  return from && to && to >= from ? (to - from) / 3_600_000 : 0;
}

function classifyRedFlag(flag: RedFlag) {
  const text = `${flag.title} ${flag.description}`.toLowerCase();
  if (/hydraulic|oil leak|oil seep|oil residue/.test(text)) return "Hydraulic leakage";
  if (/walkway|exit|aisle|obstruct/.test(text)) return "Access obstruction";
  if (/label|identification|unlabelled/.test(text)) return "Labelling";
  if (/guard|interlock/.test(text)) return "Machine guarding";
  if (/water|ingress|rain/.test(text)) return "Water ingress";
  return "Other";
}

function stageScore(status: string, scores: Record<string, number>, fallback = 50) {
  return scores[status] ?? fallback;
}

function actionScore(action: MyAction, now: Date) {
  if (isActionOverdue(action, now)) return 35;
  return stageScore(action.status, { Completed: 100, "Pending Review": 82, "Pending Auditor Review": 82, "Awaiting Review": 82, "In Progress": 68, Assigned: 58, Open: 52, "Awaiting Assignment": 42, "Rework Required": 38 });
}

function improvementScore(item: ContinuousImprovement) {
  return stageScore(item.status, { completed: 100, awaiting_completion_review: 86, in_progress: 74, approved: 66, under_review: 55, submitted: 48, on_hold: 35, draft: 30, rejected: 20 });
}

function redFlagScore(flag: RedFlag) {
  if (flag.status === "Closed") return 100;
  if (flag.status === "Awaiting Closure") return 82;
  if (flag.status === "In Progress") return 62;
  if (flag.status === "Action Created") return 52;
  return flag.severity === "Critical" ? 25 : flag.severity === "High" ? 38 : 48;
}

function gembaScore(walk: GembaWalk) {
  return stageScore(walk.status, { Completed: 100, "In Progress": 70, Draft: 45 });
}

export function getEnabledAnalyticsDashboards(access: Record<AccessCapabilityId, boolean>) {
  return DASHBOARD_OPTIONS.filter((option) => option.id === "executive" || access[option.id]);
}

export function createAnalyticsSelectorContext(input: AnalyticsInput): AnalyticsSelectorContext {
  const now = input.now ?? new Date();
  const duration = periodDuration(input.filters.period);
  const end = now.getTime();
  const start = end - duration;
  const previousStart = start - duration;
  const select = <T,>(items: T[], date: (item: T) => string | undefined) => ({
    current: items.filter((item) => within(date(item), start, end)),
    previous: items.filter((item) => within(date(item), previousStart, start - 1)),
  });

  const scopedAudits = input.audits.filter((item) => matchesScope(item.plant, item.area, input.filters));
  const scopedActions = input.actions.filter((item) => actionIsVisible(item, input.access) && matchesScope(item.plant, item.area, input.filters));
  const scopedImprovements = input.improvements.filter((item) => matchesScope(item.plant, item.zone, input.filters));
  const scopedRedFlags = input.redFlags.filter((item) => matchesScope(item.plant, item.zone, input.filters));
  const scopedVisualImprovements = (input.visualImprovements ?? []).filter((item) => matchesScope(item.plant, item.zone, input.filters));
  const scopedGembaWalks = input.gemba.walks.filter((item) => matchesScope(item.plant, item.zone, input.filters));
  const scopedWalkIds = new Set(scopedGembaWalks.map((item) => item.id));
  const scopedGembaObservations = input.gemba.observations.filter((item) => scopedWalkIds.has(item.gembaId));

  const auditSelection = select(scopedAudits, auditDate);
  const actionSelection = select(scopedActions, actionDate);
  const improvementSelection = select(scopedImprovements, improvementDate);
  const redFlagSelection = select(scopedRedFlags, redFlagDate);
  const visualSelection = select(scopedVisualImprovements, visualDate);
  const gembaSelection = select(scopedGembaWalks, gembaDate);
  const currentWalkIds = new Set(gembaSelection.current.map((item) => item.id));

  return {
    now, access: input.access, filters: input.filters, buckets: createBuckets(input.filters.period, now),
    scopedAudits, audits: auditSelection.current, previousAudits: auditSelection.previous,
    scopedActions, actions: actionSelection.current, previousActions: actionSelection.previous,
    scopedImprovements, improvements: improvementSelection.current, previousImprovements: improvementSelection.previous,
    scopedRedFlags, redFlags: redFlagSelection.current, previousRedFlags: redFlagSelection.previous,
    scopedVisualImprovements, visualImprovements: visualSelection.current, previousVisualImprovements: visualSelection.previous,
    scopedGembaWalks, gembaWalks: gembaSelection.current, previousGembaWalks: gembaSelection.previous,
    scopedGembaObservations, gembaObservations: scopedGembaObservations.filter((item) => currentWalkIds.has(item.gembaId)),
    visualManagement: input.visualManagement ?? { boards: [], meetings: [], topics: [], decisions: [], escalations: [] },
  };
}

function getFilterOptions(input: AnalyticsInput) {
  const plants = new Set<string>();
  const zones = new Set<string>();
  const add = (plant: string, zone: string) => {
    plants.add(plant);
    if (input.filters.plant === "All" || input.filters.plant === plant) zones.add(zone);
  };
  if (input.access.audit) input.audits.forEach((item) => add(item.plant, item.area));
  if (input.access.actions) input.actions.filter((item) => actionIsVisible(item, input.access)).forEach((item) => add(item.plant, item.area));
  if (input.access.continuousImprovement) input.improvements.forEach((item) => add(item.plant, item.zone));
  if (input.access.redFlag) input.redFlags.forEach((item) => add(item.plant, item.zone));
  if (input.access.visualManagement) input.visualManagement?.boards.forEach((item) => add(item.plant, item.zone ?? "All zones"));
  if (input.access.gemba) input.gemba.walks.forEach((item) => add(item.plant, item.zone));
  return { plants: Array.from(plants).sort(), zones: Array.from(zones).sort() };
}

function performanceForAudit(items: FiveSAudit[]) {
  return averageOrNull(items.filter((item) => item.status === "Completed").map(auditScore));
}

function performanceForActions(items: MyAction[], now: Date) {
  return averageOrNull(items.map((item) => actionScore(item, now)));
}

function performanceForImprovement(items: ContinuousImprovement[]) {
  return averageOrNull(items.map(improvementScore));
}

function performanceForRedFlags(items: RedFlag[]) {
  return averageOrNull(items.map(redFlagScore));
}

function performanceForGemba(items: GembaWalk[]) {
  return averageOrNull(items.map(gembaScore));
}

export function getExecutiveMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const currentModuleScores: AnalyticsModulePerformance[] = [];
  const previousScores: number[] = [];
  if (context.access.audit) {
    const value = performanceForAudit(context.audits);
    const previous = performanceForAudit(context.previousAudits);
    currentModuleScores.push({ id: "audit", label: "Audit", value, detail: value === null ? "No completed audits" : "Average compliance", href: "/audits" });
    if (previous !== null) previousScores.push(previous);
  }
  if (context.access.actions) {
    const value = performanceForActions(context.actions, context.now);
    const previous = performanceForActions(context.previousActions, context.now);
    currentModuleScores.push({ id: "actions", label: "Actions", value, detail: value === null ? "No action activity" : "Lifecycle health", href: "/actions" });
    if (previous !== null) previousScores.push(previous);
  }
  if (context.access.continuousImprovement) {
    const value = performanceForImprovement(context.improvements);
    const previous = performanceForImprovement(context.previousImprovements);
    currentModuleScores.push({ id: "continuousImprovement", label: "Continuous Improvement", value, detail: value === null ? "No improvement activity" : "Pipeline progress", href: "/continuous-improvement" });
    if (previous !== null) previousScores.push(previous);
  }
  if (context.access.redFlag) {
    const value = performanceForRedFlags(context.redFlags);
    const previous = performanceForRedFlags(context.previousRedFlags);
    currentModuleScores.push({ id: "redFlag", label: "Red Flag", value, detail: value === null ? "No Red Flag activity" : "Resolution health", href: "/red-flag" });
    if (previous !== null) previousScores.push(previous);
  }
  if (context.access.visualManagement) {
    const summary = getVisualManagementSummary(context.visualManagement, context.actions, context.now);
    const value = summary.meetingCompletionRate;
    currentModuleScores.push({ id: "visualManagement", label: "Visual Management", value, detail: `${summary.openEscalations} open escalations`, href: "/visual-management" });
  }
  if (context.access.gemba) {
    const value = performanceForGemba(context.gembaWalks);
    const previous = performanceForGemba(context.previousGembaWalks);
    currentModuleScores.push({ id: "gemba", label: "Gemba", value, detail: value === null ? "No walks in period" : "Walk completion", href: "/gemba" });
    if (previous !== null) previousScores.push(previous);
  }

  const scoreValues = currentModuleScores.flatMap((item) => item.value === null ? [] : [item.value]);
  const operationalScore = averageOrNull(scoreValues);
  const previousOperationalScore = averageOrNull(previousScores);
  const openActions = context.actions.filter((item) => item.status !== CLOSED_ACTION_STATUS);
  const previousOpenActions = context.previousActions.filter((item) => item.status !== CLOSED_ACTION_STATUS);
  const overdueActions = openActions.filter((item) => isActionOverdue(item, context.now));
  const previousOverdueActions = previousOpenActions.filter((item) => isActionOverdue(item, context.now));
  const completedActions = context.actions.filter((item) => item.status === CLOSED_ACTION_STATUS);
  const completedAudits = context.audits.filter((item) => item.status === "Completed");
  const compliance = performanceForAudit(context.audits);
  const previousCompliance = performanceForAudit(context.previousAudits);
  const criticalFlags = context.redFlags.filter((item) => redFlagOpen(item) && item.severity === "Critical");
  const activeCi = context.improvements.filter((item) => ACTIVE_CI_STATUSES.has(item.status));
  const completedCi = context.improvements.filter((item) => item.status === "completed");
  const actualSavings = context.access.continuousImprovement ? completedCi.reduce((sum, item) => sum + (item.actualSaving ?? 0), 0) : 0;

  const primary = [
    kpi("operational-score", "Operational Score", operationalScore === null ? "—" : `${operationalScore}%`, operationalScore === null ? "Insufficient module data" : `${scoreValues.length} enabled data sources`, "info", undefined, scoreComparison(operationalScore, previousOperationalScore)),
  ];
  if (context.access.actions) {
    primary.push(kpi("open-actions", "Open Actions", openActions.length, "Across enabled sources", openActions.length ? "warning" : "success", "/actions?status=open", comparison(openActions.length, previousOpenActions.length, "down")));
    primary.push(kpi("overdue-actions", "Overdue Actions", overdueActions.length, "Past due and unresolved", overdueActions.length ? "danger" : "success", "/actions?status=overdue", comparison(overdueActions.length, previousOverdueActions.length, "down")));
  }
  if (context.access.audit) primary.push(kpi("audit-compliance", "Audit Compliance", compliance === null ? "—" : `${compliance}%`, `${completedAudits.length} completed audits`, "info", "/audits?status=Completed", scoreComparison(compliance, previousCompliance)));
  if (context.access.continuousImprovement) primary.push(kpi("actual-savings", "Actual Savings", formatMoney(actualSavings), "Verified completed value", "success"));

  const secondary: AnalyticsKpi[] = [];
  if (context.access.redFlag) secondary.push(kpi("critical-flags", "Critical Red Flags", criticalFlags.length, "Open critical issues", criticalFlags.length ? "danger" : "success", "/red-flag?tab=red-flags&severity=Critical"));
  if (context.access.continuousImprovement) {
    secondary.push(kpi("active-ci", "Active CI", activeCi.length, "Approved or in delivery", "info", "/continuous-improvement?tab=improvements"));
    secondary.push(kpi("completed-improvements", "Completed Improvements", completedCi.length, "CI completed in period", "success", "/continuous-improvement?tab=completed"));
  }
  if (context.access.gemba) secondary.push(kpi("gemba-observations", "Gemba Observations", context.gembaObservations.length, `${context.gembaWalks.length} walks in period`, "info", "/gemba"));
  if (context.access.visualManagement) {
    const visualSummary = getVisualManagementSummary(context.visualManagement, context.actions, context.now);
    secondary.push(kpi("visual-management-meetings", "Meetings Conducted", visualSummary.meetingsConducted, `${visualSummary.meetingCompletionRate}% completion rate`, "info", "/visual-management/meetings"));
    secondary.push(kpi("visual-management-escalations", "Open Escalations", visualSummary.openEscalations, `${visualSummary.redKpiCount} red KPI areas`, visualSummary.openEscalations ? "danger" : "success", "/visual-management/escalations"));
  }
  if (context.access.actions) secondary.push(kpi("actions-closed", "Actions Closed", completedActions.length, "Completed in selected period", "success", "/actions?tab=completed", comparison(completedActions.length, context.previousActions.filter((item) => item.status === CLOSED_ACTION_STATUS).length)));

  const scoreEvents: Array<{ date: string; value: number }> = [];
  if (context.access.audit) context.scopedAudits.filter((item) => item.status === "Completed").forEach((item) => scoreEvents.push({ date: auditDate(item), value: auditScore(item) }));
  if (context.access.actions) context.scopedActions.forEach((item) => scoreEvents.push({ date: actionDate(item), value: actionScore(item, context.now) }));
  if (context.access.continuousImprovement) context.scopedImprovements.forEach((item) => scoreEvents.push({ date: improvementDate(item), value: improvementScore(item) }));
  if (context.access.redFlag) context.scopedRedFlags.forEach((item) => scoreEvents.push({ date: redFlagDate(item), value: redFlagScore(item) }));
  if (context.access.gemba) context.scopedGembaWalks.forEach((item) => scoreEvents.push({ date: gembaDate(item), value: gembaScore(item) }));

  const ranked = currentModuleScores.filter((item) => item.value !== null).sort((a, b) => b.value! - a.value!);
  const insight = ranked.length ? `${ranked[0].label} is the strongest current contributor at ${ranked[0].value}%.` : "Not enough activity is available to identify a leading module yet.";

  return {
    id: "executive", label: "Executive", description: "Cross-module performance, value, and operational risk.", kpiRows: [primary, secondary].filter((row) => row.length),
    charts: [chart({ id: "operational-trend", title: "Operational Performance Trend", description: "Composite health from actual enabled-module activity.", kind: "line", data: averageSeries(scoreEvents, context.buckets, (item) => item.date, (item) => item.value), series: [{ key: "value", label: "Operational score", tone: "information" }], valueFormat: "percent", wide: true })],
    insight, modulePerformance: currentModuleScores,
  };
}

export function getActionMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const open = context.actions.filter((item) => item.status !== CLOSED_ACTION_STATUS);
  const overdue = open.filter((item) => isActionOverdue(item, context.now));
  const awaitingReview = open.filter((item) => ["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(item.status));
  const completed = context.actions.filter((item) => item.status === CLOSED_ACTION_STATUS);
  const closureTimes = completed.flatMap((item) => item.completedAt ? [closureHours(item.createdAt, item.completedAt)] : []).filter(Boolean);
  const sourceData = groupCount(context.actions, (item) => {
    const source = actionModule(item);
    return source === "continuousImprovement" ? "Continuous Improvement" : source === "redFlag" ? "Red Flag" : source === "visualManagement" ? "Visual Management" : source === "visualImprovement" ? "Legacy Improvement" : source === "gemba" ? "Gemba" : source === "audit" ? "Audit" : "Manual";
  });
  const statusData = groupCount(context.actions, (item) => item.status);
  const priorityData = groupCount(context.actions, (item) => item.priority);
  const zoneData = groupCount(open, (item) => item.area).slice(0, 7);
  const topZone = zoneData[0];
  return {
    id: "actions", label: "Actions", description: "Workload, closure performance, ownership, and source analysis.",
    kpiRows: [[
      kpi("actions-open", "Open Actions", open.length, "Currently unresolved", open.length ? "warning" : "success", "/actions?status=open"),
      kpi("actions-overdue", "Overdue", overdue.length, "Past due", overdue.length ? "danger" : "success", "/actions?status=overdue", comparison(overdue.length, context.previousActions.filter((item) => item.status !== CLOSED_ACTION_STATUS && isActionOverdue(item, context.now)).length, "down")),
      kpi("actions-review", "Awaiting Review", awaitingReview.length, "Pending completion decision", awaitingReview.length ? "warning" : "success", "/actions?tab=awaiting-review"),
      kpi("actions-closed", "Completed", completed.length, "Selected period", "success", "/actions?tab=completed", comparison(completed.length, context.previousActions.filter((item) => item.status === CLOSED_ACTION_STATUS).length)),
      kpi("closure-time", "Average Closure Time", formatDuration(average(closureTimes)), closureTimes.length ? `${closureTimes.length} completed actions` : "No closure data", "info"),
    ]],
    charts: [
      chart({ id: "actions-source", title: "Actions by Source", description: "Work generated by enabled OPS modules and manual entry.", kind: "bar", data: sourceData, series: [{ key: "value", label: "Actions", tone: "information" }], emptyMessage: "No action-source data for this selection." }),
      chart({ id: "actions-status", title: "Actions by Status", description: "Current lifecycle distribution.", kind: "horizontal-bar", data: statusData, series: [{ key: "value", label: "Actions", tone: "supporting" }], emptyMessage: "No action status data for this selection." }),
      chart({ id: "actions-closure-trend", title: "Action Closure Trend", description: "Actions completed through the selected period.", kind: "line", data: countSeries(context.scopedActions.filter((item) => item.status === CLOSED_ACTION_STATUS), context.buckets, actionDate), series: [{ key: "value", label: "Completed", tone: "positive" }], emptyMessage: "No completed-action trend is available." }),
      chart({ id: "actions-overdue-trend", title: "Overdue Trend", description: "Actions grouped by the date their due date passed.", kind: "line", data: countSeries(context.scopedActions.filter((item) => isActionOverdue(item, context.now)), context.buckets, (item) => item.dueDate), series: [{ key: "value", label: "Overdue", tone: "critical" }], emptyMessage: "No overdue actions in the selected period." }),
      chart({ id: "actions-priority", title: "Priority Breakdown", description: "Current urgency mix.", kind: "bar", data: priorityData, series: [{ key: "value", label: "Actions", tone: "warning" }], emptyMessage: "No priority data for this selection." }),
      chart({ id: "actions-zones", title: "Top Zones by Open Actions", description: "Where unresolved workload is concentrated.", kind: "horizontal-bar", data: zoneData, series: [{ key: "value", label: "Open actions", tone: "attention" }], emptyMessage: "No open actions by zone." }),
    ],
    insight: topZone ? `${topZone.label} has the highest open-action workload with ${topZone.value}.` : "There are no open actions in this selection.",
  };
}

export function getAuditMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const completed = context.audits.filter((item) => item.status === "Completed");
  const previousCompleted = context.previousAudits.filter((item) => item.status === "Completed");
  const averageScore = performanceForAudit(context.audits);
  const previousScore = performanceForAudit(context.previousAudits);
  const auditActions = context.actions.filter((item) => actionModule(item) === "audit");
  const openFindings = auditActions.filter((item) => item.status !== CLOSED_ACTION_STATUS);
  const zoneScores = groupAverage(completed, (item) => item.area, auditScore);
  const plantScores = groupAverage(completed, (item) => item.plant, auditScore);
  const nonCompliances = groupCount(auditActions, (item) => item.category ?? item.actionCategory ?? "Other").slice(0, 7);
  const trend = averageSeries(context.scopedAudits.filter((item) => item.status === "Completed"), context.buckets, auditDate, auditScore);
  const first = trend.flatMap((item) => typeof item.value === "number" ? [item.value] : []).at(0);
  const last = trend.flatMap((item) => typeof item.value === "number" ? [item.value] : []).at(-1);
  const insight = first !== undefined && last !== undefined && first !== last ? `Audit compliance ${last > first ? "improved" : "declined"} by ${Math.abs(last - first)} points across the visible trend.` : "More completed audit periods are needed to establish a compliance movement.";
  return {
    id: "audit", label: "Audit", description: "Compliance performance, findings, and completion trends.",
    kpiRows: [[
      kpi("audit-score", "Average Audit Score", averageScore === null ? "—" : `${averageScore}%`, `${completed.length} completed audits`, "info", "/audits?status=Completed", scoreComparison(averageScore, previousScore)),
      kpi("audits-completed", "Audits Completed", completed.length, "Selected period", "success", "/audits?status=Completed", comparison(completed.length, previousCompleted.length)),
      kpi("open-findings", "Open Findings", openFindings.length, "Audit-sourced actions", openFindings.length ? "warning" : "success", "/actions?source=audit&status=open"),
      kpi("audit-actions", "Actions Created", auditActions.length, "From Audit findings", "neutral", "/actions?source=audit"),
    ]],
    charts: [
      chart({ id: "audit-compliance", title: "Compliance Trend", description: "Average score from completed audits.", kind: "line", data: trend, series: [{ key: "value", label: "Compliance", tone: "information" }], valueFormat: "percent", emptyMessage: "Not enough completed audits to display a compliance trend." }),
      chart({ id: "audit-zone", title: "Audit Score by Zone", description: "Average completed score for each zone.", kind: "bar", data: zoneScores, series: [{ key: "value", label: "Score", tone: "supporting" }], valueFormat: "percent", emptyMessage: "No completed zone audits for this selection." }),
      chart({ id: "audit-plant", title: "Audit Score by Plant", description: "Compliance comparison between plants.", kind: "bar", data: plantScores, series: [{ key: "value", label: "Score", tone: "positive" }], valueFormat: "percent", emptyMessage: "No completed plant audits for this selection." }),
      chart({ id: "audit-non-compliance", title: "Top Non-Compliances", description: "Audit action categories generating the most work.", kind: "horizontal-bar", data: nonCompliances, series: [{ key: "value", label: "Findings", tone: "warning" }], emptyMessage: "No Audit non-compliance categories are available." }),
      chart({ id: "audit-completion", title: "Audit Completion Trend", description: "Completed audits over time.", kind: "line", data: countSeries(context.scopedAudits.filter((item) => item.status === "Completed"), context.buckets, auditDate), series: [{ key: "value", label: "Completed", tone: "positive" }], emptyMessage: "No completed audits in the selected period." }),
    ], insight,
  };
}

export function getContinuousImprovementMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const submitted = context.improvements.filter((item) => item.status !== "draft");
  const reviewed = context.improvements.filter((item) => ["approved", "rejected", "on_hold", "in_progress", "awaiting_completion_review", "completed"].includes(item.status));
  const approved = reviewed.filter((item) => !["rejected", "on_hold"].includes(item.status));
  const active = context.improvements.filter((item) => ACTIVE_CI_STATUSES.has(item.status));
  const completed = context.improvements.filter((item) => item.status === "completed");
  const proposed = context.improvements.reduce((sum, item) => sum + (item.proposedSaving ?? 0), 0);
  const actual = completed.reduce((sum, item) => sum + (item.actualSaving ?? 0), 0);
  const completedProposed = completed.reduce((sum, item) => sum + (item.proposedSaving ?? 0), 0);
  const completionDays = completed.flatMap((item) => item.completedAt ? [closureHours(item.createdAt, item.completedAt) / 24] : []).filter(Boolean);
  const savingTrend = mergeSeries(
    sumSeries(context.scopedImprovements, context.buckets, (item) => item.createdAt, (item) => item.proposedSaving ?? 0, "proposed"),
    sumSeries(context.scopedImprovements.filter((item) => item.status === "completed"), context.buckets, (item) => item.completedAt, (item) => item.actualSaving ?? 0, "actual"),
  );
  const savingsDelta = completedProposed ? Math.round(((actual - completedProposed) / completedProposed) * 100) : null;
  return {
    id: "continuousImprovement", label: "Continuous Improvement", description: "Idea flow, implementation progress, and realized value.",
    kpiRows: [[
      kpi("ci-submitted", "Ideas Submitted", submitted.length, "Excludes drafts", "info", "/continuous-improvement"),
      kpi("ci-approval", "Approval Rate", reviewed.length ? `${Math.round((approved.length / reviewed.length) * 100)}%` : "—", `${reviewed.length} reviewed ideas`, "success"),
      kpi("ci-active", "Active Improvements", active.length, "Approved and in delivery", "warning", "/continuous-improvement"),
      kpi("ci-completed", "Completed Improvements", completed.length, "Selected period", "success", "/continuous-improvement?tab=completed"),
      kpi("ci-proposed", "Proposed Savings", formatMoney(proposed), "Estimated opportunity", "neutral"),
      kpi("ci-actual", "Actual Savings", formatMoney(actual), "Verified completed value", "success"),
      kpi("ci-time", "Average Completion Time", completionDays.length ? `${average(completionDays)}d` : "—", completionDays.length ? `${completionDays.length} completed records` : "No closure data", "info"),
    ]],
    charts: [
      chart({ id: "ci-pipeline", title: "Pipeline by Stage", description: "Ideas across the improvement lifecycle.", kind: "horizontal-bar", data: groupCount(context.improvements, (item) => item.status.replaceAll("_", " ")), series: [{ key: "value", label: "Improvements", tone: "information" }], emptyMessage: "No improvement pipeline data for this selection." }),
      chart({ id: "ci-savings", title: "Savings Trend", description: "Proposed opportunity compared with verified actual savings.", kind: "line", data: savingTrend, series: [{ key: "proposed", label: "Proposed", tone: "secondary" }, { key: "actual", label: "Actual", tone: "positive" }], valueFormat: "money", emptyMessage: "No savings have been recorded in this period." }),
      chart({ id: "ci-zone", title: "Improvements by Zone", description: "Where improvement activity is originating.", kind: "bar", data: groupCount(context.improvements, (item) => item.zone), series: [{ key: "value", label: "Improvements", tone: "supporting" }], emptyMessage: "No improvement activity by zone." }),
      chart({ id: "ci-benefit", title: "Benefit Type Breakdown", description: "Expected benefit mix across submitted ideas.", kind: "horizontal-bar", data: groupCount(context.improvements, (item) => item.benefitType), series: [{ key: "value", label: "Ideas", tone: "attention" }], emptyMessage: "No benefit-type data for this selection." }),
    ],
    insight: savingsDelta === null ? "Savings insight will appear when proposed and actual values are available." : `Actual CI savings are ${Math.abs(savingsDelta)}% ${savingsDelta >= 0 ? "above" : "below"} proposed savings for completed work in this selection.`,
  };
}

export function getRedFlagMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const open = context.redFlags.filter(redFlagOpen);
  const critical = open.filter((item) => item.severity === "Critical");
  const awaiting = context.redFlags.filter((item) => item.status === "Awaiting Closure");
  const closed = context.redFlags.filter((item) => item.status === "Closed" && item.closedAt);
  const resolutionHours = closed.map((item) => closureHours(item.raisedAt, item.closedAt)).filter(Boolean);
  const actionsCreated = context.redFlags.filter((item) => item.actionId).length;
  const zoneData = groupCount(open, (item) => item.zone);
  const ageData = [
    { label: "< 24h", value: open.filter((item) => context.now.getTime() - timestamp(item.raisedAt) < DAY).length },
    { label: "1–3d", value: open.filter((item) => context.now.getTime() - timestamp(item.raisedAt) >= DAY && context.now.getTime() - timestamp(item.raisedAt) < 3 * DAY).length },
    { label: "3–7d", value: open.filter((item) => context.now.getTime() - timestamp(item.raisedAt) >= 3 * DAY && context.now.getTime() - timestamp(item.raisedAt) < 7 * DAY).length },
    { label: "> 7d", value: open.filter((item) => context.now.getTime() - timestamp(item.raisedAt) >= 7 * DAY).length },
  ];
  const openClosedTrend = mergeSeries(
    countSeries(context.scopedRedFlags, context.buckets, (item) => item.raisedAt, "opened"),
    countSeries(context.scopedRedFlags.filter((item) => item.status === "Closed"), context.buckets, (item) => item.closedAt, "closed"),
  );
  const topZone = zoneData[0];
  return {
    id: "redFlag", label: "Red Flag", description: "Operational risk, severity, response age, and resolution performance.",
    kpiRows: [[
      kpi("rf-open", "Open Red Flags", open.length, "Unresolved issues", open.length ? "danger" : "success", "/red-flag?tab=red-flags&status=Open"),
      kpi("rf-critical", "Critical", critical.length, "Open critical issues", critical.length ? "danger" : "success", "/red-flag?tab=red-flags&severity=Critical"),
      kpi("rf-awaiting", "Awaiting Closure", awaiting.length, "Ready for verification", "warning", "/red-flag?tab=awaiting-closure"),
      kpi("rf-resolution", "Average Resolution Time", formatDuration(average(resolutionHours)), resolutionHours.length ? `${resolutionHours.length} closed flags` : "No closure data", "info"),
      kpi("rf-actions", "Actions Created", actionsCreated, "Linked corrective work", "neutral", "/actions?source=redFlag"),
    ]],
    charts: [
      chart({ id: "rf-severity", title: "Severity Breakdown", description: "Urgency across unresolved Red Flags.", kind: "bar", data: groupCount(open, (item) => item.severity), series: [{ key: "value", label: "Open flags", tone: "critical" }], emptyMessage: "No open Red Flags in this selection." }),
      chart({ id: "rf-zone", title: "Red Flags by Zone", description: "Locations carrying the most unresolved risk.", kind: "horizontal-bar", data: zoneData, series: [{ key: "value", label: "Open flags", tone: "warning" }], emptyMessage: "No open Red Flags by zone." }),
      chart({ id: "rf-recurring", title: "Recurring Issue Types", description: "Deterministic themes found in issue descriptions.", kind: "horizontal-bar", data: groupCount(context.redFlags, classifyRedFlag).slice(0, 6), series: [{ key: "value", label: "Flags", tone: "attention" }], emptyMessage: "No recurring issue themes are available." }),
      chart({ id: "rf-flow", title: "Open vs Closed Trend", description: "Issues raised compared with verified closures.", kind: "stacked-bar", data: openClosedTrend, series: [{ key: "opened", label: "Raised", tone: "warning" }, { key: "closed", label: "Closed", tone: "positive" }], emptyMessage: "No Red Flag activity in the selected period." }),
      chart({ id: "rf-age", title: "Age Distribution", description: "How long unresolved issues have remained open.", kind: "bar", data: ageData, series: [{ key: "value", label: "Open flags", tone: "critical" }], emptyMessage: "No open Red Flags to age." }),
    ],
    insight: topZone ? `${topZone.label} has the highest number of open Red Flags (${topZone.value}).` : "There are no open Red Flags in this selection.",
  };
}

export function getVisualImprovementMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const active = context.visualImprovements.filter((item) => ACTIVE_VISUAL_STATUSES.has(item.status));
  const completed = context.visualImprovements.filter((item) => item.status === "Completed");
  const completedThisMonth = context.scopedVisualImprovements.filter((item) => {
    if (item.status !== "Completed" || !item.completedAt) return false;
    const date = new Date(item.completedAt);
    return date.getFullYear() === context.now.getFullYear() && date.getMonth() === context.now.getMonth();
  });
  const awaiting = context.visualImprovements.filter((item) => item.status === "Awaiting Review");
  const actual = completed.reduce((sum, item) => sum + (item.actualCostSaving ?? 0), 0);
  const proposed = completed.reduce((sum, item) => sum + (item.proposedCostSaving ?? 0), 0);
  const areas = new Set(completed.map((item) => `${item.plant}/${item.zone}/${item.location}`)).size;
  const transformations = [...completed, ...awaiting]
    .filter((item) => item.beforeEvidence[0]?.url && item.afterEvidence[0]?.url)
    .sort((a, b) => visualDate(b).localeCompare(visualDate(a)))
    .slice(0, 4)
    .map((item) => ({ id: item.id, title: item.title, zone: item.zone, beforeUrl: item.beforeEvidence[0].url, afterUrl: item.afterEvidence[0].url, href: `/visual-improvement/${encodeURIComponent(item.id)}` }));
  const savingTrend = sumSeries(context.scopedVisualImprovements.filter((item) => item.status === "Completed"), context.buckets, (item) => item.completedAt, (item) => item.actualCostSaving ?? 0, "value");
  const savingsDelta = proposed ? Math.round(((actual - proposed) / proposed) * 100) : null;
  return {
    id: "visualImprovement", label: "Visual Improvement", description: "Visible workplace change, completion, and realized benefit.",
    kpiRows: [[
      kpi("vi-active", "Active Improvements", active.length, "Draft through in progress", "warning", "/visual-improvement"),
      kpi("vi-completed", "Completed This Month", completedThisMonth.length, "Verified transformations", "success", "/visual-improvement"),
      kpi("vi-review", "Awaiting Review", awaiting.length, "Ready for verification", "info", "/visual-improvement"),
      kpi("vi-savings", "Actual Savings", formatMoney(actual), "Completed improvements", "success"),
      kpi("vi-areas", "Areas Improved", areas, "Distinct completed locations", "neutral"),
    ]],
    charts: [
      chart({ id: "vi-category", title: "Improvements by Category", description: "Where visible change is concentrated.", kind: "horizontal-bar", data: groupCount(context.visualImprovements, (item) => item.category), series: [{ key: "value", label: "Improvements", tone: "information" }], emptyMessage: "No category data for this selection." }),
      chart({ id: "vi-zone", title: "Improvements by Zone", description: "Distribution of visual work across zones.", kind: "bar", data: groupCount(context.visualImprovements, (item) => item.zone), series: [{ key: "value", label: "Improvements", tone: "supporting" }], emptyMessage: "No visual improvements by zone." }),
      chart({ id: "vi-completion", title: "Completed Trend", description: "Verified transformations over time.", kind: "line", data: countSeries(context.scopedVisualImprovements.filter((item) => item.status === "Completed"), context.buckets, (item) => item.completedAt), series: [{ key: "value", label: "Completed", tone: "positive" }], emptyMessage: "No completed transformations in this period." }),
      chart({ id: "vi-saving", title: "Savings Trend", description: "Verified cost saving from completed transformations.", kind: "line", data: savingTrend, series: [{ key: "value", label: "Actual saving", tone: "positive" }], valueFormat: "money", emptyMessage: "No verified savings in this period." }),
    ],
    insight: savingsDelta === null ? "Savings comparison will appear when proposed and actual values are available." : `Actual visual-improvement savings are ${Math.abs(savingsDelta)}% ${savingsDelta >= 0 ? "above" : "below"} proposed value for completed work.`,
    transformations,
  };
}

export function getVisualManagementAnalytics(input: AnalyticsInput): AnalyticsViewModel {
  const state = input.visualManagement ?? { boards: [], meetings: [], topics: [], decisions: [], escalations: [] };
  const now = input.now ?? new Date();
  const duration = periodDuration(input.filters.period);
  const periodStart = now.getTime() - duration;
  const boardIds = new Set(state.boards.filter((board) => matchesScope(board.plant, board.zone ?? "All zones", input.filters)).map((board) => board.id));
  const meetings = state.meetings.filter((meeting) => boardIds.has(meeting.boardId) && timestamp(meeting.completedAt ?? meeting.startedAt) >= periodStart && timestamp(meeting.completedAt ?? meeting.startedAt) <= now.getTime());
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));
  const scopedState: VisualManagementState = {
    boards: state.boards.filter((board) => boardIds.has(board.id)),
    meetings,
    topics: state.topics.filter((topic) => meetingIds.has(topic.meetingId)),
    decisions: state.decisions.filter((decision) => meetingIds.has(decision.meetingId)),
    escalations: state.escalations.filter((item) => boardIds.has(item.sourceBoardId) || boardIds.has(item.targetBoardId)),
  };
  const summary = getVisualManagementSummary(scopedState, input.actions, now);
  const boardMap = new Map(state.boards.map((board) => [board.id, board]));
  const buckets = createBuckets(input.filters.period, now);
  const completed = meetings.filter((meeting) => meeting.status === "Completed");
  const kpiStatusTrend = buckets.map((bucket) => {
    const entries = meetings.filter((meeting) => within(meeting.startedAt, bucket.start, bucket.end)).flatMap((meeting) => meeting.kpiEntries);
    return {
      label: bucket.label,
      green: entries.filter((entry) => entry.status === "Green").length,
      amber: entries.filter((entry) => entry.status === "Amber").length,
      red: entries.filter((entry) => entry.status === "Red").length,
    };
  });
  return {
    id: "visualManagement",
    label: "Visual Management",
    description: "Daily tier-meeting completion, KPI health, escalations, and action follow-through.",
    kpiRows: [[
      kpi("vm-conducted", "Meetings Conducted", summary.meetingsConducted, `${meetings.length} meeting records`, "info", "/visual-management/meetings"),
      kpi("vm-completion", "Meeting Completion Rate", `${summary.meetingCompletionRate}%`, "Completed meeting records", summary.meetingCompletionRate >= 85 ? "success" : "warning"),
      kpi("vm-escalations", "Open Escalations", summary.openEscalations, "Awaiting higher-tier resolution", summary.openEscalations ? "danger" : "success", "/visual-management/escalations"),
      kpi("vm-red-kpi", "Red KPI Areas", summary.redKpiCount, "Across active boards", summary.redKpiCount ? "danger" : "success", "/visual-management/boards"),
      kpi("vm-actions", "Actions from Meetings", summary.actionsFromMeetings, "Shared Action Center records", "warning", "/actions?source=visualManagement"),
      kpi("vm-duration", "Average Meeting Duration", `${summary.averageMeetingDuration} min`, "Completed meetings", "neutral"),
    ]],
    charts: [
      chart({ id: "vm-board-meetings", title: "Meetings by Board", description: "Meeting volume across tier boards.", kind: "horizontal-bar", data: groupCount(meetings, (meeting) => boardMap.get(meeting.boardId)?.name ?? meeting.boardId), series: [{ key: "value", label: "Meetings", tone: "information" }], emptyMessage: "No meetings in this selection." }),
      chart({ id: "vm-completion-status", title: "Meeting Completion", description: "Completed and active meeting records.", kind: "bar", data: groupCount(meetings, (meeting) => meeting.status), series: [{ key: "value", label: "Meetings", tone: "positive" }], emptyMessage: "No meeting status data." }),
      chart({ id: "vm-red-sections", title: "Red KPI Areas", description: "Current red condition by SQDCP section.", kind: "bar", data: groupCount(scopedState.boards.flatMap((board) => board.sections).filter((entry) => entry.status === "Red"), (entry) => entry.section), series: [{ key: "value", label: "Red areas", tone: "critical" }], emptyMessage: "No red KPI areas." }),
      chart({ id: "vm-escalation-status", title: "Escalation Status", description: "Current tier-escalation workload.", kind: "horizontal-bar", data: groupCount(scopedState.escalations, (item) => item.status), series: [{ key: "value", label: "Escalations", tone: "warning" }], emptyMessage: "No escalations in this selection." }),
      chart({ id: "vm-escalation-trend", title: "Escalation Trend", description: "Tier escalations raised through the selected period.", kind: "line", data: countSeries(scopedState.escalations, buckets, (item) => item.createdAt), series: [{ key: "value", label: "Escalations", tone: "warning" }], emptyMessage: "No escalation trend is available." }),
      chart({ id: "vm-kpi-status-trend", title: "KPI Status Trend", description: "Green, amber, and red KPI entries recorded in meetings.", kind: "line", data: kpiStatusTrend, series: [{ key: "green", label: "Green", tone: "positive" }, { key: "amber", label: "Amber", tone: "warning" }, { key: "red", label: "Red", tone: "critical" }], emptyMessage: "No KPI status trend is available." }),
      chart({ id: "vm-meeting-trend", title: "Meeting Trend", description: "Meetings started through the selected period.", kind: "line", data: countSeries(meetings, buckets, (meeting) => meeting.startedAt), series: [{ key: "value", label: "Meetings", tone: "information" }], emptyMessage: "No meeting trend is available." }),
      chart({ id: "vm-duration-tier", title: "Average Duration by Tier", description: "Average completed meeting length.", kind: "bar", data: ["Tier 1", "Tier 2", "Tier 3"].map((tier) => { const values = completed.filter((meeting) => meeting.tier === tier).map((meeting) => meetingDurationMinutes(meeting, now)); return { label: tier, value: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0 }; }), series: [{ key: "value", label: "Minutes", tone: "supporting" }], emptyMessage: "No completed meeting duration data." }),
    ],
    insight: summary.openEscalations ? `${summary.openEscalations} escalation${summary.openEscalations === 1 ? " is" : "s are"} awaiting higher-tier resolution.` : "No tier escalations are currently open.",
  };
}

export function getGembaMetrics(context: AnalyticsSelectorContext): AnalyticsViewModel {
  const observations = context.gembaObservations;
  const positive = observations.filter((item) => item.type === "Positive");
  const issues = observations.filter((item) => item.type === "Issue");
  const opportunities = observations.filter((item) => item.type === "Opportunity");
  const actions = observations.filter((item) => item.actionId);
  const actionsByZone = groupCount(actions, (item) => context.scopedGembaWalks.find((walk) => walk.id === item.gembaId)?.zone ?? "Unknown");
  const topArea = groupCount(observations, (item) => item.location)[0];
  return {
    id: "gemba", label: "Gemba", description: "Walk participation, observation patterns, and action conversion.",
    kpiRows: [[
      kpi("gemba-walks", "Gemba Walks", context.gembaWalks.length, "Selected period", "info", "/gemba"),
      kpi("gemba-observations", "Observations", observations.length, "Captured during walks", "neutral", "/gemba"),
      kpi("gemba-positive", "Positive Observations", positive.length, "Practices to sustain", "success"),
      kpi("gemba-issues", "Issues", issues.length, "Conditions requiring attention", issues.length ? "danger" : "success"),
      kpi("gemba-opportunities", "Opportunities", opportunities.length, "Potential improvements", "warning"),
      kpi("gemba-actions", "Actions Created", actions.length, "Converted observations", "info", "/actions?source=gemba"),
    ]],
    charts: [
      chart({ id: "gemba-types", title: "Observation Type Breakdown", description: "Positive practice, opportunity, and issue mix.", kind: "bar", data: groupCount(observations, (item) => item.type), series: [{ key: "value", label: "Observations", tone: "information" }], emptyMessage: "No observations in the selected period." }),
      chart({ id: "gemba-zones", title: "Walks by Zone", description: "Where leaders are spending time at the workplace.", kind: "bar", data: groupCount(context.gembaWalks, (item) => item.zone), series: [{ key: "value", label: "Walks", tone: "supporting" }], emptyMessage: "No Gemba walks by zone." }),
      chart({ id: "gemba-actions", title: "Actions from Gemba", description: "Observation-to-action conversion by zone.", kind: "horizontal-bar", data: actionsByZone, series: [{ key: "value", label: "Actions", tone: "warning" }], emptyMessage: "No Gemba observations were converted to actions." }),
      chart({ id: "gemba-trend", title: "Observation Trend", description: "Observations captured over time.", kind: "line", data: countSeries(context.scopedGembaObservations, context.buckets, (item) => item.createdAt), series: [{ key: "value", label: "Observations", tone: "information" }], emptyMessage: "No observation trend is available." }),
      chart({ id: "gemba-areas", title: "Top Recurring Observation Areas", description: "Physical locations observed most often.", kind: "horizontal-bar", data: groupCount(observations, (item) => item.location).slice(0, 7), series: [{ key: "value", label: "Observations", tone: "attention" }], emptyMessage: "No recurring observation areas are available." }),
    ],
    insight: topArea ? `${topArea.label} is the most frequently observed area with ${topArea.value} observation${topArea.value === 1 ? "" : "s"}.` : "No observation-area pattern is available yet.",
  };
}

export function buildAnalyticsModel(input: AnalyticsInput): AnalyticsModel {
  const context = createAnalyticsSelectorContext(input);
  const dashboards = getEnabledAnalyticsDashboards(input.access);
  const views: Partial<Record<AnalyticsDashboardId, AnalyticsViewModel>> = {
    executive: getExecutiveMetrics(context),
  };
  if (input.access.audit) views.audit = getAuditMetrics(context);
  if (input.access.actions) views.actions = getActionMetrics(context);
  if (input.access.continuousImprovement) views.continuousImprovement = getContinuousImprovementMetrics(context);
  if (input.access.redFlag) views.redFlag = getRedFlagMetrics(context);
  if (input.access.visualManagement) views.visualManagement = getVisualManagementAnalytics(input);
  if (input.access.gemba) views.gemba = getGembaMetrics(context);
  return { dashboards, ...getFilterOptions(input), views };
}

function chartFrom(model: AnalyticsModel, view: AnalyticsDashboardId, id: string) {
  return model.views[view]?.charts.find((item) => item.id === id);
}

/** Composes existing analytics selectors into the unified Dashboard Performance view. */
export function buildUnifiedPerformanceView(model: AnalyticsModel): AnalyticsViewModel {
  const executive = model.views.executive!;
  const charts = [
    chartFrom(model, "executive", "operational-trend"),
    chartFrom(model, "audit", "audit-plant"),
    chartFrom(model, "audit", "audit-zone"),
    chartFrom(model, "audit", "audit-compliance"),
    chartFrom(model, "actions", "actions-closure-trend"),
    chartFrom(model, "continuousImprovement", "ci-savings"),
    chartFrom(model, "redFlag", "rf-flow"),
    chartFrom(model, "gemba", "gemba-trend"),
    chartFrom(model, "visualManagement", "vm-meeting-trend"),
  ].filter((item): item is AnalyticsChart => Boolean(item));
  return {
    ...executive,
    label: "Performance",
    description: "Cross-module trends, comparisons, value, and operational risk.",
    charts,
    modulePerformance: executive.modulePerformance?.map((item) => ({
      ...item,
      href: `/dashboard?view=modules&module=${item.id}`,
    })),
  };
}
