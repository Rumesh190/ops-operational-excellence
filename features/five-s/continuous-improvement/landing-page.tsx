"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Columns3, IndianRupee, List, Plus, Search, TrendingUp } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { canCreateImprovement, canViewImprovement } from "./access";
import { IMPROVEMENT_BENEFIT_TYPES, IMPROVEMENT_PIPELINE, IMPROVEMENT_STATUSES, IMPROVEMENT_STATUS_LABELS } from "./config";
import { formatImprovementDate, formatImprovementMoney, ImprovementEmpty, improvementAge, ImprovementStatusBadge, ImprovementTabs } from "./components";
import { getContinuousImprovementSummary, useImprovements } from "./store";
import type { ContinuousImprovement, ImprovementStatus } from "./types";

type LandingTab = "overview" | "improvements" | "review" | "completed";
type SortMode = "Newest" | "Oldest" | "Highest Proposed Saving" | "Highest Actual Saving" | "Longest Open";
type ListMode = "table" | "pipeline";

const LANDING_TABS: LandingTab[] = ["overview", "improvements", "review", "completed"];

export default function ContinuousImprovementLandingPage({ initialTab, initialStage }: { initialTab?: string; initialStage?: string }) {
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const all = useImprovements();
  const visible = all.filter((item) => canViewImprovement(adminUser, currentUser, item));
  const [activeTab, setActiveTab] = useState<LandingTab>(LANDING_TABS.includes(initialTab as LandingTab) ? initialTab as LandingTab : "overview");
  const summary = getContinuousImprovementSummary(visible);
  const canCreate = canCreateImprovement(adminUser, currentUser);
  const reviewItems = visible.filter((item) => ["submitted", "under_review", "on_hold", "awaiting_completion_review"].includes(item.status));
  const completed = visible.filter((item) => item.status === "completed");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "improvements", label: "Improvements", count: visible.length },
    { id: "review", label: "Review Queue", count: reviewItems.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];
  const metrics = [
    { label: "Proposed", value: summary.proposed },
    { label: "Under Review", value: summary.underReview },
    { label: "Approved", value: summary.approved },
    { label: "In Progress", value: summary.inProgress },
    { label: "Completed This Month", value: summary.completedThisMonth },
    { label: "Actual Savings", value: formatImprovementMoney(summary.actualSavings), accent: true },
  ];

  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="OPS Workspace" title="Continuous Improvement" description="Capture improvement ideas, review proposals, track implementation, and measure realized benefits." actions={canCreate ? <Button nativeButton={false} render={<Link href="/continuous-improvement/new" />}><Plus className="size-4" />New Improvement</Button> : undefined} />
    <ImprovementTabs tabs={[...tabs, { id: "settings", label: "Settings", href: "/continuous-improvement/settings" }]} active={activeTab} onChange={(id) => setActiveTab(id as LandingTab)} label="Continuous Improvement sections" />
    <section aria-label="Continuous Improvement summary" className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-3 xl:grid-cols-6">{metrics.map((metric, index) => <div key={metric.label} className={cn("min-w-0 p-3.5 sm:p-4", index > 0 && "border-l", index > 1 && index % 2 === 0 && "max-sm:border-l-0", metric.accent && "bg-primary/[0.045]")}><p className="truncate text-[11px] font-medium text-muted-foreground">{metric.label}</p><p className={cn("mt-1 truncate text-xl font-semibold tabular-nums", metric.accent && "text-emerald-700 dark:text-emerald-400")}>{metric.value}</p></div>)}</section>
    {activeTab === "overview" && <Overview records={visible} />}
    {activeTab === "improvements" && <ImprovementList records={visible} initialStage={initialStage} canCreate={canCreate} />}
    {activeTab === "review" && <ReviewQueue records={reviewItems} />}
    {activeTab === "completed" && <ImprovementList records={completed} initialStage="completed" canCreate={canCreate} compactFilters />}
  </PageContainer>;
}

