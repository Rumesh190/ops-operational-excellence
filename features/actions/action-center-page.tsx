"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Paperclip,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { hasPermission } from "@/features/five-s/administration/permissions";
import type { MyAction, MyActionEvidence, MyActionPriority } from "@/features/five-s/types/my-actions";
import {
  ACTION_PRIORITY_CONFIG,
  ACTION_STATUS_CONFIG,
  actionDueDays,
  formatShortDate,
  getActionDueLabel,
  getActionSourceDefinition,
  getActionUpdatedAt,
  getEnabledActionSources,
  isActionOverdue,
} from "@/lib/actions/action-config";
import { getActionEscalations } from "@/lib/actions/action-attention-store";
import { createAction, useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage } from "@/lib/evidence-images";
import { useFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { useActiveActionCategories } from "@/lib/actions/action-category-store";
import { getPriorityDueDate, useActiveActionPriorities } from "@/lib/actions/action-configuration-store";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { cn } from "@/lib/utils";
import {
  ACTION_CENTER_TABS,
  canViewTeamActions,
  filterActionCenterItems,
  getActionCenterCounts,
  getActionsForTab,
  getReviewAgeLabel,
  type ActionCenterFilters,
  type ActionCenterTab,
  type ActionDueFilter,
  type ActionStatusFilter,
} from "./action-center-data";

interface ActionCenterPageProps {
  initialTab?: string;
  initialStatus?: string;
  initialSource?: string;
}

const STATUS_FILTERS: ActionStatusFilter[] = ["All", "Open", "Overdue", "Awaiting Assignment", "Assigned", "In Progress", "Pending Auditor Review", "Rework Required", "Completed"];
const DUE_FILTERS: ActionDueFilter[] = ["All", "Overdue", "Today", "Tomorrow", "Next 7 days"];
const PRIORITIES: Array<"All" | MyActionPriority> = ["All", "Critical", "High", "Medium", "Low"];

function validTab(value?: string): ActionCenterTab {
  return ACTION_CENTER_TABS.some((tab) => tab.id === value) ? value as ActionCenterTab : "my-actions";
}

function validStatus(value?: string): ActionStatusFilter {
  const normalized = value === "open" ? "Open" : value === "overdue" ? "Overdue" : value;
  return STATUS_FILTERS.includes(normalized as ActionStatusFilter) ? normalized as ActionStatusFilter : "All";
}

export default function ActionCenterPage({ initialTab, initialStatus, initialSource }: ActionCenterPageProps) {
  const router = useRouter();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const access = useModuleEntitlements();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const canCreate = hasPermission(adminUser, "actions.create") && !currentUser.isSuperAdmin;
  const [activeTab, setActiveTab] = useState<ActionCenterTab>(() => validTab(initialTab));
  const [moreFilters, setMoreFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<ActionCenterFilters>(() => ({
    search: "",
    source: getEnabledActionSources(access).some((source) => source.id === initialSource) ? initialSource as ActionCenterFilters["source"] : "All",
    status: validStatus(initialStatus),
    priority: "All",
    plant: "All",
    zone: "All",
    assignedTo: "All",
    due: initialStatus === "overdue" ? "Overdue" : "All",
  }));

  const counts = useMemo(() => getActionCenterCounts(actions, currentUser, adminUser), [actions, currentUser, adminUser]);
  const tabActions = useMemo(() => getActionsForTab(actions, activeTab, currentUser, adminUser), [actions, activeTab, currentUser, adminUser]);
  const filtered = useMemo(() => filterActionCenterItems(tabActions, filters), [filters, tabActions]);
  const sourceOptions = getEnabledActionSources(access);
  const tabs = ACTION_CENTER_TABS.filter((tab) => tab.id !== "team-actions" || canViewTeamActions(adminUser));
  const activeFilterCount = [filters.source, filters.status, filters.priority, filters.plant, filters.zone, filters.assignedTo, filters.due].filter((value) => value !== "All").length;

  function updateFilter<K extends keyof ActionCenterFilters>(key: K, value: ActionCenterFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ search: "", source: "All", status: "All", priority: "All", plant: "All", zone: "All", assignedTo: "All", due: "All" });
  }

  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="OPS Workspace" title="Actions" description="Track, complete, review, and close actions created across OPS." actions={canCreate ? <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create Action</Button> : undefined} />

    <OpsTabBar label="Actions sections" active={activeTab} onChange={(id) => setActiveTab(id as ActionCenterTab)} tabs={[...tabs.map((tab) => ({ ...tab, count: counts.tabs[tab.id] })), { id: "settings", label: "Settings", href: "/actions/settings" }]} />

    <section aria-label="Action summary" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <SummaryMetric label="Open" value={counts.open} tone="warning" onClick={() => updateFilter("status", "Open")} />
      <SummaryMetric label="Overdue" value={counts.overdue} tone="danger" onClick={() => { updateFilter("status", "Overdue"); updateFilter("due", "Overdue"); }} />
      <SummaryMetric label="Critical" value={counts.critical} tone="danger" onClick={() => updateFilter("priority", "Critical")} />
      <SummaryMetric label="Awaiting Review" value={counts.awaitingReview} tone="info" onClick={() => setActiveTab("awaiting-review")} />
      <SummaryMetric label="Completed This Month" value={counts.completedThisMonth} tone="success" onClick={() => setActiveTab("completed")} />
    </section>

    <Card className="min-w-0 gap-0 overflow-hidden">
      <CardContent className="border-b p-3">
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_170px_160px_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} className="pl-9" placeholder="Search actions, source, person..." /></div>
          <FilterSelect value={filters.source} onChange={(value) => updateFilter("source", value as ActionCenterFilters["source"])} ariaLabel="Source module"><SelectItem value="All">All sources</SelectItem>{sourceOptions.map((source) => <SelectItem key={source.id} value={source.id}>{source.label}</SelectItem>)}</FilterSelect>
          <FilterSelect value={filters.status} onChange={(value) => updateFilter("status", value as ActionStatusFilter)} ariaLabel="Status"><SelectItem value="All">All statuses</SelectItem>{STATUS_FILTERS.filter((item) => item !== "All").map((item) => <SelectItem key={item} value={item}>{item === "Open" ? "Open / Active" : item}</SelectItem>)}</FilterSelect>
          <FilterSelect value={filters.priority} onChange={(value) => updateFilter("priority", value as ActionCenterFilters["priority"])} ariaLabel="Priority"><SelectItem value="All">All priorities</SelectItem>{PRIORITIES.filter((item) => item !== "All").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</FilterSelect>
          <Button type="button" variant={moreFilters || activeFilterCount > 3 ? "secondary" : "outline"} onClick={() => setMoreFilters((value) => !value)}><SlidersHorizontal className="size-4" />More filters{activeFilterCount > 0 && <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilterCount}</span>}<ChevronDown className={cn("size-3.5 transition-transform", moreFilters && "rotate-180")} /></Button>
        </div>
        {moreFilters && <div className="mt-2 grid min-w-0 gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <FilterSelect value={filters.plant} onChange={(value) => updateFilter("plant", value)} ariaLabel="Plant"><SelectItem value="All">All plants</SelectItem>{counts.plants.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</FilterSelect>
          <FilterSelect value={filters.zone} onChange={(value) => updateFilter("zone", value)} ariaLabel="Zone"><SelectItem value="All">All zones</SelectItem>{counts.zones.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</FilterSelect>
          <FilterSelect value={filters.assignedTo} onChange={(value) => updateFilter("assignedTo", value)} ariaLabel="Action Owner"><SelectItem value="All">All Action Owners</SelectItem>{counts.assignees.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</FilterSelect>
          <FilterSelect value={filters.due} onChange={(value) => updateFilter("due", value as ActionDueFilter)} ariaLabel="Due date"><SelectItem value="All">Any due date</SelectItem>{DUE_FILTERS.filter((item) => item !== "All").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</FilterSelect>
          <Button variant="ghost" onClick={resetFilters}><X className="size-4" />Clear</Button>
        </div>}
      </CardContent>

      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="border-b bg-muted/25 text-left text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Action Owner</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due / Review Age</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border/65">{filtered.map((action) => <ActionTableRow key={action.id} action={action} reviewMode={activeTab === "awaiting-review"} onOpen={() => router.push(`/actions/${encodeURIComponent(action.id)}`)} onReport={() => router.push(`/actions/${encodeURIComponent(action.id)}/report`)} />)}</tbody>
        </table>
      </div>

      <div className="grid gap-2 p-3 lg:hidden">{filtered.map((action) => <ActionMobileCard key={action.id} action={action} reviewMode={activeTab === "awaiting-review"} onOpen={() => router.push(`/actions/${encodeURIComponent(action.id)}`)} />)}</div>

      {filtered.length === 0 && <OpsEmptyState icon={CheckCircle2} title={filters.status === "Overdue" || filters.due === "Overdue" ? "No overdue actions" : `No actions in ${ACTION_CENTER_TABS.find((tab) => tab.id === activeTab)?.label ?? "this view"}`} description={filters.status === "Overdue" || filters.due === "Overdue" ? "You’re up to date." : "Try changing the current filters."} action={activeFilterCount > 0 ? <Button size="sm" variant="outline" onClick={resetFilters}>Clear filters</Button> : undefined} />}
    </Card>

    <ManualActionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(action) => router.push(`/actions/${encodeURIComponent(action.id)}`)} />
  </PageContainer>;
}

function SummaryMetric({ label, value, tone, onClick }: { label: string; value: number; tone: "warning" | "danger" | "info" | "success"; onClick: () => void }) {
  const tones = { warning: "bg-amber-500", danger: "bg-red-500", info: "bg-sky-500", success: "bg-emerald-500" };
  return <button type="button" onClick={onClick} className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3 text-left shadow-sm outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("absolute inset-y-3 left-0 w-0.5 rounded-r-full", tones[tone])} /><p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold leading-none tabular-nums">{value}</p></button>;
}

function FilterSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (value: string) => void; ariaLabel: string; children: React.ReactNode }) {
  return <Select value={value} onValueChange={(next) => onChange(next ?? "All")}><SelectTrigger className="w-full" aria-label={ariaLabel}><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select>;
}

function SourceBadge({ action }: { action: MyAction }) {
  const source = getActionSourceDefinition(action);
  const Icon = source.icon;
  return <Badge variant="outline" size="sm" className="gap-1 border-border/80 bg-muted/25 font-normal text-muted-foreground"><Icon className="size-3" />{source.label}</Badge>;
}

function ActionTableRow({ action, reviewMode, onOpen, onReport }: { action: MyAction; reviewMode: boolean; onOpen: () => void; onReport: () => void }) {
  const status = ACTION_STATUS_CONFIG[action.status];
  const priority = ACTION_PRIORITY_CONFIG[action.priority];
  const overdue = isActionOverdue(action);
  return <tr className="transition-colors hover:bg-muted/25">
    <td className="max-w-[300px] px-4 py-3"><button type="button" onClick={onOpen} className="block min-w-0 text-left outline-none focus-visible:underline"><span className="block truncate font-medium">{action.title}</span><span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{action.id}</span></button></td>
    <td className="max-w-[190px] px-4 py-3"><SourceBadge action={action} /><p className="mt-1 truncate text-[11px] text-muted-foreground" title={action.sourceId ?? action.sourceTitle}>{action.sourceId ?? action.sourceTitle}</p></td>
    <td className="max-w-[150px] px-4 py-3"><p className="truncate text-xs font-medium">{action.responsiblePersonName ?? action.assignedTo ?? "Unassigned"}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{action.area}</p></td>
    <td className="px-4 py-3"><Badge variant={priority.variant} size="sm">{priority.label}</Badge></td>
    <td className="px-4 py-3"><p className={cn("whitespace-nowrap text-xs font-medium", overdue && "text-red-600 dark:text-red-400")}>{reviewMode ? getReviewAgeLabel(action) : getActionDueLabel(action)}</p>{reviewMode && <p className="mt-0.5 text-[10px] text-muted-foreground">{formatShortDate(action.submittedForReviewAt ?? getActionUpdatedAt(action))}</p>}</td>
    <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><Badge variant={status.variant} size="sm">{status.label}</Badge><ActionAttentionBadges action={action} /></div></td>
    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatShortDate(getActionUpdatedAt(action))}</td>
    <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={onOpen} aria-label={`View ${action.id}`}><Eye className="size-4" /></Button>{action.status === "Completed" && <Button size="icon-sm" variant="ghost" onClick={onReport} aria-label={`View report for ${action.id}`}><FileText className="size-4" /></Button>}</div></td>
  </tr>;
}

