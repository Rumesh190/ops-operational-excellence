import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { ContinuousImprovement } from "@/features/five-s/continuous-improvement/types";
import type { GembaState } from "@/features/gemba/types";
import type { RedFlag } from "@/features/red-flag/types";
import { isRedFlagOverdue } from "@/features/red-flag/red-flag-store";
import { getVisualManagementMetrics } from "@/features/visual-management/visual-management-store";
import type { VisualManagementState } from "@/features/visual-management/types";
import { inferActionSourceModule } from "@/lib/actions/action-config";
import type { DemoUser } from "@/lib/current-user";
import type { AccessCapabilityId, OperationalModuleId } from "@/lib/modules";

export type OpsDashboardPeriod = "7d" | "30d" | "90d" | "6m" | "12m";
export type DashboardTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface OpsDashboardFilters {
  plant: string;
  zone: string;
  period: OpsDashboardPeriod;
}

export interface OpsDashboardInput {
  audits: FiveSAudit[];
  actions: MyAction[];
  improvements: ContinuousImprovement[];
  redFlags: RedFlag[];
  gemba?: GembaState;
  visualManagement?: VisualManagementState;
  access: Record<AccessCapabilityId, boolean>;
  currentUser: DemoUser;
  filters: OpsDashboardFilters;
  now?: Date;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: DashboardTone;
  lead?: boolean;
  href?: string;
}

export interface DashboardAttentionItem {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: Exclude<DashboardTone, "neutral" | "success">;
  moduleId: OperationalModuleId | "actions";
}

export interface DashboardWorkItem {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  tone: DashboardTone;
  moduleId: OperationalModuleId | "actions";
}

export interface DashboardModuleHealth {
  id: OperationalModuleId;
  label: string;
  primary: string;
  secondary: string;
  href: string;
  tone: DashboardTone;
}

export interface DashboardActionSource {
  id: OperationalModuleId;
  label: string;
  value: number;
  href: string;
}

export interface DashboardActivity {
  id: string;
  moduleId: OperationalModuleId | "actions";
  text: string;
  user: string;
  at: string;
  href: string;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface OpsDashboardModel {
  operationalScore: number;
  scoreBasis: string;
  primaryKpis: DashboardKpi[];
  secondaryKpis: DashboardKpi[];
  attention: DashboardAttentionItem[];
  myWork: DashboardWorkItem[];
  moduleHealth: DashboardModuleHealth[];
  actionStats: { open: number; overdue: number; awaitingReview: number; completed: number };
  actionSources: DashboardActionSource[];
  performanceTrend: DashboardTrendPoint[];
  trendChange: number;
  activity: DashboardActivity[];
  plants: string[];
  zones: string[];
}

const CLOSED_ACTION_STATUS = "Completed";
const REVIEW_ACTION_STATUSES = new Set(["Pending Review", "Pending Auditor Review", "Awaiting Review"]);
const ACTIVE_IMPROVEMENT_STATUSES = new Set(["submitted", "under_review", "approved", "on_hold", "in_progress", "awaiting_completion_review"]);

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function dateValue(value?: string) {
  if (!value) return 0;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinPeriod(value: string | undefined, period: OpsDashboardPeriod, now: Date) {
  const timestamp = dateValue(value);
  if (!timestamp) return false;
  const start = new Date(now);
  if (period === "7d") start.setDate(start.getDate() - 7);
  if (period === "30d") start.setDate(start.getDate() - 30);
  if (period === "90d") start.setDate(start.getDate() - 90);
  if (period === "6m") start.setMonth(start.getMonth() - 6);
  if (period === "12m") start.setFullYear(start.getFullYear() - 1);
  return timestamp >= start.getTime() && timestamp <= now.getTime();
}

function isSameMonth(value: string | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function matchesScope(plant: string, zone: string, filters: OpsDashboardFilters) {
  return (filters.plant === "All" || plant === filters.plant) && (filters.zone === "All" || zone === filters.zone);
}

function actionIsOverdue(action: MyAction, now: Date) {
  return action.status === "Overdue" || (action.status !== CLOSED_ACTION_STATUS && dateValue(action.dueDate) < now.getTime());
}

function averageAuditScore(audits: FiveSAudit[]) {
  const maximum = audits.reduce((sum, audit) => sum + audit.maxScore, 0);
  if (!maximum) return 0;
  return Math.round((audits.reduce((sum, audit) => sum + audit.score, 0) / maximum) * 100);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function auditDate(audit: FiveSAudit) {
  return audit.completedAt ?? audit.startedAt ?? audit.dueDate;
}

function calculateOperationalScore(parts: Array<{ value: number; weight: number; label: string }>) {
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (!totalWeight) return { value: 0, basis: "No enabled operational modules" };
  const value = Math.round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight);
  return { value: clamp(value), basis: parts.map((part) => part.label).join(" · ") };
}

function buildActualTrend(audits: FiveSAudit[]) {
  const months = new Map<string, { label: string; score: number; maximum: number }>();
  for (const audit of audits) {
    const date = new Date(auditDate(audit));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = months.get(key) ?? { label: date.toLocaleDateString("en-US", { month: "short" }), score: 0, maximum: 0 };
    current.score += audit.score;
    current.maximum += audit.maxScore;
    months.set(key, current);
  }
  return Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, item]) => ({
    label: item.label,
    value: item.maximum ? Math.round((item.score / item.maximum) * 100) : 0,
  }));
}

