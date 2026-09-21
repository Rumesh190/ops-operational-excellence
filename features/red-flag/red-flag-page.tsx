"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, ChevronDown, Eye, FileText, Flag, ListFilter, Plus, Search, ShieldAlert, TimerReset } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { ACTION_STATUS_CONFIG, isActionOverdue } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { canRaiseRedFlag, visibleRedFlags } from "./red-flag-access";
import { AgeIndicator, EmptyRedFlags, formatDateTime, RED_FLAG_SEVERITY_CONFIG, RedFlagStatusBadge, RedFlagTabBar, SeverityBadge } from "./red-flag-components";
import { getRedFlagSummary, isRedFlagOverdue, reconcileRedFlagActions, redFlagAgeHours, useRedFlagStore } from "./red-flag-store";
import type { RedFlag, RedFlagSeverity } from "./types";

type LandingTab = "overview" | "red-flags" | "awaiting-closure" | "closed";

function safeTab(value?: string): LandingTab {
  return value === "red-flags" || value === "awaiting-closure" || value === "closed" ? value : "overview";
}

export default function RedFlagPage({ initialTab, initialStatus, initialSeverity }: { initialTab?: string; initialStatus?: string; initialSeverity?: string }) {
  const allFlags = useRedFlagStore();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const flags = useMemo(() => visibleRedFlags(allFlags, adminUser, currentUser), [adminUser, allFlags, currentUser]);
  const [active, setActive] = useState<LandingTab>(safeTab(initialTab));
  const mayRaise = canRaiseRedFlag(adminUser, currentUser);
  const summary = getRedFlagSummary(flags);
  const actionMap = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);
  const overdueActions = flags.filter((flag) => flag.actionId && actionMap.get(flag.actionId) && isActionOverdue(actionMap.get(flag.actionId)!)).length;
  const awaitingCount = flags.filter((flag) => flag.status === "Awaiting Closure").length;
  const closedCount = flags.filter((flag) => flag.status === "Closed").length;

  useEffect(() => { reconcileRedFlagActions(actions); }, [actions]);

  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="OPS Workspace" title="Red Flag" description="Raise urgent operational issues quickly, contain risk, and verify closure with a traceable record." actions={mayRaise ? <Button nativeButton={false} render={<Link href="/red-flag/new" />} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"><Plus className="size-4" />Raise Red Flag</Button> : undefined} />

    <RedFlagTabBar active={active} onChange={(id) => setActive(id as LandingTab)} tabs={[{ id: "overview", label: "Overview" }, { id: "red-flags", label: "Red Flags", count: flags.length }, { id: "awaiting-closure", label: "Awaiting Closure", count: awaitingCount }, { id: "closed", label: "Closed", count: closedCount }, { id: "settings", label: "Settings", href: "/red-flag/settings" }]} />

    <section aria-label="Red Flag summary" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <Metric label="Open" value={summary.open.length} tone={summary.open.length ? "danger" : "success"} onClick={() => { setActive("red-flags"); }} />
      <Metric label="Critical" value={summary.critical.length} tone={summary.critical.length ? "danger" : "neutral"} onClick={() => setActive("red-flags")} />
      <Metric label="Overdue Actions" value={overdueActions} tone={overdueActions ? "danger" : "success"} onClick={() => setActive("red-flags")} />
      <Metric label="Closed This Month" value={summary.closedThisMonth.length} tone="success" onClick={() => setActive("closed")} />
      <Metric label="Avg Resolution" value={summary.averageResolutionHours < 24 ? `${summary.averageResolutionHours}h` : `${Math.round(summary.averageResolutionHours / 24)}d`} tone="info" />
    </section>

    {active === "overview" ? <RedFlagOverview flags={flags} actions={actions} /> : <RedFlagLibrary flags={flags} actions={actions} tab={active} initialStatus={initialStatus} initialSeverity={initialSeverity} />}
  </PageContainer>;
}

function Metric({ label, value, tone, onClick }: { label: string; value: string | number; tone: "danger" | "success" | "info" | "neutral"; onClick?: () => void }) {
  const tones = { danger: "bg-red-500", success: "bg-emerald-500", info: "bg-sky-500", neutral: "bg-slate-400" };
  const content = <><span className={cn("absolute inset-y-3 left-0 w-0.5 rounded-r-full", tones[tone])} /><p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold leading-none tabular-nums">{value}</p></>;
  return onClick ? <button type="button" onClick={onClick} className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3 text-left shadow-sm outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring">{content}</button> : <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3 shadow-sm">{content}</div>;
}

