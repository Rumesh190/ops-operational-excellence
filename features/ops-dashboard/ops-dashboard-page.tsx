"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlarmClock, CheckCircle2, ChevronDown, CircleGauge, Flag, Lightbulb, ListTodo, Plus, ArrowRight } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission } from "@/features/five-s/administration/permissions";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { canCreateImprovement } from "@/features/five-s/continuous-improvement/access";
import { useImprovements } from "@/features/five-s/continuous-improvement/store";
import { useGembaStore } from "@/features/gemba/gemba-store";
import { canRaiseRedFlag } from "@/features/red-flag/red-flag-access";
import { useRedFlagStore } from "@/features/red-flag/red-flag-store";
import { useVisualManagementStore } from "@/features/visual-management/visual-management-store";
import { AnalyticsView, useAnalyticsDashboardModel } from "@/features/analytics/analytics-dashboard-page";
import { buildUnifiedPerformanceView, type AnalyticsDashboardId, type AnalyticsPeriod } from "@/features/analytics/analytics-data";
import { useActionStore } from "@/lib/actions/action-store";
import { useFiveSAuditStore } from "@/lib/five-s/audit-store";
import { useCurrentUser } from "@/lib/current-user";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { OPERATIONAL_MODULES, SHARED_CAPABILITIES, type OperationalModuleId } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { buildOpsDashboardModel, type DashboardActivity, type DashboardKpi, type DashboardTone, type OpsDashboardPeriod } from "./ops-dashboard-data";

const PERIOD_OPTIONS: Array<{ value: OpsDashboardPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
];

type DashboardViewId = "overview" | "performance" | "modules";
const DASHBOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "modules", label: "Modules" },
] as const;

const CREATE_TARGETS = [
  { id: "gemba", label: "Start Gemba Walk", href: "/gemba/new" },
  { id: "redFlag", label: "Raise Red Flag", href: "/red-flag/new" },
  { id: "continuousImprovement", label: "Create Improvement", href: "/continuous-improvement/new" },
  { id: "audit", label: "Start Audit", href: "/audits" },
  { id: "actions", label: "Create Action", href: "/actions" },
  { id: "visualManagement", label: "Start Visual Management Meeting", href: "/visual-management" },
] as const;

const TONE_STYLES: Record<DashboardTone, { dot: string; icon: string; value: string }> = {
  neutral: { dot: "bg-slate-400", icon: "bg-slate-500/10 text-slate-600 dark:text-slate-300", value: "text-foreground" },
  info: { dot: "bg-sky-500", icon: "bg-sky-500/10 text-sky-700 dark:text-sky-400", value: "text-sky-700 dark:text-sky-400" },
  success: { dot: "bg-emerald-500", icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", value: "text-emerald-700 dark:text-emerald-400" },
  warning: { dot: "bg-amber-500", icon: "bg-amber-500/10 text-amber-700 dark:text-amber-400", value: "text-amber-700 dark:text-amber-400" },
  danger: { dot: "bg-red-500", icon: "bg-red-500/10 text-red-700 dark:text-red-400", value: "text-red-700 dark:text-red-400" },
};

function moduleIcon(moduleId: OperationalModuleId | "actions") {
  if (moduleId === "actions") return SHARED_CAPABILITIES.find((item) => item.id === "actions")!.icon;
  return OPERATIONAL_MODULES.find((item) => item.id === moduleId)!.icon;
}

function KpiGlyph({ id }: { id: string }) {
  if (id === "score") return <CircleGauge className="size-5" />;
  if (id === "open-actions") return <ListTodo className="size-4" />;
  if (id === "overdue-actions") return <AlarmClock className="size-4" />;
  if (id === "active-red-flags") return <Flag className="size-4" />;
  if (id === "monthly-improvements") return <Lightbulb className="size-4" />;
  return <Activity className="size-4" />;
}

function MetricItem({ item, index, score }: { item: DashboardKpi; index: number; score: number }) {
  const tone = TONE_STYLES[item.tone];
  const content = <div className={cn(
    "flex min-h-28 min-w-0 items-center gap-3 px-4 py-4 transition-colors sm:px-5",
    item.href && "hover:bg-muted/35",
    index > 0 && "border-t border-border/60 md:border-l md:border-t-0",
    index > 0 && index % 2 === 0 && "border-l",
    index % 2 === 1 && "border-l-0 md:border-l",
    item.lead && "col-span-2 bg-primary/[0.035] md:col-span-1",
  )}>
    {item.lead ? <span className="grid size-14 shrink-0 place-items-center rounded-full p-[5px]" style={{ background: `conic-gradient(var(--primary) ${score}%, var(--muted) ${score}% 100%)` }} aria-hidden><span className="grid size-full place-items-center rounded-full bg-card text-primary"><KpiGlyph id={item.id} /></span></span> : <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone.icon)} aria-hidden><KpiGlyph id={item.id} /></span>}
    <span className="min-w-0"><span className={cn("block text-2xl font-semibold leading-none tracking-[-0.035em] tabular-nums", item.lead ? "text-foreground" : tone.value)}>{item.value}</span><span className="mt-1.5 block truncate text-xs font-semibold text-foreground">{item.label}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.detail}</span></span>
  </div>;
  return item.href ? <Link href={item.href} className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{content}</Link> : content;
}

