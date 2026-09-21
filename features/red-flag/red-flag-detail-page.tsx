"use client";
/* eslint-disable @next/next/no-img-element -- action evidence may use dynamic data URLs. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, FileCheck2, FileText, ImageIcon, Link2, MapPin, Plus, RotateCcw, ShieldAlert, UserRound } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CreateLinkedActionDialog, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import type { MyAction, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { ACTION_STATUS_CONFIG, formatShortDate, getActionDueLabel } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { canCloseRedFlag, canManageRedFlag, visibleRedFlags } from "./red-flag-access";
import { AgeIndicator, EvidenceGallery, EvidencePicker, formatDateTime, RedFlagActivityTimeline, RedFlagStatusBadge, RedFlagTabBar, SeverityBadge } from "./red-flag-components";
import { addRedFlagEvidence, closeRedFlag, linkRedFlagAction, reconcileRedFlagActions, reopenRedFlag, useRedFlagStore } from "./red-flag-store";
import type { RedFlag, RedFlagEvidence } from "./types";

type DetailTab = "overview" | "evidence" | "action" | "activity" | "closure";
const VALID_TABS: DetailTab[] = ["overview", "evidence", "action", "activity", "closure"];

export default function RedFlagDetailPage({ flagId, initialTab }: { flagId: string; initialTab?: string }) {
  const allFlags = useRedFlagStore();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const flag = visibleRedFlags(allFlags, adminUser, currentUser).find((item) => item.id === flagId);
  const [active, setActive] = useState<DetailTab>(VALID_TABS.includes(initialTab as DetailTab) ? initialTab as DetailTab : "overview");

  useEffect(() => { reconcileRedFlagActions(actions); }, [actions]);

  if (!flag) return <PageContainer><FiveSPageHeader eyebrow="OPS Workspace" title="Red Flag unavailable" description="This record does not exist or is outside your operational scope." /><Card><CardContent className="grid min-h-48 place-items-center p-6"><Button variant="outline" nativeButton={false} render={<Link href="/red-flag" />}><ArrowLeft className="size-4" />Back to Red Flag</Button></CardContent></Card></PageContainer>;
  const action = flag.actionId ? actions.find((item) => item.id === flag.actionId) : undefined;
  const mayManage = canManageRedFlag(adminUser, currentUser, flag);
  const mayClose = canCloseRedFlag(adminUser, currentUser, flag);

  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="OPS Workspace" title={flag.title} description={`${flag.id} · ${flag.plant} · ${flag.zone} · ${flag.location}`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href="/red-flag" />} aria-label="Back to Red Flag"><ArrowLeft className="size-4" /></Button>} actions={<><Button variant="outline" nativeButton={false} render={<Link href={`/red-flag/${encodeURIComponent(flag.id)}/report`} />}><FileText className="size-4" />Report</Button>{action && <Button nativeButton={false} render={<Link href={`/actions/${encodeURIComponent(action.id)}`} />}><FileCheck2 className="size-4" />View Action</Button>}</>}>
      <div className="flex min-w-0 flex-wrap items-center gap-2"><SeverityBadge severity={flag.severity} /><RedFlagStatusBadge status={flag.status} /><AgeIndicator flag={flag} showSla />{flag.machineAsset && <Badge variant="outline">{flag.machineAsset}</Badge>}</div>
    </FiveSPageHeader>

    <RedFlagTabBar label="Red Flag record" active={active} onChange={(id) => setActive(id as DetailTab)} tabs={[{ id: "overview", label: "Overview" }, { id: "evidence", label: "Evidence", count: flag.evidence.length }, { id: "action", label: "Action", count: flag.actionId ? 1 : 0 }, { id: "activity", label: "Activity", count: flag.activity.length }, { id: "closure", label: "Closure" }]} />

    {active === "overview" && <Overview flag={flag} action={action} mayManage={mayManage} onAction={() => setActive("action")} />}
    {active === "evidence" && <EvidenceSection flag={flag} mayManage={mayManage} actor={currentUser} />}
    {active === "action" && <ActionSection flag={flag} action={action} mayManage={mayManage} actor={currentUser} />}
    {active === "activity" && <Card className="max-w-3xl gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Activity History</CardTitle><p className="text-xs text-muted-foreground">A traceable timeline of the issue, follow-up, and closure decisions.</p></CardHeader><CardContent className="p-5"><RedFlagActivityTimeline activity={flag.activity} /></CardContent></Card>}
    {active === "closure" && <ClosureSection flag={flag} action={action} mayClose={mayClose} actor={currentUser} />}
  </PageContainer>;
}

function Overview({ flag, action, mayManage, onAction }: { flag: RedFlag; action?: MyAction; mayManage: boolean; onAction: () => void }) {
  const initial = flag.evidence.filter((item) => item.group === "initial");
  return <div className="grid min-w-0 gap-4 xl:grid-cols-12">
    <div className="grid min-w-0 gap-4 xl:col-span-8">
      <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Issue</CardTitle></CardHeader><CardContent className="grid gap-5 p-5"><p className="text-sm leading-6">{flag.description}</p><div className="grid gap-4 sm:grid-cols-2"><Info label="Plant / Zone" value={`${flag.plant} · ${flag.zone}`} icon={MapPin} /><Info label="Location" value={flag.location} icon={MapPin} /><Info label="Raised by" value={flag.raisedByName} icon={UserRound} /><Info label="Raised on" value={formatDateTime(flag.raisedAt)} icon={ShieldAlert} />{flag.machineAsset && <Info label="Machine / Asset" value={flag.machineAsset} icon={FileCheck2} />}</div></CardContent></Card>
      <Card className="gap-0"><CardHeader className="border-b pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-[15px]">Initial Evidence</CardTitle><p className="mt-1 text-xs text-muted-foreground">Condition captured when the issue was raised</p></div><Badge variant="secondary">{initial.length} photo{initial.length === 1 ? "" : "s"}</Badge></div></CardHeader><CardContent className="p-5"><EvidenceGallery evidence={initial} /></CardContent></Card>
    </div>
    <div className="grid min-w-0 content-start gap-4 xl:col-span-4">
      <Card className={cn("gap-0", flag.immediateActionTaken ? "border-emerald-500/20" : "border-amber-500/20")}><CardHeader className="border-b pb-4"><div className="flex items-center gap-2"><span className={cn("grid size-8 place-items-center rounded-lg", flag.immediateActionTaken ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}><ShieldAlert className="size-4" /></span><div><CardTitle className="text-[15px]">Immediate Containment</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">{flag.immediateActionTaken ? "Action recorded" : "No immediate action recorded"}</p></div></div></CardHeader><CardContent className="p-5"><p className="text-sm leading-6 text-muted-foreground">{flag.containmentNote || "No containment note was provided when this Red Flag was raised."}</p></CardContent></Card>
      <Card className={cn("gap-0", !action && (flag.severity === "Critical" || flag.severity === "High") && "border-amber-500/25")}><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Corrective Action</CardTitle><p className="text-xs text-muted-foreground">Shared Action Center follow-up</p></CardHeader><CardContent className="p-5">{action ? <div><div className="flex flex-wrap items-center gap-2"><Badge variant={ACTION_STATUS_CONFIG[action.status].variant}>{action.status}</Badge><span className="font-mono text-xs text-muted-foreground">{action.id}</span></div><p className="mt-3 text-sm font-semibold">{action.title}</p><p className="mt-1 text-xs text-muted-foreground">{action.responsiblePersonName || action.assignedTo} · {getActionDueLabel(action)}</p><Button className="mt-4" variant="outline" nativeButton={false} render={<Link href={`/actions/${action.id}`} />}>Open Action<ExternalLink className="size-3.5" /></Button></div> : <div><p className="text-sm font-medium">No action linked</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{flag.severity === "Critical" || flag.severity === "High" ? `A formal action is recommended for this ${flag.severity.toLowerCase()} issue.` : "Create an action if ownership or longer-term correction is required."}</p>{mayManage && <Button className="mt-4" variant="outline" onClick={onAction}><Plus className="size-4" />Create Action</Button>}</div>}</CardContent></Card>
    </div>
  </div>;
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: typeof MapPin }) {
  return <div className="flex min-w-0 items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}

function EvidenceSection({ flag, mayManage, actor }: { flag: RedFlag; mayManage: boolean; actor: { id: string; name: string } }) {
  const [draft, setDraft] = useState<RedFlagEvidence[]>([]);
  const groups = [
    { id: "initial" as const, title: "Initial Evidence", description: "Before or at the time the issue was raised." },
    { id: "additional" as const, title: "Additional Evidence", description: "Follow-up evidence captured during investigation or containment." },
    { id: "closure" as const, title: "Closure Evidence", description: "Evidence used to verify that the issue has been resolved." },
  ];
  return <div className="grid gap-4">{groups.map((group) => { const evidence = flag.evidence.filter((item) => item.group === group.id); const editable = mayManage && flag.status !== "Closed" && group.id === "additional"; return <Card key={group.id} className="gap-0"><CardHeader className="border-b pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-[15px]">{group.title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{group.description}</p></div><Badge variant="secondary">{evidence.length}</Badge></div></CardHeader><CardContent className="grid gap-4 p-5"><EvidenceGallery evidence={evidence} />{editable && <div className="border-t pt-4"><EvidencePicker items={draft} onChange={setDraft} group="additional" uploadedBy={actor.name} title="Select photos" /><div className="mt-3 flex justify-end"><Button size="sm" disabled={!draft.length} onClick={() => { addRedFlagEvidence(flag.id, draft, "additional", actor); setDraft([]); }}>Add Evidence</Button></div></div>}</CardContent></Card>; })}</div>;
}

function ActionSection({ flag, action, mayManage, actor }: { flag: RedFlag; action?: MyAction; mayManage: boolean; actor: { id: string; name: string } }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const context: LinkedActionContext = useMemo(() => ({ source: "Red Flag", sourceModule: "redFlag", sourceId: flag.id, sourceObservation: flag.title, title: flag.title, description: flag.description, plant: flag.plant, zone: flag.zone, location: flag.location, defaultPriority: flag.severity, evidence: flag.evidence.filter((item) => item.group === "initial").map(toActionEvidence) }), [flag]);
  if (!action) return <><Card className={cn("max-w-2xl gap-0", (flag.severity === "Critical" || flag.severity === "High") && "border-amber-500/25")}><CardContent className="grid min-h-64 place-items-center p-6 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Link2 className="size-5" /></span><p className="mt-4 text-sm font-semibold">No corrective Action is linked</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">Create one shared Action with the Red Flag ID, severity context, location, description, and initial evidence already linked.</p>{(flag.severity === "Critical" || flag.severity === "High") && <Badge variant="warning" className="mt-3">Recommended for {flag.severity} severity</Badge>}{mayManage && <div><Button className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="size-4" />Create Action</Button></div>}</div></CardContent></Card><CreateLinkedActionDialog key={flag.id} open={dialogOpen} onOpenChange={setDialogOpen} context={context} onCreated={(created) => linkRedFlagAction(flag.id, created.id, actor)} /></>;
  return <div className="grid min-w-0 gap-4 xl:grid-cols-12"><Card className="gap-0 xl:col-span-7"><CardHeader className="border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-[15px]">Linked Corrective Action</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">{action.id}</p></div><Badge variant={ACTION_STATUS_CONFIG[action.status].variant}>{action.status}</Badge></div></CardHeader><CardContent className="grid gap-5 p-5"><div><p className="text-base font-semibold">{action.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p></div><div className="grid gap-4 sm:grid-cols-2"><Info label="Responsible person" value={action.responsiblePersonName || action.assignedTo || "Awaiting assignment"} icon={UserRound} /><Info label="Due" value={`${formatShortDate(action.dueDate)} · ${getActionDueLabel(action)}`} icon={FileCheck2} /><Info label="Priority" value={action.priority} icon={ShieldAlert} /><Info label="Action category" value={action.actionCategory || "Not classified"} icon={FileCheck2} /></div><Button className="w-fit" nativeButton={false} render={<Link href={`/actions/${encodeURIComponent(action.id)}`} />}>Open in Action Center<ExternalLink className="size-4" /></Button></CardContent></Card><Card className="gap-0 xl:col-span-5"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Action Completion Evidence</CardTitle><p className="text-xs text-muted-foreground">After evidence remains owned by the shared Action.</p></CardHeader><CardContent className="p-5"><ActionEvidence evidence={action.evidence} /></CardContent></Card></div>;
}

function ClosureSection({ flag, action, mayClose, actor }: { flag: RedFlag; action?: MyAction; mayClose: boolean; actor: { id: string; name: string } }) {
  const [closureDraft, setClosureDraft] = useState<RedFlagEvidence[]>([]);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const actionReady = !flag.actionId || action?.status === "Completed";
  const initial = flag.evidence.filter((item) => item.group === "initial");
  const closure = flag.evidence.filter((item) => item.group === "closure");

  function confirmClose() {
    if (!remark.trim()) { setError("Enter a verification remark before closing."); return; }
    if (closureDraft.length) addRedFlagEvidence(flag.id, closureDraft, "closure", actor);
    closeRedFlag(flag.id, remark, actor);
    setCloseOpen(false); setClosureDraft([]); setRemark(""); setError("");
  }
  function confirmReopen() {
    if (!remark.trim()) { setError("A reason is required to reopen or send back this Red Flag."); return; }
    reopenRedFlag(flag.id, remark, actor);
    setReopenOpen(false); setRemark(""); setError("");
  }

  return <><div className="grid min-w-0 gap-4 xl:grid-cols-12"><Card className="gap-0 xl:col-span-8"><CardHeader className="border-b pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-[15px]">Closure Verification</CardTitle><p className="mt-1 text-xs text-muted-foreground">Review the original condition, outcome, and evidence before closing.</p></div><RedFlagStatusBadge status={flag.status} /></div></CardHeader><CardContent className="grid gap-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><VerificationPanel title="Original issue" text={flag.description} evidence={initial[0]?.url} tone="before" /><VerificationPanel title="Corrective outcome" text={action?.resolutionObservation || action?.actionTakenDescription || flag.closureRemark || (flag.immediateActionTaken ? flag.containmentNote : "No corrective outcome has been documented yet.")} evidence={action?.evidence[0]?.url || closure[0]?.url} tone="after" /></div><div><p className="mb-2 text-sm font-medium">Red Flag closure evidence</p><EvidenceGallery evidence={closure} />{mayClose && flag.status !== "Closed" && <div className="mt-4 border-t pt-4"><EvidencePicker items={closureDraft} onChange={setClosureDraft} group="closure" uploadedBy={actor.name} title="Select closure photos" /></div>}</div>{flag.closureRemark && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.055] p-4"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Closure remark</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{flag.closureRemark}</p><p className="mt-2 text-[11px] text-muted-foreground">Closed by {flag.closedByName} · {flag.closedAt ? formatDateTime(flag.closedAt) : ""}</p></div>}</CardContent></Card>
    <Card className="gap-0 xl:col-span-4"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Closure Decision</CardTitle><p className="text-xs text-muted-foreground">A closed Action does not automatically close the Red Flag.</p></CardHeader><CardContent className="grid gap-4 p-5">{flag.actionId ? <div className={cn("rounded-lg border p-3", actionReady ? "border-emerald-500/20 bg-emerald-500/[0.045]" : "border-amber-500/20 bg-amber-500/[0.045]")}><div className="flex items-center gap-2"><span className={cn("grid size-8 place-items-center rounded-lg", actionReady ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>{actionReady ? <CheckCircle2 className="size-4" /> : <FileCheck2 className="size-4" />}</span><div><p className="text-sm font-medium">{actionReady ? "Action completed" : "Action still active"}</p><p className="text-[11px] text-muted-foreground">{action?.id ?? flag.actionId} · {action?.status ?? "Unavailable"}</p></div></div></div> : <div className="rounded-lg border bg-muted/20 p-3"><p className="text-sm font-medium">Resolved without a formal Action</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Verify the immediate correction and add a closure remark.</p></div>}{flag.status !== "Closed" ? mayClose ? <><Button disabled={!actionReady} onClick={() => { setRemark(""); setError(""); setCloseOpen(true); }} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="size-4" />Close Red Flag</Button>{!actionReady && <p className="text-xs leading-5 text-muted-foreground">Complete and approve the shared Action before Red Flag verification.</p>}{flag.status === "Awaiting Closure" && <Button variant="outline" onClick={() => { setRemark(""); setError(""); setReopenOpen(true); }}><RotateCcw className="size-4" />Reopen / Send Back</Button>}</> : <p className="text-xs leading-5 text-muted-foreground">An Admin or authorized reviewer must complete the closure decision.</p> : mayClose && <Button variant="outline" onClick={() => { setRemark(""); setError(""); setReopenOpen(true); }}><RotateCcw className="size-4" />Reopen Red Flag</Button>}</CardContent></Card></div>

    <DecisionDialog open={closeOpen} onOpenChange={setCloseOpen} title="Close Red Flag" description="Confirm that the issue is resolved. This decision is separate from Action completion." label="Verification remark *" value={remark} onValue={setRemark} error={error} confirm="Close Red Flag" onConfirm={confirmClose} tone="success" />
    <DecisionDialog open={reopenOpen} onOpenChange={setReopenOpen} title="Reopen / Send Back" description="Explain what is incomplete or why additional correction is required." label="Reason *" value={remark} onValue={setRemark} error={error} confirm="Reopen Red Flag" onConfirm={confirmReopen} tone="danger" />
  </>;
}

function DecisionDialog({ open, onOpenChange, title, description, label, value, onValue, error, confirm, onConfirm, tone }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; label: string; value: string; onValue: (value: string) => void; error: string; confirm: string; onConfirm: () => void; tone: "success" | "danger" }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><label className="grid gap-1.5 text-sm font-medium">{label}<Textarea rows={4} value={value} onChange={(event) => onValue(event.target.value)} autoFocus /></label>{error && <p className="text-xs text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={onConfirm} className={tone === "success" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"}>{confirm}</Button></DialogFooter></DialogContent></Dialog>;
}

function VerificationPanel({ title, text, evidence, tone }: { title: string; text?: string; evidence?: string; tone: "before" | "after" }) {
  return <div className="overflow-hidden rounded-lg border"><div className={cn("border-b px-3 py-2 text-xs font-semibold", tone === "before" ? "bg-red-500/[0.055] text-red-700 dark:text-red-300" : "bg-emerald-500/[0.055] text-emerald-700 dark:text-emerald-300")}>{title}</div>{evidence ? <img src={evidence} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-muted/20"><ImageIcon className="size-5 text-muted-foreground" /></div>}<p className="p-3 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}

function ActionEvidence({ evidence }: { evidence: MyActionEvidence[] }) {
  if (!evidence.length) return <div className="grid min-h-40 place-items-center rounded-lg border border-dashed bg-muted/[0.12] text-center"><div><ImageIcon className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">No completion evidence yet.</p></div></div>;
  return <div className="grid grid-cols-2 gap-2">{evidence.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border bg-muted">{item.url ? <img src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center"><ImageIcon className="size-5 text-muted-foreground" /></div>}<p className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{item.name}</p></div>)}</div>;
}

function toActionEvidence(item: RedFlagEvidence): MyActionEvidence {
  return { id: item.id, name: item.name, type: "image", mimeType: item.mimeType, uploadedAt: item.uploadedAt, uploadedBy: item.uploadedBy, url: item.url, evidenceType: "finding" };
}
