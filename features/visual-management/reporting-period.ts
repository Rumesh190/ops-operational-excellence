import type { KpiReportingPeriod, KpiReportingPeriodType } from "./kpi-execution-store";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

function pad(value: number) { return String(value).padStart(2, "0"); }

function monthlyParts(value: string) {
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})$/);
  if (!match) return undefined;
  const year = Number(match[1]); const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : undefined;
}

function dailyParts(value: string) {
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return undefined;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : undefined;
}

function weeklyParts(value: string) {
  const match = value.trim().match(/^(\d{4})[-/]?W(\d{1,2})$/i);
  if (!match) return undefined;
  const year = Number(match[1]); const week = Number(match[2]);
  return week >= 1 && week <= 53 ? { year, week } : undefined;
}

export function createReportingPeriod(type: KpiReportingPeriodType, value: string): KpiReportingPeriod | undefined {
  if (type === "monthly") { const parts = monthlyParts(value); return parts ? { type, key: `${parts.year}-${pad(parts.month)}`, label: `${MONTH_NAMES[parts.month - 1]} ${parts.year}` } : undefined; }
  if (type === "daily") { const parts = dailyParts(value); if (!parts) return undefined; const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`; return { type, key, label: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`)) }; }
  if (type === "weekly") { const parts = weeklyParts(value); return parts ? { type, key: `${parts.year}-W${pad(parts.week)}`, label: `Week ${parts.week}, ${parts.year}` } : undefined; }
  const key = value.trim(); return key ? { type, key, label: key } : undefined;
}

export function normalizedReportingPeriodKey(period: Pick<KpiReportingPeriod, "type" | "key">) {
  return createReportingPeriod(period.type, period.key)?.key ?? period.key.trim().toLowerCase();
}

export function readableReportingPeriod(period: KpiReportingPeriod) {
  return createReportingPeriod(period.type, period.key)?.label ?? (period.label || period.key);
}

function isoWeek(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return { year: copy.getUTCFullYear(), week: Math.ceil((((copy.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7) };
}

export function suggestReportingPeriod(type: KpiReportingPeriodType, latest?: KpiReportingPeriod, now = new Date()): KpiReportingPeriod {
  const normalizedLatest = latest?.type === type ? createReportingPeriod(type, latest.key) : undefined;
  if (type === "monthly") {
    const base = normalizedLatest ? monthlyParts(normalizedLatest.key)! : { year: now.getFullYear(), month: now.getMonth() + 1 };
    const month = normalizedLatest ? base.month + 1 : base.month; const year = base.year + Math.floor((month - 1) / 12);
    return createReportingPeriod(type, `${year}-${pad(((month - 1) % 12) + 1)}`)!;
  }
  if (type === "daily") {
    const base = normalizedLatest ? new Date(`${normalizedLatest.key}T00:00:00Z`) : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    if (normalizedLatest) base.setUTCDate(base.getUTCDate() + 1);
    return createReportingPeriod(type, `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`)!;
  }
  if (type === "weekly") {
    if (normalizedLatest) { const parts = weeklyParts(normalizedLatest.key)!; const monday = new Date(Date.UTC(parts.year, 0, 4)); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() || 7) + 1 + (parts.week * 7)); const next = isoWeek(monday); return createReportingPeriod(type, `${next.year}-W${pad(next.week)}`)!; }
    const current = isoWeek(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))); return createReportingPeriod(type, `${current.year}-W${pad(current.week)}`)!;
  }
  return { type, key: "", label: "" };
}