function RedFlagOverview({ flags, actions }: { flags: RedFlag[]; actions: MyAction[] }) {
  const open = flags.filter((flag) => !["Closed", "Cancelled"].includes(flag.status));
  const severity = (["Critical", "High", "Medium", "Low"] as RedFlagSeverity[]).map((item) => ({ label: item, value: open.filter((flag) => flag.severity === item).length }));
  const zones = Array.from(new Set(flags.map((flag) => flag.zone))).map((zone) => ({ zone, value: open.filter((flag) => flag.zone === zone).length })).sort((a, b) => b.value - a.value);
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  const linked = open.filter((flag) => flag.actionId).length;
  const completed = open.filter((flag) => flag.actionId && actionMap.get(flag.actionId)?.status === "Completed").length;
  const averageAge = open.length ? Math.round(open.reduce((sum, flag) => sum + redFlagAgeHours(flag), 0) / open.length) : 0;
  const maxSeverity = Math.max(1, ...severity.map((item) => item.value));
  const maxZone = Math.max(1, ...zones.map((item) => item.value));
  const recent = [...flags].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recurring = recurringIssues(flags);
  return <div className="grid min-w-0 gap-4 xl:grid-cols-12">
    <Card className="min-w-0 gap-0 xl:col-span-4"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Open by Severity</CardTitle><p className="text-xs text-muted-foreground">Urgency across unresolved Red Flags</p></CardHeader><CardContent className="grid gap-4 p-5">{severity.map((item) => <Bar key={item.label} label={item.label} value={item.value} max={maxSeverity} color={RED_FLAG_SEVERITY_CONFIG[item.label].dot} />)}</CardContent></Card>
    <Card className="min-w-0 gap-0 xl:col-span-4"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Open by Zone</CardTitle><p className="text-xs text-muted-foreground">Where attention is concentrated</p></CardHeader><CardContent className="grid gap-4 p-5">{zones.slice(0, 5).map((item) => <Bar key={item.zone} label={item.zone} value={item.value} max={maxZone} color="bg-primary/75" />)}{!zones.length && <p className="text-xs text-muted-foreground">No zone activity yet.</p>}</CardContent></Card>
    <Card className="min-w-0 gap-0 xl:col-span-4"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Resolution Health</CardTitle><p className="text-xs text-muted-foreground">Age and action coverage</p></CardHeader><CardContent className="grid grid-cols-2 gap-px bg-border/60 p-0"><OverviewStat label="Average open age" value={averageAge < 24 ? `${averageAge}h` : `${Math.round(averageAge / 24)}d`} icon={TimerReset} /><OverviewStat label="Actions created" value={`${linked}/${open.length}`} icon={Activity} /><OverviewStat label="Ready to verify" value={completed} icon={CheckCircle2} /><OverviewStat label="Past response target" value={open.filter((flag) => isRedFlagOverdue(flag)).length} icon={ShieldAlert} /></CardContent></Card>

    <Card className="min-w-0 gap-0 xl:col-span-7"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Recent Red Flags</CardTitle><p className="text-xs text-muted-foreground">Latest raised or updated issues</p></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/65">{recent.map((flag) => <Link key={flag.id} href={`/red-flag/${encodeURIComponent(flag.id)}`} className="group flex min-w-0 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", RED_FLAG_SEVERITY_CONFIG[flag.severity].soft)}><Flag className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{flag.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{flag.id} · {flag.zone} · {flag.raisedByName}</span></span><div className="hidden items-center gap-2 sm:flex"><SeverityBadge severity={flag.severity} /><RedFlagStatusBadge status={flag.status} /></div><ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" /></Link>)}</div></CardContent></Card>
    <Card className="min-w-0 gap-0 xl:col-span-5"><CardHeader className="border-b pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-[15px]">Recurring Issues</CardTitle><p className="mt-1 text-xs text-muted-foreground">Similar patterns worth systemic follow-up</p></div><Badge variant={recurring.length ? "warning" : "success"}>{recurring.length} pattern{recurring.length === 1 ? "" : "s"}</Badge></div></CardHeader><CardContent className="p-0">{recurring.length ? <div className="divide-y divide-border/65">{recurring.map((item) => <div key={item.label} className="px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{item.label}</p><Badge variant="warning">{item.count} flags</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.zones.join(" · ")} · latest {formatDateTime(item.latest)}</p></div>)}</div> : <div className="grid min-h-36 place-items-center px-5 text-center"><p className="text-xs text-muted-foreground">No recurring patterns identified yet.</p></div>}</CardContent></Card>
  </div>;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", color)} style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}

function OverviewStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return <div className="min-w-0 bg-card p-4"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}

function recurringIssues(flags: RedFlag[]) {
  const groups = new Map<string, RedFlag[]>();
  flags.forEach((flag) => {
    const text = `${flag.title} ${flag.description}`.toLowerCase();
    const key = /hydraulic|oil leak|oil residue|oil seep/.test(text) ? "Hydraulic oil leakage" : flag.machineAsset ? flag.machineAsset : "";
    if (key) groups.set(key, [...(groups.get(key) ?? []), flag]);
  });
  return Array.from(groups.entries()).filter(([, items]) => items.length > 1).map(([label, items]) => ({ label, count: items.length, zones: Array.from(new Set(items.map((item) => item.zone))), latest: [...items].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))[0].raisedAt }));
}