export function getOpsDashboardFilterOptions(input: Pick<OpsDashboardInput, "audits" | "actions" | "improvements" | "redFlags" | "gemba" | "visualManagement">) {
  const plants = new Set<string>();
  const zones = new Set<string>();
  input.audits.forEach((item) => { plants.add(item.plant); zones.add(item.area); });
  input.actions.forEach((item) => { plants.add(item.plant); zones.add(item.area); });
  input.improvements.forEach((item) => { plants.add(item.plant); zones.add(item.zone); });
  input.redFlags.forEach((item) => { plants.add(item.plant); zones.add(item.zone); });
  input.gemba?.walks.forEach((item) => { plants.add(item.plant); zones.add(item.zone); });
  input.visualManagement?.boards.forEach((item) => { plants.add(item.plant); if (item.zone) zones.add(item.zone); });
  return { plants: Array.from(plants).sort(), zones: Array.from(zones).sort() };
}

export function buildOpsDashboardModel(input: OpsDashboardInput): OpsDashboardModel {
  const now = input.now ?? new Date();
  const { access, filters, currentUser } = input;
  const actionTab = currentUser.role.includes("Member") ? "my-actions" : "team-actions";
  const actionHref = (status?: string) => `/actions?tab=${actionTab}${status ? `&status=${status}` : ""}`;
  const options = getOpsDashboardFilterOptions(input);

  const scopedAudits = input.audits.filter((audit) => matchesScope(audit.plant, audit.area, filters));
  const periodAudits = scopedAudits.filter((audit) => isWithinPeriod(auditDate(audit), filters.period, now));
  const scopedActions = input.actions.filter((action) => matchesScope(action.plant, action.area, filters));
  const periodActions = scopedActions.filter((action) => isWithinPeriod(action.completedAt ?? action.createdAt, filters.period, now));
  const scopedImprovements = input.improvements.filter((item) => matchesScope(item.plant, item.zone, filters));
  const periodImprovements = scopedImprovements.filter((item) => isWithinPeriod(item.completedAt ?? item.createdAt, filters.period, now));
  const scopedRedFlags = input.redFlags.filter((item) => matchesScope(item.plant, item.zone, filters));
  const scopedGembaWalks = (input.gemba?.walks ?? []).filter((walk) => matchesScope(walk.plant, walk.zone, filters));
  const scopedGembaIds = new Set(scopedGembaWalks.map((walk) => walk.id));
  const scopedGembaObservations = (input.gemba?.observations ?? []).filter((observation) => scopedGembaIds.has(observation.gembaId));
  const periodGembaWalks = scopedGembaWalks.filter((walk) => isWithinPeriod(walk.completedAt ?? walk.startedAt ?? walk.scheduledDate, filters.period, now));
  const periodGembaIds = new Set(periodGembaWalks.map((walk) => walk.id));
  const periodGembaObservations = scopedGembaObservations.filter((observation) => periodGembaIds.has(observation.gembaId));
  const gembaIssues = periodGembaObservations.filter((observation) => observation.type === "Issue");
  const gembaIssuesWithoutActions = scopedGembaObservations.filter((observation) => observation.type === "Issue" && !observation.actionId && !observation.noActionReason);
  const gembaActionCount = scopedActions.filter((action) => action.sourceModule === "gemba" || action.source === "Gemba").length;
  const visualManagementActions = scopedActions.filter((action) => action.sourceModule === "visualManagement" || action.source === "Visual Management");
  const visualManagementMetrics = input.visualManagement ? getVisualManagementMetrics(input.visualManagement, scopedActions, now) : undefined;
  const scopedVisualBoards = (input.visualManagement?.boards ?? []).filter((board) => matchesScope(board.plant, board.zone ?? "All", filters));
  const scopedVisualBoardIds = new Set(scopedVisualBoards.map((board) => board.id));
  const visualMeetings = (input.visualManagement?.meetings ?? []).filter((meeting) => scopedVisualBoardIds.has(meeting.boardId) && isWithinPeriod(meeting.completedAt ?? meeting.startedAt, filters.period, now));
  const visualEscalations = (input.visualManagement?.escalations ?? []).filter((item) => scopedVisualBoardIds.has(item.sourceBoardId) || scopedVisualBoardIds.has(item.targetBoardId));
  const visualRedKpis = scopedVisualBoards.flatMap((board) => board.sections).filter((entry) => entry.status === "Red").length;

  const completedAudits = periodAudits.filter((audit) => audit.status === "Completed");
  const auditScore = averageAuditScore(completedAudits);
  const openActions = scopedActions.filter((action) => action.status !== CLOSED_ACTION_STATUS);
  const overdueActions = openActions.filter((action) => actionIsOverdue(action, now));
  const actionsAwaitingReview = openActions.filter((action) => REVIEW_ACTION_STATUSES.has(action.status));
  const completedActions = periodActions.filter((action) => action.status === CLOSED_ACTION_STATUS);
  const actionStats = {
    open: openActions.length,
    overdue: overdueActions.length,
    awaitingReview: actionsAwaitingReview.length,
    completed: completedActions.length,
  };

  const activeOperationalRedFlags = scopedRedFlags.filter((flag) => flag.status !== "Closed" && flag.status !== "Cancelled");
  const activeRedFlagCount = activeOperationalRedFlags.length;
  const overdueRedFlagCount = activeOperationalRedFlags.filter((flag) => isRedFlagOverdue(flag, now)).length;
  const criticalRedFlagCount = activeOperationalRedFlags.filter((flag) => flag.severity === "Critical").length;
  const awaitingRedFlagCount = activeOperationalRedFlags.filter((flag) => flag.status === "Awaiting Closure").length;
  const last30Start = new Date(now.getTime() - 30 * 86_400_000);
  const previous30Start = new Date(now.getTime() - 60 * 86_400_000);
  const redFlagsLast30 = scopedRedFlags.filter((flag) => new Date(flag.raisedAt) >= last30Start).length;
  const redFlagsPrevious30 = scopedRedFlags.filter((flag) => new Date(flag.raisedAt) >= previous30Start && new Date(flag.raisedAt) < last30Start).length;
  const redFlagTrend = redFlagsLast30 - redFlagsPrevious30;
  const activeImprovements = scopedImprovements.filter((item) => ACTIVE_IMPROVEMENT_STATUSES.has(item.status));
  const completedImprovements = periodImprovements.filter((item) => item.status === "completed");
  const improvementsThisMonth = scopedImprovements.filter((item) => item.status === "completed" && isSameMonth(item.completedAt, now));
  const completedSaving = periodImprovements.reduce((sum, item) => sum + (item.status === "completed" ? item.actualSaving ?? item.proposedSaving : 0), 0);

  const scoreParts: Array<{ value: number; weight: number; label: string }> = [];
  if (access.audit && completedAudits.length) scoreParts.push({ value: auditScore, weight: 45, label: "audit performance" });
  if (access.actions && scopedActions.length) scoreParts.push({ value: clamp(100 - actionStats.overdue * 5 - Math.max(0, actionStats.open - 8)), weight: 30, label: "action health" });
  if (access.redFlag && scopedRedFlags.length) scoreParts.push({ value: clamp(100 - activeRedFlagCount * 5 - overdueRedFlagCount * 8), weight: 15, label: "red-flag control" });
  if (access.continuousImprovement) {
    const total = activeImprovements.length + completedImprovements.length;
    if (total) scoreParts.push({ value: Math.round((completedImprovements.length / total) * 100), weight: 10, label: "improvement completion" });
  }
  if (access.visualManagement && input.visualManagement) scoreParts.push({ value: visualManagementMetrics?.meetingCompletionRate ?? 0, weight: 10, label: "tier-meeting completion" });
  const operationalScore = calculateOperationalScore(scoreParts);

  const hasOperationalScore = scoreParts.length > 0;
  const primaryKpis: DashboardKpi[] = [
    { id: "score", label: "Operational Score", value: hasOperationalScore ? `${operationalScore.value}%` : "—", detail: hasOperationalScore ? "Weighted operational health" : "No live metrics available", tone: hasOperationalScore ? operationalScore.value >= 80 ? "success" : operationalScore.value >= 65 ? "warning" : "danger" : "neutral", lead: true },
  ];
  if (access.actions) {
    primaryKpis.push(
      { id: "open-actions", label: "Open Actions", value: String(actionStats.open), detail: "Across enabled modules", tone: "warning", href: actionHref("open") },
      { id: "overdue-actions", label: "Overdue Actions", value: String(actionStats.overdue), detail: "Past due date", tone: actionStats.overdue ? "danger" : "success", href: actionHref("overdue") },
    );
  }
  if (access.redFlag) primaryKpis.push({ id: "active-red-flags", label: "Open Red Flags", value: String(activeRedFlagCount), detail: `${criticalRedFlagCount} critical · ${overdueRedFlagCount} past target`, tone: activeRedFlagCount ? "danger" : "success", href: "/red-flag?tab=red-flags" });
  if (access.continuousImprovement) primaryKpis.push({ id: "monthly-improvements", label: "Improvements This Month", value: String(improvementsThisMonth.length), detail: `${activeImprovements.length} currently active`, tone: "info", href: "/continuous-improvement?tab=completed" });

  const secondaryKpis: DashboardKpi[] = [];
  if (access.audit) secondaryKpis.push(
    { id: "audits-completed", label: "Audits Completed", value: String(completedAudits.length), detail: "Selected period", tone: "info" },
    { id: "audit-score", label: "Average Audit Score", value: completedAudits.length ? `${auditScore}%` : "—", detail: completedAudits.length ? "Completed audits" : "No completed audits in period", tone: completedAudits.length ? auditScore >= 80 ? "success" : auditScore >= 65 ? "warning" : "danger" : "neutral" },
  );
  const gembaIssueCount = gembaIssues.length;
  if (access.gemba) secondaryKpis.push(
    { id: "gemba-walks", label: "Gemba Walks", value: String(periodGembaWalks.length), detail: "Selected period", tone: "info", href: "/gemba?tab=walks" },
    { id: "gemba-observations", label: "Gemba Observations", value: String(periodGembaObservations.length), detail: "Selected period", tone: "info", href: "/gemba?tab=observations" },
    { id: "gemba-issues", label: "Gemba Issues", value: String(gembaIssueCount), detail: "Observed issues", tone: gembaIssueCount ? "warning" : "success", href: "/gemba?tab=observations" },
  );
  if (access.visualManagement && input.visualManagement) secondaryKpis.push(
    { id: "visual-management-meetings", label: "Meetings Today", value: String(visualManagementMetrics?.meetingsToday ?? 0), detail: `${visualMeetings.length} in selected period`, tone: "info", href: "/visual-management/meetings" },
    { id: "visual-management-escalations", label: "Open Escalations", value: String(visualEscalations.filter((item) => !["Resolved", "Returned"].includes(item.status)).length), detail: "Tier follow-up required", tone: visualEscalations.some((item) => !["Resolved", "Returned"].includes(item.status)) ? "danger" : "success", href: "/visual-management/escalations" },
    { id: "visual-management-red-kpis", label: "Red KPI Areas", value: String(visualRedKpis), detail: "Across visible boards", tone: visualRedKpis ? "danger" : "success", href: "/visual-management/boards" },
    { id: "visual-management-actions", label: "Actions from Meetings", value: String(visualManagementActions.length), detail: "Linked follow-up work", tone: "warning", href: "/actions?source=visualManagement" },
  );
  if (access.redFlag) secondaryKpis.push(
    { id: "critical-red-flags", label: "Critical Red Flags", value: String(criticalRedFlagCount), detail: "Open critical issues", tone: criticalRedFlagCount ? "danger" : "success", href: "/red-flag?tab=red-flags&severity=Critical" },
    { id: "awaiting-red-flag-closure", label: "Awaiting RF Closure", value: String(awaitingRedFlagCount), detail: "Action done; verify issue", tone: awaitingRedFlagCount ? "warning" : "success", href: "/red-flag?tab=awaiting-closure" },
    { id: "red-flag-trend", label: "Red Flag Trend", value: `${redFlagTrend > 0 ? "+" : ""}${redFlagTrend}`, detail: "Raised vs previous 30 days", tone: redFlagTrend > 0 ? "danger" : redFlagTrend < 0 ? "success" : "neutral", href: "/red-flag?tab=overview" },
  );
  if (access.actions) secondaryKpis.push({ id: "actions-closed", label: "Actions Closed", value: String(actionStats.completed), detail: "Selected period", tone: "success", href: "/actions?tab=completed" });

  const attention: DashboardAttentionItem[] = [];
  if (access.actions && actionStats.overdue) attention.push({ id: "attention-overdue", label: `${actionStats.overdue} overdue action${actionStats.overdue === 1 ? "" : "s"}`, detail: "Immediate follow-up required", href: actionHref("overdue"), tone: "danger", moduleId: "actions" });
  if (access.redFlag && activeRedFlagCount) attention.push({ id: "attention-red-flags", label: `${activeRedFlagCount} open red flag${activeRedFlagCount === 1 ? "" : "s"}`, detail: `${criticalRedFlagCount} critical · ${awaitingRedFlagCount} awaiting closure`, href: "/red-flag?tab=red-flags", tone: "danger", moduleId: "redFlag" });
  if (access.audit) {
    const pendingAudits = scopedAudits.filter((audit) => audit.status !== "Completed").length;
    if (pendingAudits) attention.push({ id: "attention-audits", label: `${pendingAudits} audit${pendingAudits === 1 ? "" : "s"} pending`, detail: "Draft or in progress", href: "/audits", tone: "warning", moduleId: "audit" });
  }
  if (access.continuousImprovement) {
    const pendingReview = scopedImprovements.filter((item) => ["submitted", "under_review", "on_hold", "awaiting_completion_review"].includes(item.status)).length;
    if (pendingReview) attention.push({ id: "attention-improvements", label: `${pendingReview} improvement${pendingReview === 1 ? "" : "s"} pending review`, detail: "Proposal or completion decision needed", href: "/continuous-improvement?tab=review", tone: "warning", moduleId: "continuousImprovement" });
  }
  const gembaWithoutActionCount = gembaIssuesWithoutActions.length;
  if (access.gemba && gembaWithoutActionCount) attention.push({ id: "attention-gemba", label: `${gembaWithoutActionCount} Gemba issue${gembaWithoutActionCount === 1 ? "" : "s"} without actions`, detail: "Review follow-up from the floor", href: "/gemba?tab=observations", tone: "info", moduleId: "gemba" });
  if (access.visualManagement && input.visualManagement) {
    const openVisualEscalations = visualEscalations.filter((item) => !["Resolved", "Returned"].includes(item.status));
    if (openVisualEscalations.length) attention.push({ id: "attention-visual-management", label: `${openVisualEscalations.length} open tier escalation${openVisualEscalations.length === 1 ? "" : "s"}`, detail: `${visualRedKpis} red KPI areas across boards`, href: "/visual-management/escalations", tone: "danger", moduleId: "visualManagement" });
  }

  const myWork: DashboardWorkItem[] = [];
  if (access.actions) {
    scopedActions.filter((action) => action.status !== CLOSED_ACTION_STATUS && (
      action.responsiblePersonId === currentUser.id || action.assignedTo === currentUser.name ||
      (action.auditor === currentUser.name && REVIEW_ACTION_STATUSES.has(action.status))
    )).forEach((action) => myWork.push({
      id: action.id,
      kind: REVIEW_ACTION_STATUSES.has(action.status) ? "Action Review" : "Action",
      title: action.title,
      detail: actionIsOverdue(action, now) ? "Overdue" : dateValue(action.dueDate) === dateValue(now.toISOString().slice(0, 10)) ? "Due today" : `Due ${action.dueDate}`,
      href: `/actions/${encodeURIComponent(action.id)}`,
      tone: actionIsOverdue(action, now) ? "danger" : REVIEW_ACTION_STATUSES.has(action.status) ? "warning" : "info",
      moduleId: "actions",
    }));
  }
  if (access.audit) scopedAudits.filter((audit) => audit.auditor === currentUser.name && audit.status !== "Completed").forEach((audit) => myWork.push({ id: audit.id, kind: "Audit", title: audit.title, detail: audit.status === "Draft" ? "Ready to start" : "In progress", href: "/audits", tone: "info", moduleId: "audit" }));
  if (access.continuousImprovement) scopedImprovements.filter((item) => (item.zoneLeaderId === currentUser.id && ["submitted", "under_review", "on_hold", "awaiting_completion_review"].includes(item.status)) || (item.memberIds.includes(currentUser.id) && item.status === "approved")).forEach((item) => { const review = item.status !== "approved"; myWork.push({ id: item.id, kind: review ? "Improvement Review" : "Improvement", title: item.title, detail: item.status === "approved" ? "Ready to start" : item.status === "awaiting_completion_review" ? "Completion review" : "Awaiting review", href: `/continuous-improvement/${item.id}${review ? "?tab=review" : ""}`, tone: "warning", moduleId: "continuousImprovement" }); });
  if (access.redFlag) scopedRedFlags.filter((flag) => flag.status !== "Closed" && (flag.raisedById === currentUser.id || (flag.status === "Awaiting Closure" && (currentUser.role.includes("Auditor") || currentUser.role.includes("Administrator"))))).forEach((flag) => myWork.push({ id: flag.id, kind: flag.status === "Awaiting Closure" ? "Red Flag Review" : "Red Flag", title: flag.title, detail: flag.status === "Awaiting Closure" ? "Verify closure" : flag.status, href: `/red-flag/${flag.id}`, tone: flag.severity === "Critical" ? "danger" : "warning", moduleId: "redFlag" }));
  if (access.visualManagement && input.visualManagement) input.visualManagement.meetings.filter((meeting) => meeting.status === "In Progress" && (meeting.lead.id === currentUser.id || meeting.participants.some((person) => person.id === currentUser.id))).forEach((meeting) => myWork.push({ id: meeting.id, kind: "Tier Meeting", title: input.visualManagement!.boards.find((board) => board.id === meeting.boardId)?.name ?? meeting.boardId, detail: "Meeting in progress", href: `/visual-management/boards/${meeting.boardId}/meeting`, tone: "info", moduleId: "visualManagement" }));

  const moduleHealth: DashboardModuleHealth[] = [];
  if (access.audit) moduleHealth.push({ id: "audit", label: "Audit", primary: completedAudits.length ? `${auditScore}% avg score` : "No completed audits", secondary: `${completedAudits.length} completed in period`, href: "/audits", tone: completedAudits.length ? auditScore >= 80 ? "success" : "warning" : "neutral" });
  if (access.continuousImprovement) moduleHealth.push({ id: "continuousImprovement", label: "Continuous Improvement", primary: `${activeImprovements.length} active`, secondary: `${money(completedSaving)} realized savings`, href: "/continuous-improvement?tab=improvements", tone: "info" });
  if (access.redFlag) moduleHealth.push({ id: "redFlag", label: "Red Flag", primary: `${activeRedFlagCount} open · ${criticalRedFlagCount} critical`, secondary: `${awaitingRedFlagCount} awaiting closure`, href: "/red-flag", tone: activeRedFlagCount ? "warning" : "success" });
  if (access.visualManagement && input.visualManagement) moduleHealth.push({ id: "visualManagement", label: "Visual Management", primary: `${visualMeetings.length} meetings · ${visualManagementMetrics?.meetingCompletionRate ?? 0}% completion`, secondary: `${visualRedKpis} red KPI areas · ${visualEscalations.filter((item) => !["Resolved", "Returned"].includes(item.status)).length} open escalations`, href: "/visual-management", tone: visualRedKpis ? "warning" : "success" });
  if (access.gemba) moduleHealth.push({ id: "gemba", label: "Gemba", primary: `${periodGembaWalks.length} walks · ${periodGembaObservations.length} observations`, secondary: `${gembaActionCount} converted to actions`, href: "/gemba", tone: "info" });

  const actionSources: DashboardActionSource[] = [];
  const sourceCount = (moduleId: OperationalModuleId) => openActions.filter((action) => inferActionSourceModule(action) === moduleId).length;
  if (access.audit) actionSources.push({ id: "audit", label: "Audit", value: sourceCount("audit"), href: `/actions?tab=${actionTab}&source=audit` });
  if (access.continuousImprovement) actionSources.push({ id: "continuousImprovement", label: "Continuous Improvement", value: sourceCount("continuousImprovement"), href: `/actions?tab=${actionTab}&source=continuousImprovement` });
  if (access.redFlag) actionSources.push({ id: "redFlag", label: "Red Flag", value: sourceCount("redFlag"), href: `/actions?tab=${actionTab}&source=redFlag` });
  if (access.visualManagement) actionSources.push({ id: "visualManagement", label: "Visual Management", value: sourceCount("visualManagement"), href: `/actions?tab=${actionTab}&source=visualManagement` });
  if (access.gemba) actionSources.push({ id: "gemba", label: "Gemba", value: sourceCount("gemba"), href: `/actions?tab=${actionTab}&source=gemba` });

  const activity: DashboardActivity[] = [];
  if (access.audit) periodAudits.filter((audit) => audit.status === "Completed" && audit.completedAt).forEach((audit) => activity.push({ id: `activity-${audit.id}`, moduleId: "audit", text: `Audit ${audit.id} completed`, user: audit.auditor, at: audit.completedAt!, href: "/audits" }));
  if (access.actions) periodActions.forEach((action) => activity.push({ id: `activity-${action.id}`, moduleId: "actions", text: `Action ${action.id} ${action.status === "Completed" ? "closed" : "updated"}`, user: action.completedByName ?? action.assignedTo ?? action.auditor ?? "OPS user", at: action.completedAt ?? action.createdAt, href: `/actions/${encodeURIComponent(action.id)}` }));
  if (access.redFlag) scopedRedFlags.forEach((flag) => { const latest = flag.activity.at(-1); activity.push({ id: `activity-${flag.id}-${latest?.id ?? "raised"}`, moduleId: "redFlag", text: `${flag.id} · ${latest?.label ?? "Red Flag raised"}`, user: latest?.actorName ?? flag.raisedByName, at: latest?.at ?? flag.raisedAt, href: `/red-flag/${flag.id}` }); });
  if (access.continuousImprovement) scopedImprovements.forEach((item) => {
    const event = item.timeline.at(-1);
    activity.push({ id: `activity-${item.id}`, moduleId: "continuousImprovement", text: `Improvement ${item.id} ${item.status === "completed" ? "completed" : item.status.replaceAll("_", " ")}`, user: event?.actorName ?? item.proposedByName, at: event?.at ?? item.createdAt, href: `/continuous-improvement/${item.id}` });
  });
  if (access.gemba && input.gemba) periodGembaWalks.forEach((walk) => {
    const latest = walk.activity.at(-1);
    if (latest) activity.push({ id: `activity-${walk.id}-${latest.id}`, moduleId: "gemba", text: `${walk.id} · ${latest.label}`, user: latest.userName, at: latest.at, href: `/gemba/${walk.id}` });
  });
  if (access.visualManagement && input.visualManagement) visualMeetings.forEach((meeting) => activity.push({ id: `activity-${meeting.id}`, moduleId: "visualManagement", text: `${meeting.id} · ${meeting.status === "Completed" ? "Meeting completed" : "Meeting started"}`, user: meeting.lead.name, at: meeting.completedAt ?? meeting.startedAt, href: `/visual-management/meetings/${meeting.id}` }));
  activity.sort((a, b) => dateValue(b.at) - dateValue(a.at));

  const performanceTrend = access.audit ? buildActualTrend(completedAudits) : [];
  const trendChange = performanceTrend.length > 1 ? performanceTrend.at(-1)!.value - performanceTrend.at(-2)!.value : 0;

  return {
    operationalScore: operationalScore.value,
    scoreBasis: operationalScore.basis,
    primaryKpis,
    secondaryKpis,
    attention: attention.slice(0, 5),
    myWork: myWork.sort((a, b) => (a.tone === "danger" ? -1 : 0) - (b.tone === "danger" ? -1 : 0)).slice(0, 4),
    moduleHealth,
    actionStats,
    actionSources,
    performanceTrend,
    trendChange,
    activity: activity.slice(0, 6),
    plants: options.plants,
    zones: options.zones,
  };
}