function MetricBand({ items, score }: { items: DashboardKpi[]; score: number }) {
  return <section aria-label="Operational summary" className="overflow-hidden rounded-xl border border-border/70 bg-card/55"><div className="grid min-w-0 grid-cols-2 md:grid-cols-5">{items.map((item, index) => <MetricItem key={item.id} item={item} index={index} score={score} />)}</div></section>;
}

function SecondaryMetricRail({ items }: { items: DashboardKpi[] }) {
  if (!items.length) return null;
  return <section aria-label="Supporting operational metrics" className="border-y border-border/65"><div className="grid min-w-0 grid-cols-2 md:grid-cols-4 2xl:grid-cols-8">{items.map((item, index) => {
    const content = <div className={cn(
      "min-w-0 px-3 py-3.5 sm:px-4",
      index >= 2 && "border-t border-border/55 md:border-t-0",
      index % 2 === 1 && "border-l border-border/55",
      index % 4 !== 0 && "md:border-l",
      index % 4 === 0 && "md:border-l-0",
      index >= 4 && "md:border-t",
      index > 0 && "2xl:border-l",
      index === 0 && "2xl:border-l-0",
      index < 8 && "2xl:border-t-0",
      index >= 8 && "2xl:border-t",
    )}><p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p><div className="mt-1 flex items-baseline gap-2"><span className={cn("text-lg font-semibold tabular-nums", TONE_STYLES[item.tone].value)}>{item.value}</span><span className="truncate text-[10px] text-muted-foreground">{item.detail}</span></div></div>;
    return item.href ? <Link key={item.id} href={item.href} className="min-w-0 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{content}</Link> : <div key={item.id}>{content}</div>;
  })}</div></section>;
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>;
}

function DashboardSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 border-t border-border/75 pt-4 sm:pt-5", className)}>{children}</section>;
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="grid min-h-36 place-items-center py-8 text-center"><div><CheckCircle2 className="mx-auto size-6 text-emerald-500" /><p className="mt-2 text-sm font-medium">{message}</p><p className="mt-1 text-xs text-muted-foreground">Nothing requires action in this view.</p></div></div>;
}