function RedFlagLibrary({ flags, actions, tab, initialStatus, initialSeverity }: { flags: RedFlag[]; actions: MyAction[]; tab: Exclude<LandingTab, "overview">; initialStatus?: string; initialSeverity?: string }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState(initialSeverity && ["Critical", "High", "Medium", "Low"].includes(initialSeverity) ? initialSeverity : "All");
  const [status, setStatus] = useState(initialStatus && ["Open", "Action Created", "In Progress", "Awaiting Closure", "Closed", "Cancelled"].includes(initialStatus) ? initialStatus : "All");
  const [plant, setPlant] = useState("All");
  const [zone, setZone] = useState("All");
  const [raisedBy, setRaisedBy] = useState("All");
  const [actionStatus, setActionStatus] = useState("All");
  const [date, setDate] = useState("All");
  const [moreOpen, setMoreOpen] = useState(false);
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  const plants = Array.from(new Set(flags.map((flag) => flag.plant))).sort();
  const zones = Array.from(new Set(flags.filter((flag) => plant === "All" || flag.plant === plant).map((flag) => flag.zone))).sort();
  const raisers = Array.from(new Set(flags.map((flag) => flag.raisedByName))).sort();
  const now = new Date();
  const base = tab === "awaiting-closure" ? flags.filter((flag) => flag.status === "Awaiting Closure") : tab === "closed" ? flags.filter((flag) => flag.status === "Closed") : flags;
  const filtered = base.filter((flag) => {
    const linked = flag.actionId ? actionMap.get(flag.actionId) : undefined;
    const since = date === "All" ? 0 : new Date(now.getTime() - Number(date) * 86_400_000).getTime();
    return [flag.id, flag.title, flag.description, flag.location, flag.machineAsset, flag.raisedByName].join(" ").toLowerCase().includes(search.toLowerCase())
      && (severity === "All" || flag.severity === severity) && (status === "All" || flag.status === status)
      && (plant === "All" || flag.plant === plant) && (zone === "All" || flag.zone === zone) && (raisedBy === "All" || flag.raisedByName === raisedBy)
      && (actionStatus === "All" || (actionStatus === "No Action" ? !flag.actionId : linked?.status === actionStatus))
      && (!since || new Date(flag.raisedAt).getTime() >= since);
  }).sort((a, b) => {
    const aResolved = a.status === "Closed" || a.status === "Cancelled";
    const bResolved = b.status === "Closed" || b.status === "Cancelled";
    if (aResolved !== bResolved) return aResolved ? 1 : -1;
    if (a.status === "Closed" && b.status === "Closed") return b.closedAt!.localeCompare(a.closedAt!);
    return RED_FLAG_SEVERITY_CONFIG[b.severity].rank - RED_FLAG_SEVERITY_CONFIG[a.severity].rank || a.raisedAt.localeCompare(b.raisedAt);
  });

  return <Card className="min-w-0 gap-0 overflow-hidden">
    <CardContent className="border-b p-3"><div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_160px_180px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, issue, location, asset..." /></div><FilterSelect value={severity} onChange={setSeverity} all="All severities" options={["Critical", "High", "Medium", "Low"]} /><FilterSelect value={status} onChange={setStatus} all="All statuses" options={["Open", "Action Created", "In Progress", "Awaiting Closure", "Closed", "Cancelled"]} /><Button type="button" variant="outline" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}><ListFilter className="size-4" />More Filters<ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} /></Button></div>
      {moreOpen && <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><FilterSelect value={plant} onChange={(value) => { setPlant(value); setZone("All"); }} all="All plants" options={plants} /><FilterSelect value={zone} onChange={setZone} all="All zones" options={zones} /><FilterSelect value={raisedBy} onChange={setRaisedBy} all="Raised by anyone" options={raisers} /><FilterSelect value={actionStatus} onChange={setActionStatus} all="Any action status" options={["No Action", "Awaiting Assignment", "Assigned", "In Progress", "Overdue", "Pending Auditor Review", "Rework Required", "Completed"]} /><FilterSelect value={date} onChange={setDate} all="Any raised date" options={["7", "30", "90"]} labels={{ "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" }} /></div>}
    </CardContent>
    <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1280px] text-sm"><thead className="border-b bg-muted/25 text-left text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Plant / Zone</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Raised By / On</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Age</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border/65">{filtered.map((flag) => { const linked = flag.actionId ? actionMap.get(flag.actionId) : undefined; return <tr key={flag.id} className={cn("hover:bg-muted/25", flag.severity === "Critical" && flag.status !== "Closed" && "bg-red-500/[0.025]")}><td className="px-4 py-3 font-mono text-xs font-medium"><Link href={`/red-flag/${flag.id}`} className="hover:underline">{flag.id}</Link></td><td className="max-w-sm px-4 py-3"><Link href={`/red-flag/${flag.id}`} className="block truncate text-xs font-medium hover:underline">{flag.title}</Link><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{flag.location}{flag.machineAsset ? ` · ${flag.machineAsset}` : ""}</p></td><td className="px-4 py-3"><p className="text-xs font-medium">{flag.plant}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{flag.zone}</p></td><td className="px-4 py-3"><SeverityBadge severity={flag.severity} /></td><td className="px-4 py-3"><p className="text-xs">{flag.raisedByName}</p><p className="mt-0.5 whitespace-nowrap text-[11px] text-muted-foreground">{formatDateTime(flag.raisedAt)}</p></td><td className="px-4 py-3">{linked ? <Link href={`/actions/${linked.id}`}><Badge variant={ACTION_STATUS_CONFIG[linked.status].variant}>{linked.status}</Badge></Link> : flag.severity === "Critical" || flag.severity === "High" ? <Badge variant="warning">Recommended</Badge> : <span className="text-xs text-muted-foreground">None</span>}</td><td className="px-4 py-3"><RedFlagStatusBadge status={flag.status} /></td><td className="px-4 py-3"><AgeIndicator flag={flag} /></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/red-flag/${flag.id}`} />} aria-label={`View ${flag.id}`}><Eye className="size-4" /></Button><Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/red-flag/${flag.id}/report`} />} aria-label={`Report for ${flag.id}`}><FileText className="size-4" /></Button></div></td></tr>; })}</tbody></table></div>
    <div className="grid gap-2 p-3 lg:hidden">{filtered.map((flag) => { const linked = flag.actionId ? actionMap.get(flag.actionId) : undefined; return <Link key={flag.id} href={`/red-flag/${flag.id}`} className={cn("rounded-lg border border-l-[3px] bg-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring", flag.severity === "Critical" ? "border-l-red-500" : flag.severity === "High" ? "border-l-orange-500" : "border-l-border")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[11px] font-medium text-muted-foreground">{flag.id}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{flag.title}</p></div><SeverityBadge severity={flag.severity} /></div><p className="mt-2 text-xs text-muted-foreground">{flag.plant} · {flag.zone} · {flag.location}</p><div className="mt-3 flex flex-wrap items-center gap-2"><RedFlagStatusBadge status={flag.status} />{linked && <Badge variant={ACTION_STATUS_CONFIG[linked.status].variant}>{linked.status}</Badge>}<span className="ml-auto"><AgeIndicator flag={flag} /></span></div></Link>; })}</div>
    {!filtered.length && <EmptyRedFlags />}
  </Card>;
}

function FilterSelect({ value, onChange, options, all, labels }: { value: string; onChange: (value: string) => void; options: string[]; all: string; labels?: Record<string, string> }) {
  return <Select value={value} onValueChange={(next) => onChange(next ?? "All")}><SelectTrigger className="w-full"><SelectValue>{value === "All" ? all : labels?.[value] ?? value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="All">{all}</SelectItem>{options.map((item) => <SelectItem key={item} value={item}>{labels?.[item] ?? item}</SelectItem>)}</SelectContent></Select>;
}