function Overview({ records }: { records: ContinuousImprovement[] }) {
  const summary = getContinuousImprovementSummary(records);
  const zoneCounts = countBy(records, (item) => item.zone);
  const benefitCounts = countBy(records, (item) => item.benefitType);
  const recent = records.filter((item) => item.status === "completed").sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)).slice(0, 3);
  const maximum = Math.max(1, ...zoneCounts.map((item) => item.value), ...benefitCounts.map((item) => item.value));
  const overviewMetrics = [
    ["Ideas Submitted", records.filter((item) => item.submittedAt).length],
    ["Approval Rate", `${summary.approvalRate}%`],
    ["Active Improvements", summary.active],
    ["Completed This Month", summary.completedThisMonth],
    ["Proposed Savings", formatImprovementMoney(summary.proposedSavings)],
    ["Actual Savings", formatImprovementMoney(summary.actualSavings)],
    ["Avg. Completion", `${summary.averageCompletionDays} days`],
  ];
  return <div className="grid gap-4">
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">{overviewMetrics.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{value}</p></CardContent></Card>)}</section>
    <Pipeline records={records} />
    <section className="grid gap-4 lg:grid-cols-2"><Distribution title="Improvements by Zone" items={zoneCounts} maximum={maximum} /><Distribution title="Improvement Benefits" items={benefitCounts} maximum={maximum} /></section>
    <Card className="gap-0"><CardContent className="p-0"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-sm font-semibold">Recent Completed Improvements</h2><p className="mt-0.5 text-xs text-muted-foreground">Verified outcomes from the workplace.</p></div><Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/continuous-improvement?tab=completed" />}>View all<ArrowRight className="size-3.5" /></Button></div>{recent.length ? <div className="divide-y">{recent.map((item) => <Link key={item.id} href={`/continuous-improvement/${encodeURIComponent(item.id)}`} className="grid gap-2 px-4 py-3 outline-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_160px_150px_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.id} · {item.zone}</p></div><p className="text-xs text-muted-foreground">{item.ownerName}</p><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatImprovementMoney(item.actualSaving)}</p><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div> : <ImprovementEmpty title="No completed improvements yet" description="Completed and reviewed outcomes will appear here." />}</CardContent></Card>
  </div>;
}

function Pipeline({ records }: { records: ContinuousImprovement[] }) {
  return <Card><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><TrendingUp className="size-4 text-primary" /><h2 className="text-sm font-semibold">Improvement Pipeline</h2></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{IMPROVEMENT_PIPELINE.map((stage) => <Link key={stage.id} href={`/continuous-improvement?tab=improvements&stage=${stage.statuses[0]}`} className="rounded-lg border bg-muted/[0.12] p-3 outline-none transition-colors hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{records.filter((item) => (stage.statuses as readonly ImprovementStatus[]).includes(item.status)).length}</p></Link>)}</div></CardContent></Card>;
}

function Distribution({ title, items, maximum }: { title: string; items: Array<{ label: string; value: number }>; maximum: number }) {
  return <Card><CardContent className="p-4"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-4 grid gap-3">{items.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(8, item.value / maximum * 100)}%` }} /></div></div>)}</div></CardContent></Card>;
}

function ReviewQueue({ records }: { records: ContinuousImprovement[] }) {
  const sorted = [...records].sort((a, b) => (a.submittedAt ?? a.updatedAt).localeCompare(b.submittedAt ?? b.updatedAt));
  if (!sorted.length) return <Card><ImprovementEmpty title="No improvements awaiting review" description="Submitted proposals and completion packages will appear here." /></Card>;
  return <Card className="gap-0 overflow-hidden"><CardContent className="p-0"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[960px] text-sm"><thead className="border-b bg-muted/25 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr>{["Improvement", "Proposed By", "Plant / Zone", "Expected Benefit", "Proposed Saving", "Submitted", "Age", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{sorted.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="max-w-xs px-4 py-3"><p className="font-medium">{item.title}</p><div className="mt-1 flex items-center gap-2"><span className="font-mono text-[10px] text-primary">{item.id}</span><ImprovementStatusBadge status={item.status} /></div></td><td className="px-4 py-3">{item.proposedByName}</td><td className="px-4 py-3 text-muted-foreground">{item.plant}<br />{item.zone}</td><td className="max-w-xs px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{item.expectedBenefit}</span></td><td className="px-4 py-3 font-medium">{formatImprovementMoney(item.proposedSaving)}</td><td className="px-4 py-3 text-muted-foreground">{formatImprovementDate(item.submittedAt ?? item.updatedAt)}</td><td className="px-4 py-3">{improvementAge(item.submittedAt ?? item.createdAt)}</td><td className="px-4 py-3"><Button size="sm" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}?tab=review`} />}>Review</Button></td></tr>)}</tbody></table></div><div className="grid gap-3 p-3 md:hidden">{sorted.map((item) => <Link key={item.id} href={`/continuous-improvement/${encodeURIComponent(item.id)}?tab=review`} className="rounded-xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-semibold text-primary">{item.id}</span><ImprovementStatusBadge status={item.status} /></div><p className="mt-2 font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.proposedByName} · {item.zone} · {improvementAge(item.submittedAt ?? item.createdAt)}</p><div className="mt-3 flex items-center justify-between border-t pt-3 text-xs"><span className="line-clamp-1 text-muted-foreground">{item.expectedBenefit}</span><span className="ml-3 shrink-0 font-semibold">{formatImprovementMoney(item.proposedSaving)}</span></div></Link>)}</div></CardContent></Card>;
}

function ImprovementList({ records, initialStage, canCreate, compactFilters = false }: { records: ContinuousImprovement[]; initialStage?: string; canCreate: boolean; compactFilters?: boolean }) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<ImprovementStatus | "All">(IMPROVEMENT_STATUSES.includes(initialStage as ImprovementStatus) ? initialStage as ImprovementStatus : "All");
  const [plant, setPlant] = useState("All");
  const [zone, setZone] = useState("All");
  const [proposer, setProposer] = useState("All");
  const [owner, setOwner] = useState("All");
  const [reviewer, setReviewer] = useState("All");
  const [benefit, setBenefit] = useState("All");
  const [date, setDate] = useState("All");
  const [sort, setSort] = useState<SortMode>("Newest");
  const [more, setMore] = useState(false);
  const [mode, setMode] = useState<ListMode>("table");
  const now = new Date();
  const filtered = records.filter((item) => {
    const haystack = `${item.id} ${item.title} ${item.issueDescription} ${item.proposedByName} ${item.ownerName} ${item.zone}`.toLowerCase();
    const itemDate = new Date(item.createdAt);
    return haystack.includes(search.toLowerCase()) && (stage === "All" || item.status === stage) && (plant === "All" || item.plant === plant) && (zone === "All" || item.zone === zone) && (proposer === "All" || item.proposedByName === proposer) && (owner === "All" || item.ownerName === owner) && (reviewer === "All" || item.reviewerName === reviewer) && (benefit === "All" || item.benefitType === benefit) && (date === "All" || (date === "This Month" ? itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear() : now.getTime() - itemDate.getTime() <= 30 * 86_400_000));
  }).sort((a, b) => sort === "Oldest" ? a.createdAt.localeCompare(b.createdAt) : sort === "Highest Proposed Saving" ? (b.proposedSaving ?? 0) - (a.proposedSaving ?? 0) : sort === "Highest Actual Saving" ? (b.actualSaving ?? 0) - (a.actualSaving ?? 0) : sort === "Longest Open" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const options = (values: string[]) => [...new Set(values)].sort();
  return <div className="grid gap-3">
    <Card className="gap-0"><CardContent className="grid gap-2 p-3"><div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_190px_220px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search improvements..." /></div><FilterSelect value={stage} onChange={(value) => setStage(value as ImprovementStatus | "All")} all="All stages" options={IMPROVEMENT_STATUSES.map((value) => ({ value, label: IMPROVEMENT_STATUS_LABELS[value] }))} /><FilterSelect value={sort} onChange={(value) => setSort(value as SortMode)} all="Newest" options={["Oldest", "Highest Proposed Saving", "Highest Actual Saving", "Longest Open"].map((value) => ({ value, label: value }))} /><div className="flex gap-1"><Button type="button" variant={mode === "table" ? "secondary" : "ghost"} size="icon" onClick={() => setMode("table")} aria-label="Table view"><List className="size-4" /></Button><Button type="button" variant={mode === "pipeline" ? "secondary" : "ghost"} size="icon" onClick={() => setMode("pipeline")} aria-label="Pipeline view"><Columns3 className="size-4" /></Button></div></div>{!compactFilters && <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect value={plant} onChange={setPlant} all="All plants" options={options(records.map((item) => item.plant)).map((value) => ({ value, label: value }))} /><FilterSelect value={zone} onChange={setZone} all="All zones" options={options(records.map((item) => item.zone)).map((value) => ({ value, label: value }))} /><FilterSelect value={proposer} onChange={setProposer} all="All proposers" options={options(records.map((item) => item.proposedByName)).map((value) => ({ value, label: value }))} /><FilterSelect value={owner} onChange={setOwner} all="All owners" options={options(records.map((item) => item.ownerName)).map((value) => ({ value, label: value }))} /></div><Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setMore((value) => !value)}>More Filters<ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} /></Button>{more && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><FilterSelect value={reviewer} onChange={setReviewer} all="All reviewers" options={options(records.flatMap((item) => item.reviewerName ? [item.reviewerName] : [])).map((value) => ({ value, label: value }))} /><FilterSelect value={date} onChange={setDate} all="All dates" options={["This Month", "Last 30 Days"].map((value) => ({ value, label: value }))} /><FilterSelect value={benefit} onChange={setBenefit} all="All benefit types" options={IMPROVEMENT_BENEFIT_TYPES.map((value) => ({ value, label: value }))} /></div>}</>}</CardContent></Card>
    {mode === "pipeline" ? <PipelineBoard records={filtered} /> : filtered.length ? <ImprovementTable records={filtered} /> : <Card><ImprovementEmpty title="No improvement ideas match this view" description="Adjust the filters or capture a new workplace improvement." action={canCreate ? <Button size="sm" nativeButton={false} render={<Link href="/continuous-improvement/new" />}><Plus className="size-3.5" />New Improvement</Button> : undefined} /></Card>}
  </div>;
}

function ImprovementTable({ records }: { records: ContinuousImprovement[] }) {
  return <Card className="gap-0 overflow-hidden"><CardContent className="p-0"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1180px] text-sm"><thead className="border-b bg-muted/25 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr>{["Improvement", "Plant / Zone", "Proposed By", "Owner", "Estimated Benefit", "Stage", "Age", "Updated", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{records.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="max-w-xs px-4 py-3"><p className="font-medium">{item.title}</p><p className="mt-1 font-mono text-[10px] text-primary">{item.id}</p></td><td className="px-4 py-3 text-muted-foreground">{item.plant}<br />{item.zone}</td><td className="px-4 py-3">{item.proposedByName}</td><td className="px-4 py-3">{item.ownerName}</td><td className="px-4 py-3"><p className="font-medium">{formatImprovementMoney(item.proposedSaving)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.benefitType}</p></td><td className="px-4 py-3"><ImprovementStatusBadge status={item.status} /></td><td className="px-4 py-3">{item.status === "completed" ? "—" : improvementAge(item.createdAt)}</td><td className="px-4 py-3 text-muted-foreground">{formatImprovementDate(item.updatedAt)}</td><td className="px-4 py-3"><Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}`} />}>View<ArrowRight className="size-3.5" /></Button></td></tr>)}</tbody></table></div><div className="grid gap-3 p-3 md:hidden">{records.map((item) => <Link key={item.id} href={`/continuous-improvement/${encodeURIComponent(item.id)}`} className="rounded-xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-semibold text-primary">{item.id}</span><ImprovementStatusBadge status={item.status} /></div><p className="mt-2 font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.plant} · {item.zone}</p><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs"><div><p className="text-muted-foreground">Owner</p><p className="mt-1 font-medium">{item.ownerName}</p></div><div><p className="text-muted-foreground">Estimated Benefit</p><p className="mt-1 font-medium">{formatImprovementMoney(item.proposedSaving)}</p></div></div></Link>)}</div></CardContent></Card>;
}

function PipelineBoard({ records }: { records: ContinuousImprovement[] }) {
  return <div className="grid gap-3 overflow-x-auto pb-2"><div className="grid min-w-[1100px] grid-cols-6 gap-3">{IMPROVEMENT_PIPELINE.map((stage) => { const items = records.filter((item) => (stage.statuses as readonly ImprovementStatus[]).includes(item.status)); return <section key={stage.id} className="rounded-xl border bg-muted/[0.12] p-2.5"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold">{stage.label}</h2><Badge variant="secondary">{items.length}</Badge></div><div className="grid gap-2">{items.map((item) => <Link key={item.id} href={`/continuous-improvement/${encodeURIComponent(item.id)}`} className="rounded-lg border bg-card p-3 shadow-sm outline-none hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"><p className="line-clamp-2 text-xs font-semibold leading-5">{item.title}</p><p className="mt-2 font-mono text-[9px] text-primary">{item.id}</p><p className="mt-2 truncate text-[10px] text-muted-foreground">{item.ownerName} · {item.zone}</p>{typeof item.proposedSaving === "number" && <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"><IndianRupee className="size-3" />{formatImprovementMoney(item.proposedSaving)}</p>}</Link>)}</div></section>; })}</div></div>;
}

function FilterSelect({ value, onChange, all, options }: { value: string; onChange: (value: string) => void; all: string; options: Array<{ value: string; label: string }> }) {
  const allValue = all === "Newest" ? "Newest" : "All";
  return <Select value={value} onValueChange={(next) => onChange(next ?? allValue)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={allValue}>{all}</SelectItem>{options.filter((option) => option.value !== allValue).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function countBy(records: ContinuousImprovement[], key: (item: ContinuousImprovement) => string) {
  const counts = new Map<string, number>();
  records.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