function ActionMobileCard({ action, reviewMode, onOpen }: { action: MyAction; reviewMode: boolean; onOpen: () => void }) {
  const priority = ACTION_PRIORITY_CONFIG[action.priority];
  const status = ACTION_STATUS_CONFIG[action.status];
  return <button type="button" onClick={onOpen} className="min-w-0 rounded-lg border bg-background p-4 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="line-clamp-2 text-sm font-semibold">{action.title}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{action.id}</p></div><Badge variant={priority.variant} size="sm">{priority.label}</Badge></div><div className="mt-3 flex flex-wrap items-center gap-2"><SourceBadge action={action} /><Badge variant={status.variant} size="sm">{status.label}</Badge><ActionAttentionBadges action={action} /></div><div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className={cn("inline-flex items-center gap-1 text-muted-foreground", isActionOverdue(action) && "text-red-600 dark:text-red-400")}><CalendarDays className="size-3.5" />{reviewMode ? getReviewAgeLabel(action) : getActionDueLabel(action)}</span><span className="truncate text-muted-foreground">{action.area}</span></div></button>;
}

function ActionAttentionBadges({ action }: { action: MyAction }) {
  if (action.status === "Completed") return null;
  const escalation = getActionEscalations(action.id).find((item) => item.status !== "Resolved");
  const days = actionDueDays(action);
  return <>{days === 1 && <Badge variant="warning" size="sm">Due Soon</Badge>}{days < 0 && <Badge variant="danger" size="sm">Overdue</Badge>}{escalation && <Badge variant="danger" size="sm">Escalated · L{escalation.level}</Badge>}</>;
}

function ManualActionDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (action: MyAction) => void }) {
  const actionCategories = useActiveActionCategories();
  const actionPriorities = useActiveActionPriorities();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const currentPlant = adminUser?.plant ?? currentUser.plant;
  const zones = useFiveSZoneConfiguration();
  const defaultZone = zones.find((item) => item.name === currentUser.primaryZone) ?? zones[0];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zoneName, setZoneName] = useState(defaultZone?.name ?? "");
  const [priority, setPriority] = useState<MyActionPriority>("Medium");
  const [category, setCategory] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [evidence, setEvidence] = useState<MyActionEvidence[]>([]);
  const [busy, setBusy] = useState(false);
  const zone = zones.find((item) => item.name === zoneName) ?? defaultZone;
  const effectivePriority = actionPriorities.some((item) => item.id === priority) ? priority : actionPriorities[0]?.id ?? priority;
  const dueDate = getPriorityDueDate(effectivePriority);
  const valid = title.trim() && description.trim() && category && responsibleId && zone;

  async function addEvidence(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files).slice(0, Math.max(0, MAX_EVIDENCE_IMAGES - evidence.length));
    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      const optimized = await optimizeEvidenceImage(file);
      setEvidence((items) => [...items, { id: `EV-${crypto.randomUUID()}`, evidenceType: "finding", name: file.name, type: "image", mimeType: file.type, uploadedAt: new Date().toISOString(), uploadedBy: currentUser.name, url: optimized.dataUrl }]);
    }
  }

  function submit() {
    if (!valid || !zone || busy) return;
    const responsible = zone.members.find((member) => member.id === responsibleId);
    if (!responsible) return;
    setBusy(true);
    const action = createAction({
      title: title.trim(), description: description.trim(), source: "Manual", sourceTitle: "Manual action", sourceModule: "manual", sourceLabel: "Manual", sourceLocation: zone.name, sourceObservation: description.trim(),
      plant: currentPlant, department: zone.department, area: zone.name, zoneId: zone.name, assignedTo: responsible.name,
      responsiblePersonId: responsible.id, responsiblePersonName: responsible.name, zoneLeaderId: zone.leaderId, zoneLeaderName: zone.leader,
      assignedByUserId: currentUser.id, assignedByName: currentUser.name, assignedAt: new Date().toISOString(),
      createdByUserId: currentUser.id, createdByName: currentUser.name, auditor: currentUser.name, status: "Assigned", priority: effectivePriority, dueDate,
      actionCategory: category, issueEvidence: evidence,
    });
    onOpenChange(false);
    setBusy(false);
    onCreated(action);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Create Manual Action</DialogTitle><DialogDescription>Create work that did not originate from another OPS module. The source will be recorded as Manual.</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><Field label="Action Title *"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Describe the required action" /></Field><Field label="Description *"><Textarea className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what needs to be completed..." /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Plant"><Input value={currentPlant} disabled /></Field><Field label="Zone *"><Select value={zoneName} onValueChange={(value) => { const next = value ?? defaultZone?.name ?? ""; setZoneName(next); setResponsibleId(""); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{zones.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Priority *"><Select value={effectivePriority} onValueChange={(value) => setPriority((value ?? actionPriorities[0]?.id ?? "Medium") as MyActionPriority)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{actionPriorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Due Date"><Input type="date" value={dueDate} disabled /></Field><Field label="Action Category *"><Select value={category} onValueChange={(value) => setCategory(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{actionCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Zone Leader"><Input value={zone?.leader ?? "—"} disabled /></Field><Field label="Action Owner *"><Select value={responsibleId} onValueChange={(value) => setResponsibleId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select Zone member" /></SelectTrigger><SelectContent>{zone?.members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Assigned By"><Input value={currentUser.name} disabled /></Field><Field label="Source"><Input value="Manual" disabled /></Field></div><Field label="Before Evidence"><label className="flex min-h-20 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/15 px-4 text-center text-xs text-muted-foreground hover:bg-muted/30"><input hidden type="file" accept="image/*" multiple onChange={(event) => { void addEvidence(event.target.files); event.target.value = ""; }} /><span><Paperclip className="mx-auto mb-1 size-4" />Add up to {MAX_EVIDENCE_IMAGES} images</span></label>{evidence.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{evidence.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"><span className="max-w-40 truncate">{item.name}</span><button type="button" onClick={() => setEvidence((items) => items.filter((evidenceItem) => evidenceItem.id !== item.id))} aria-label={`Remove ${item.name}`}><X className="size-3" /></button></span>)}</div>}</Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!valid || busy} onClick={submit}>{busy ? "Creating..." : "Create Action"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium">{label}{children}</label>;
}
