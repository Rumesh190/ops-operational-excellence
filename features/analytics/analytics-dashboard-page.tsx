"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CircleGauge,
  Lightbulb,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { getRoleVisibleActions } from "@/features/actions/action-center-data";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { canSeeImprovement, useImprovements } from "@/features/five-s/continuous-improvement/store";
import { visibleGembaWalks } from "@/features/gemba/gemba-access";
import { useGembaStore } from "@/features/gemba/gemba-store";
import { visibleRedFlags } from "@/features/red-flag/red-flag-access";
import { useRedFlagStore } from "@/features/red-flag/red-flag-store";
import { visibleVisualManagementBoards, visibleVisualManagementMeetings } from "@/features/visual-management/visual-management-access";
import { useVisualManagementStore } from "@/features/visual-management/visual-management-store";
import { useActionStore } from "@/lib/actions/action-store";
import { CHART_COLORS } from "@/lib/dashboard/chart-palette";
import { useFiveSAuditStore } from "@/lib/five-s/audit-store";
import { useCurrentUser } from "@/lib/current-user";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { cn } from "@/lib/utils";
import {
  buildAnalyticsModel,
  type AnalyticsChart,
  type AnalyticsKpi,
  type AnalyticsModulePerformance,
  type AnalyticsPeriod,
  type AnalyticsSeriesTone,
  type AnalyticsTone,
  type AnalyticsTransformation,
  type AnalyticsValueFormat,
  type AnalyticsViewModel,
} from "./analytics-data";

const TONE_STYLES: Record<AnalyticsTone, { dot: string; value: string; soft: string }> = {
  neutral: { dot: "bg-slate-400", value: "text-foreground", soft: "bg-muted/45" },
  info: { dot: "bg-sky-500", value: "text-sky-700 dark:text-sky-400", soft: "bg-sky-500/[0.07]" },
  success: { dot: "bg-emerald-500", value: "text-emerald-700 dark:text-emerald-400", soft: "bg-emerald-500/[0.07]" },
  warning: { dot: "bg-amber-500", value: "text-amber-700 dark:text-amber-400", soft: "bg-amber-500/[0.07]" },
  danger: { dot: "bg-red-500", value: "text-red-700 dark:text-red-400", soft: "bg-red-500/[0.07]" },
};

const SERIES_COLORS: Record<AnalyticsSeriesTone, string> = {
  information: CHART_COLORS.information,
  supporting: CHART_COLORS.supporting,
  positive: CHART_COLORS.positive,
  warning: CHART_COLORS.warning,
  critical: CHART_COLORS.critical,
  secondary: CHART_COLORS.secondary,
  attention: CHART_COLORS.attention,
};

const TOOLTIP_STYLE = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 12px 30px -18px rgb(0 0 0 / 0.55)",
};