function DashboardFilters({ plant, zone, period, plants, zones, onPlant, onZone, onPeriod }: {
  plant: string; zone: string; period: OpsDashboardPeriod; plants: string[]; zones: string[];
  onPlant: (value: string) => void; onZone: (value: string) => void; onPeriod: (value: OpsDashboardPeriod) => void;
}) {
  return <div className="flex min-w-0 flex-wrap items-end gap-2"><FilterSelect label="Plant" value={plant} allLabel="All plants" options={plants} onChange={onPlant} /><FilterSelect label="Zone" value={zone} allLabel="All zones" options={zones} onChange={onZone} /><label className="min-w-[145px] flex-1 sm:w-[170px] sm:flex-none"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Time period</span><Select value={period} onValueChange={(value) => onPeriod((value ?? "90d") as OpsDashboardPeriod)}><SelectTrigger className="h-9 w-full bg-background shadow-none"><SelectValue /></SelectTrigger><SelectContent>{PERIOD_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></label></div>;
}

function FilterSelect({ label, value, allLabel, options, onChange }: { label: string; value: string; allLabel: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="min-w-[135px] flex-1 sm:w-[155px] sm:flex-none"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span><Select value={value} onValueChange={(next) => onChange(next ?? "All")}><SelectTrigger className="h-9 w-full bg-background shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">{allLabel}</SelectItem>{options.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>;
}

function formatActivityTime(activity: DashboardActivity) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(activity.at));
}

function statusLabel(tone: DashboardTone) {
  return tone === "success" ? "Healthy" : tone === "warning" ? "Attention" : tone === "danger" ? "Critical" : tone === "info" ? "Active" : "Stable";
}

function CreateMenu({ createTargets }: { createTargets: typeof CREATE_TARGETS[number][] }) {
  const router = useRouter();
  if (!createTargets.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" className="h-9" />}>
        <Plus className="size-4" />
        Create
        <ChevronDown className="size-3.5 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Create operational work</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {createTargets.map((item) => {
            const Icon = moduleIcon(item.id);
            return (
              <DropdownMenuItem key={item.id} className="gap-2 py-2" onClick={() => router.push(item.href)}>
                <Icon className="text-muted-foreground" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function OpsDashboardPage({ initialView = "overview", initialModule }: { initialView?: DashboardViewId; initialModule?: AnalyticsDashboardId }) {
  const audits = useFiveSAuditStore();
  const actions = useActionStore();
  const improvements = useImprovements();
  const redFlags = useRedFlagStore();
  const gemba = useGembaStore();
  const visualManagement = useVisualManagementStore();
  const access = useModuleEntitlements();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const router = useRouter();
  const [plant, setPlant] = useState("All");
  const [zone, setZone] = useState("All");
  const [period, setPeriod] = useState<OpsDashboardPeriod>("90d");

  const model = useMemo(() => buildOpsDashboardModel({ audits, actions, improvements, redFlags, gemba, visualManagement, access, currentUser, filters: { plant, zone, period } }), [access, actions, audits, currentUser, gemba, improvements, period, plant, redFlags, visualManagement, zone]);
  const analyticsFilters = useMemo(() => ({ plant, zone, period: period as AnalyticsPeriod }), [period, plant, zone]);
  const analytics = useAnalyticsDashboardModel(analyticsFilters);
  const performanceView = useMemo(() => buildUnifiedPerformanceView(analytics), [analytics]);
  const moduleOptions = analytics.dashboards.filter((item) => item.id !== "executive");
  const activeModule = moduleOptions.some((item) => item.id === initialModule) ? initialModule! : moduleOptions[0]?.id;
  const moduleView = activeModule ? analytics.views[activeModule] : undefined;

  function navigate(view: DashboardViewId, module?: AnalyticsDashboardId) {
    const query = new URLSearchParams();
    query.set("view", view);
    if (view === "modules" && module) query.set("module", module);
    router.replace(`/dashboard?${query.toString()}`);
  }

  const authorizedCreateTargets = {
    gemba: !currentUser.isSuperAdmin && Boolean(adminUser?.status === "Active" && adminUser.roles.some((role) => role === "Admin" || role === "Auditor")),
    redFlag: canRaiseRedFlag(adminUser, currentUser),
    continuousImprovement: canCreateImprovement(adminUser, currentUser),
    audit: !currentUser.isSuperAdmin && hasPermission(adminUser, "audits.create"),
    actions: !currentUser.isSuperAdmin && hasPermission(adminUser, "actions.create"),
    visualManagement: !currentUser.isSuperAdmin && adminUser?.status === "Active",
  } satisfies Record<(typeof CREATE_TARGETS)[number]["id"], boolean>;
  const createTargets = CREATE_TARGETS.filter((item) => access[item.id] && authorizedCreateTargets[item.id]);
  const maxSourceValue = Math.max(1, ...model.actionSources.map((item) => item.value));

  return <PageContainer className="max-w-none gap-7 lg:gap-8">
    <FiveSPageHeader
      eyebrow="OPS Workspace"
      title="Dashboard"
      description="Monitor operational performance, abnormalities, actions, improvement activity, and standards across OPS."
      actions={
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <DashboardFilters
            plant={plant}
            zone={zone}
            period={period}
            plants={model.plants}
            zones={model.zones}
            onPlant={(value) => { setPlant(value); setZone("All"); }}
            onZone={setZone}
            onPeriod={setPeriod}
          />
          <CreateMenu createTargets={createTargets} />
        </div>
      }
    />

    <OpsTabBar label="Dashboard views" active={initialView} onChange={(id) => navigate(id as DashboardViewId, activeModule)} tabs={[...DASHBOARD_TABS]} />

    {initialView === "overview" && <>
    <MetricBand items={model.primaryKpis} score={model.operationalScore} />
    <SecondaryMetricRail items={model.secondaryKpis} />

    <div className="grid min-w-0">
      <DashboardSection>
        <SectionHeader title="Module Health" description="A concise view across enabled operational modules" />
        <div className="mt-4 min-w-0"><div className="hidden grid-cols-[minmax(0,1.2fr)_90px_minmax(0,1.5fr)_36px] gap-3 border-b border-border/65 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:grid"><span>Module</span><span>Status</span><span>Key metric</span><span className="text-right">Trend</span></div><div className="divide-y divide-border/60">{model.moduleHealth.map((item) => { const Icon = moduleIcon(item.id); const label = statusLabel(item.tone); return <Link href={item.href} key={item.id} className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1.2fr)_90px_minmax(0,1.5fr)_36px]"><span className="flex min-w-0 items-center gap-2"><span className={cn("grid size-7 shrink-0 place-items-center rounded-md", TONE_STYLES[item.tone].icon)}><Icon className="size-3.5" /></span><span className="truncate text-xs font-semibold">{item.label}</span></span><span className="hidden items-center gap-1.5 text-xs sm:flex"><span className={cn("size-1.5 rounded-full", TONE_STYLES[item.tone].dot)} />{label}</span><span className="col-span-2 min-w-0 sm:col-span-1"><span className="block truncate text-xs font-medium">{item.primary}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{item.secondary}</span></span><span className={cn("row-start-1 text-right text-sm font-semibold sm:col-start-4", TONE_STYLES[item.tone].value)}>{item.tone === "danger" ? "↓" : item.tone === "neutral" ? "→" : "↑"}</span></Link>; })}</div></div>
      </DashboardSection>
    </div>

    <div className="grid min-w-0 gap-8 lg:grid-cols-12 lg:gap-0">
      <DashboardSection className="lg:col-span-7 lg:pr-8"><SectionHeader title="Needs Attention" description="Operational items requiring follow-up" /><div className="mt-3">{model.attention.length ? <div className="divide-y divide-border/60">{model.attention.map((item) => { const Icon = moduleIcon(item.moduleId); const tone = TONE_STYLES[item.tone]; return <Link key={item.id} href={item.href} className="group flex min-w-0 items-center gap-3 py-3 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone.icon)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span></span><Badge variant={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : "info"} size="sm" className="hidden shrink-0 sm:inline-flex">{item.tone === "danger" ? "Urgent" : item.tone === "warning" ? "Review" : "Follow up"}</Badge><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></Link>; })}</div> : <EmptyPanel message="Operations are on track" />}</div></DashboardSection>

      <DashboardSection className="lg:col-span-5 lg:border-l lg:pl-8"><SectionHeader title="My Work" description={`Priority work for ${currentUser.name}`} /><div className="mt-3">{model.myWork.length ? <div className="divide-y divide-border/60">{model.myWork.map((item) => <Link key={item.id} href={item.href} className="group flex min-w-0 items-center gap-3 py-3 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className={cn("size-2 shrink-0 rounded-full", TONE_STYLES[item.tone].dot)} /><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><Badge variant="outline" size="sm" className="shrink-0">{item.kind}</Badge><span className="truncate text-sm font-medium">{item.title}</span></span><span className={cn("mt-1 block text-xs", item.tone === "danger" ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>{item.detail}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></Link>)}</div> : <EmptyPanel message="Your work queue is clear" />}</div></DashboardSection>
    </div>

    <div className="grid min-w-0 gap-8 lg:grid-cols-12 lg:gap-0">
      <DashboardSection className={cn("lg:pr-8", access.actions ? "lg:col-span-7" : "lg:col-span-12")}><SectionHeader title="Recent Activity" description="Latest updates across enabled modules" /><div className="mt-3">{model.activity.length ? <div>{model.activity.map((item, index) => { const Icon = moduleIcon(item.moduleId); return <Link href={item.href} key={item.id} className="group grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3 py-3 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[32px_minmax(0,1fr)_auto]"><span className="relative grid size-8 place-items-center rounded-full border bg-background text-muted-foreground"><Icon className="size-3.5" />{index < model.activity.length - 1 && <span className="absolute left-1/2 top-8 h-[calc(100%+0.75rem)] w-px -translate-x-1/2 bg-border" aria-hidden />}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.text}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.user}</span></span><time dateTime={item.at} className="col-start-2 text-xs text-muted-foreground sm:col-start-3 sm:row-start-1">{formatActivityTime(item)}</time></Link>; })}</div> : <EmptyPanel message="No recent activity" />}</div></DashboardSection>

      {access.actions && <DashboardSection className="lg:col-span-5 lg:border-l lg:pl-8"><SectionHeader title="Actions Overview" description="Cross-module corrective workload" /><div className="mt-4 grid grid-cols-4 divide-x divide-border/60 border-y border-border/60 py-3"><ActionStat label="Open" value={model.actionStats.open} tone="warning" href="/actions?status=open" /><ActionStat label="Overdue" value={model.actionStats.overdue} tone="danger" href="/actions?status=overdue" /><ActionStat label="Review" value={model.actionStats.awaitingReview} tone="info" href="/actions?tab=awaiting-review" /><ActionStat label="Completed" value={model.actionStats.completed} tone="success" href="/actions?tab=completed" /></div><div className="mt-5"><p className="text-xs font-semibold text-foreground">Actions by Source</p><div className="mt-3 grid gap-3">{model.actionSources.map((item) => <Link href={item.href} key={item.id} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><span className="truncate text-muted-foreground group-hover:text-foreground">{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span><span className="col-span-2 h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/75 transition-all" style={{ width: `${Math.max(item.value ? 8 : 0, (item.value / maxSourceValue) * 100)}%` }} /></span></Link>)}</div></div></DashboardSection>}
    </div>
    </>}

    {initialView === "performance" && <AnalyticsView view={performanceView} />}

    {initialView === "modules" && <section className="min-w-0">
      {moduleOptions.length ? <>
        <div className="hidden lg:block"><OpsTabBar label="Module analytics" active={activeModule ?? ""} onChange={(id) => navigate("modules", id as AnalyticsDashboardId)} tabs={moduleOptions.map((item) => ({ id: item.id, label: item.label, icon: moduleIcon(item.id as OperationalModuleId | "actions") }))} /></div>
        <label className="block lg:hidden"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Module</span><Select value={activeModule} onValueChange={(value) => { if (value) navigate("modules", value as AnalyticsDashboardId); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{moduleOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></label>
        {moduleView && <div className="mt-6"><AnalyticsView view={moduleView} /></div>}
      </> : <EmptyPanel message="No operational modules are enabled" />}
    </section>}
  </PageContainer>;
}

function ActionStat({ label, value, tone, href }: { label: string; value: number; tone: DashboardTone; href: string }) {
  return <Link href={href} className="min-w-0 px-2 text-center outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring"><p className={cn("text-xl font-semibold leading-none tabular-nums", TONE_STYLES[tone].value)}>{value}</p><p className="mt-1.5 truncate text-[10px] font-medium text-muted-foreground">{label}</p></Link>;
}
