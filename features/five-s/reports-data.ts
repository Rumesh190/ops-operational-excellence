import { inferActionSourceModule } from "@/lib/actions/action-config";
import { ACTION_LIFECYCLE_STAGES, getActionLifecycleStage } from "@/lib/five-s/lifecycle-status";
import { FIVE_S_ZONE_CONFIGURATION } from "@/lib/five-s/configuration";
import type { FiveSAudit } from "./types/five-s";
import type { MyAction } from "./types/my-actions";

export interface FiveSReportPeriod {
  from: string;
  to: string;
}

function dateOnly(value?: string) {
  return value?.slice(0, 10) ?? "";
}

export function isInReportPeriod(value: string | undefined, period: FiveSReportPeriod) {
  const candidate = dateOnly(value);
  return Boolean(candidate) && (!period.from || candidate >= period.from) && (!period.to || candidate <= period.to);
}

function auditDate(audit: FiveSAudit) {
  return audit.completedAt ?? audit.startedAt ?? audit.dueDate;
}

function auditScore(audit: FiveSAudit) {
  return audit.maxScore ? Math.round((audit.score / audit.maxScore) * 100) : 0;
}

function monthKey(value?: string) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    key: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`,
    label: parsed.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  };
}

export function isCorrectiveAction(action: MyAction) {
  return inferActionSourceModule(action) !== "manual";
}

export function isActionRelatedToAudit(action: MyAction, audit: FiveSAudit) {
  return inferActionSourceModule(action) === "audit" && (action.auditId === audit.id || action.sourceId === audit.id);
}

export function buildFiveSReportData(audits: FiveSAudit[], actions: MyAction[], period: FiveSReportPeriod) {
  const completedAudits = audits.filter((audit) => audit.status === "Completed" && isInReportPeriod(auditDate(audit), period));
  const actionsCreated = actions.filter((action) => isInReportPeriod(action.createdAt, period));
  const correctiveActions = actionsCreated.filter(isCorrectiveAction);
  const completedActions = actions.filter((action) => action.status === "Completed" && isInReportPeriod(action.completedAt, period));
  const completedCorrectiveActions = completedActions.filter(isCorrectiveAction);

  const score = completedAudits.length
    ? Math.round(completedAudits.reduce((sum, audit) => sum + auditScore(audit), 0) / completedAudits.length)
    : null;
  const totalSaving = completedCorrectiveActions.reduce((sum, action) => sum + (action.costSaving ?? 0), 0);
  const closedFromCreated = correctiveActions.filter((action) => action.status === "Completed").length;
  const closureRate = correctiveActions.length ? Math.round((closedFromCreated / correctiveActions.length) * 100) : 0;
  const durations = completedCorrectiveActions.flatMap((action) => action.completedAt
    ? [Math.max(0, (new Date(action.completedAt).getTime() - new Date(action.createdAt).getTime()) / 86_400_000)]
    : []);
  const avgDays = durations.length ? (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1) : "—";

  const auditBuckets = new Map<string, { label: string; sum: number; count: number }>();
  completedAudits.forEach((audit) => {
    const bucket = monthKey(auditDate(audit));
    if (!bucket) return;
    const current = auditBuckets.get(bucket.key) ?? { label: bucket.label, sum: 0, count: 0 };
    current.sum += auditScore(audit);
    current.count += 1;
    auditBuckets.set(bucket.key, current);
  });
  const savingBuckets = new Map<string, { label: string; value: number }>();
  completedCorrectiveActions.forEach((action) => {
    const bucket = monthKey(action.completedAt);
    if (!bucket) return;
    const current = savingBuckets.get(bucket.key) ?? { label: bucket.label, value: 0 };
    current.value += action.costSaving ?? 0;
    savingBuckets.set(bucket.key, current);
  });
  const auditTrend = [...auditBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => ({ label: value.label, score: Math.round(value.sum / value.count) }));
  const savingTrend = [...savingBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  const zoneRanking = FIVE_S_ZONE_CONFIGURATION.flatMap((config) => {
    const zoneAudits = completedAudits.filter((audit) => audit.area === config.name);
    return zoneAudits.length ? [{ zone: config.name, leader: config.leader, score: Math.round(zoneAudits.reduce((sum, audit) => sum + auditScore(audit), 0) / zoneAudits.length) }] : [];
  }).sort((a, b) => b.score - a.score);
  const statusFlow = ACTION_LIFECYCLE_STAGES.map((status) => ({ status, value: correctiveActions.filter((action) => getActionLifecycleStage(action.status) === status).length })).filter((item) => item.value);
  const trendChange = auditTrend.length > 1 ? (auditTrend.at(-1)?.score ?? 0) - (auditTrend.at(-2)?.score ?? 0) : 0;
  const featuredAudit = completedAudits.at(0);
  const storyActions = featuredAudit ? completedCorrectiveActions.filter((action) => isActionRelatedToAudit(action, featuredAudit)) : [];

  return {
    completedAudits,
    completedActions,
    completedCorrectiveActions,
    correctiveActions,
    score,
    totalSaving,
    closureRate,
    avgDays,
    overdue: correctiveActions.filter((action) => action.status === "Overdue").length,
    rework: correctiveActions.length ? Math.round((correctiveActions.filter((action) => action.status === "Rework Required").length / correctiveActions.length) * 100) : 0,
    auditTrend,
    savingTrend,
    zoneRanking,
    statusFlow,
    trendChange,
    featuredAudit,
    storyActions,
    storySaving: storyActions.reduce((sum, action) => sum + (action.costSaving ?? 0), 0),
  };
}