function KpiCard({ item }: { item: AnalyticsKpi }) {
  const tone = TONE_STYLES[item.tone];
  const content = <div className={cn("min-w-0 bg-background transition-colors", item.href && "hover:bg-muted/25")}>
    <div className="relative p-4">
      <span className={cn("absolute inset-y-4 left-0 w-0.5 rounded-r-full", tone.dot)} aria-hidden />
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</p>
        {item.comparison && <span title={item.comparison.label} className={cn("inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold tabular-nums", item.comparison.favorable ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>
          {item.comparison.value >= 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}{Math.abs(item.comparison.value)}%
        </span>}
      </div>
      <p className={cn("mt-1.5 truncate text-2xl font-semibold leading-none tracking-[-0.035em] tabular-nums", tone.value)}>{item.value}</p>
      <p className="mt-2 truncate text-[10px] text-muted-foreground">{item.detail}</p>
    </div>
  </div>;
  return item.href ? <Link href={item.href} className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{content}</Link> : content;
}

function formatAxis(value: number, format: AnalyticsValueFormat = "number") {
  if (format === "percent") return `${value}%`;
  if (format === "money") return value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${value}`;
  if (format === "hours") return `${value}h`;
  return String(value);
}

function formatTooltip(value: number, format: AnalyticsValueFormat = "number") {
  if (format === "money") return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  return formatAxis(value, format);
}

function hasChartData(chart: AnalyticsChart) {
  return chart.data.some((point) => chart.series.some((series) => typeof point[series.key] === "number" && point[series.key] !== 0));
}

function AnalyticsChartPanel({ chart: model, className }: { chart: AnalyticsChart; className?: string }) {
  const formatter = (value: unknown, name: unknown): [string, string] => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const key = typeof name === "string" ? name : String(name ?? "");
    return [formatTooltip(Number(rawValue ?? 0), model.valueFormat), model.series.find((item) => item.key === key)?.label ?? (key || "Value")];
  };
  const axisFormatter = (value: number) => formatAxis(value, model.valueFormat);
  const hasData = hasChartData(model);
  const chartMargin = { top: 8, right: 18, left: model.valueFormat === "money" ? 2 : -12, bottom: 4 };
  return <section className={cn("min-w-0 border-t border-border/75 pt-5", className)}>
    <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary"><BarChart3 className="size-4" /></span><div className="min-w-0"><h3 className="text-[15px] font-semibold">{model.title}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{model.description}</p></div></div>
    <div className="mt-3 h-[280px] min-w-0 px-1 pb-2">
      {!hasData ? <div className="grid h-full place-items-center px-6 text-center"><div><CircleGauge className="mx-auto size-6 text-muted-foreground/55" /><p className="mt-2 text-xs leading-5 text-muted-foreground">{model.emptyMessage}</p></div></div> : <ResponsiveContainer width="100%" height="100%">
        {model.kind === "line" ? <LineChart data={model.data} margin={chartMargin}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <YAxis domain={model.valueFormat === "percent" ? [0, 100] : undefined} allowDecimals={false} tickFormatter={axisFormatter} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatter} />
          {model.series.length > 1 && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />}
          {model.series.map((series) => <Line key={series.key} name={series.key} type="monotone" dataKey={series.key} connectNulls={false} stroke={SERIES_COLORS[series.tone]} strokeWidth={2.25} dot={{ r: 2.5, fill: "var(--card)", stroke: SERIES_COLORS[series.tone], strokeWidth: 2 }} activeDot={{ r: 4 }} />)}
        </LineChart> : model.kind === "horizontal-bar" ? <BarChart data={model.data} layout="vertical" margin={{ top: 4, right: 22, left: 18, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" domain={model.valueFormat === "percent" ? [0, 100] : undefined} allowDecimals={false} tickFormatter={axisFormatter} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false} tick={{ fill: "var(--foreground)", fontSize: 10 }} />
          <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={TOOLTIP_STYLE} formatter={formatter} />
          {model.series.map((series) => <Bar key={series.key} name={series.key} dataKey={series.key} fill={SERIES_COLORS[series.tone]} radius={[0, 5, 5, 0]} maxBarSize={24} />)}
        </BarChart> : <BarChart data={model.data} margin={chartMargin}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={12} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <YAxis domain={model.valueFormat === "percent" ? [0, 100] : undefined} allowDecimals={false} tickFormatter={axisFormatter} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={TOOLTIP_STYLE} formatter={formatter} />
          {model.series.length > 1 && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />}
          {model.series.map((series, index) => <Bar key={series.key} name={series.key} dataKey={series.key} stackId={model.kind === "stacked-bar" ? "total" : undefined} fill={SERIES_COLORS[series.tone]} radius={model.kind === "stacked-bar" && index < model.series.length - 1 ? 0 : [5, 5, 0, 0]} maxBarSize={38} />)}
        </BarChart>}
      </ResponsiveContainer>}
    </div>
  </section>;
}

function ModulePerformance({ items }: { items: AnalyticsModulePerformance[] }) {
  return <section className="min-w-0 border-t border-border/75 pt-5 xl:col-span-4"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary"><CircleGauge className="size-4" /></span><div><h3 className="text-[15px] font-semibold">Module Performance</h3><p className="mt-0.5 text-xs text-muted-foreground">Enabled-module contribution</p></div></div><div className="mt-5 grid gap-4">{items.map((item) => <Link key={item.id} href={item.href} className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium group-hover:text-primary">{item.label}</span><span className="shrink-0 font-semibold tabular-nums">{item.value === null ? "—" : `${item.value}%`}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75 transition-all" style={{ width: `${item.value ?? 0}%` }} /></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{item.detail}</p></Link>)}</div></section>;
}

function Insight({ children }: { children: string }) {
  return <aside className="flex min-w-0 items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.045] px-4 py-3 text-sm"><Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Data insight</p><p className="mt-1 leading-5 text-foreground/85">{children}</p></div></aside>;
}

function RecentTransformations({ items }: { items: AnalyticsTransformation[] }) {
  return <section className="min-w-0 border-t border-border/75 pt-5"><h3 className="text-[15px] font-semibold">Recent Transformations</h3><p className="mt-0.5 text-xs text-muted-foreground">Verified before-and-after workplace changes</p><div className="mt-4">{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Link key={item.id} href={item.href} className="group min-w-0 overflow-hidden rounded-lg border bg-background outline-none transition-colors hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring"><div className="grid grid-cols-2 gap-px bg-border"><figure className="relative aspect-[16/9] overflow-hidden bg-muted"><Image src={item.beforeUrl} alt={`Before: ${item.title}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /><figcaption className="absolute bottom-1.5 left-1.5 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Before</figcaption></figure><figure className="relative aspect-[16/9] overflow-hidden bg-muted"><Image src={item.afterUrl} alt={`After: ${item.title}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /><figcaption className="absolute bottom-1.5 left-1.5 rounded bg-emerald-700/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">After</figcaption></figure></div><div className="flex min-w-0 items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.title}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{item.id} · {item.zone}</p></div><ArrowRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" /></div></Link>)}</div> : <p className="py-8 text-center text-xs text-muted-foreground">No completed before-and-after transformations match this selection.</p>}</div></section>;
}

export function AnalyticsView({ view }: { view: AnalyticsViewModel }) {
  const isExecutive = view.id === "executive";
  return <div className="grid min-w-0 gap-4">
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">{view.label} dashboard</p><p className="mt-1 text-sm text-muted-foreground">{view.description}</p></div><Badge variant="outline" className="mt-2 sm:mt-0">Live OPS data</Badge></div>
    {view.kpiRows.map((row, index) => <section key={index} aria-label={`${view.label} metrics row ${index + 1}`} className="grid min-w-0 gap-px overflow-hidden rounded-xl border bg-border [grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))]">{row.map((item) => <KpiCard key={item.id} item={item} />)}</section>)}
    {view.insight && <Insight>{view.insight}</Insight>}
    {isExecutive && view.modulePerformance ? <><div className="grid min-w-0 gap-6 xl:grid-cols-12"><AnalyticsChartPanel chart={view.charts[0]} className="xl:col-span-8" /><ModulePerformance items={view.modulePerformance} /></div>{view.charts.length > 1 && <div className="grid min-w-0 gap-6 xl:grid-cols-2">{view.charts.slice(1).map((item) => <AnalyticsChartPanel key={item.id} chart={item} />)}</div>}</> : <div className="grid min-w-0 gap-6 xl:grid-cols-2">{view.charts.map((item) => <AnalyticsChartPanel key={item.id} chart={item} className={item.wide ? "xl:col-span-2" : undefined} />)}</div>}
    {view.transformations && <RecentTransformations items={view.transformations} />}
  </div>;
}

export function useAnalyticsDashboardModel(filters: { plant: string; zone: string; period: AnalyticsPeriod }) {
  const audits = useFiveSAuditStore();
  const actions = useActionStore();
  const improvements = useImprovements();
  const redFlags = useRedFlagStore();
  const visualManagement = useVisualManagementStore();
  const gemba = useGembaStore();
  const access = useModuleEntitlements();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  return useMemo(() => {
    const visibleActions = getRoleVisibleActions(actions, currentUser, adminUser);
    const visibleImprovements = improvements.filter((record) => canSeeImprovement(record, currentUser));
    const visibleFlags = visibleRedFlags(redFlags, adminUser, currentUser);
    const walks = visibleGembaWalks(gemba.walks, currentUser, adminUser?.roles);
    const walkIds = new Set(walks.map((walk) => walk.id));
    const boards = visibleVisualManagementBoards(visualManagement.boards, currentUser, adminUser?.roles);
    const meetings = visibleVisualManagementMeetings(visualManagement.meetings, visualManagement.boards, currentUser, adminUser?.roles);
    const boardIds = new Set(boards.map((board) => board.id));
    const meetingIds = new Set(meetings.map((meeting) => meeting.id));
    return buildAnalyticsModel({
      audits,
      actions: visibleActions,
      improvements: visibleImprovements,
      redFlags: visibleFlags,
      visualManagement: { ...visualManagement, boards, meetings, topics: visualManagement.topics.filter((topic) => meetingIds.has(topic.meetingId)), decisions: visualManagement.decisions.filter((decision) => meetingIds.has(decision.meetingId)), escalations: visualManagement.escalations.filter((item) => boardIds.has(item.sourceBoardId) || boardIds.has(item.targetBoardId)) },
      gemba: { walks, observations: gemba.observations.filter((observation) => walkIds.has(observation.gembaId)) },
      access,
      filters,
    });
  }, [access, actions, adminUser, audits, currentUser, filters, gemba, improvements, redFlags, visualManagement]);
}
