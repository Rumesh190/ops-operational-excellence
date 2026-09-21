"use client";
/* eslint-disable @next/next/no-img-element -- user-provided evidence uses local/data URLs and the existing fullscreen viewer. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Check, CheckCircle2, ClipboardCheck, ExternalLink, FileText, History, Image as ImageIcon, IndianRupee, Link2, MapPin, Maximize2, Paperclip, Play, RotateCcw, Send, Upload, UserRound, X } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import { OpsTimeline } from "@/components/ops/ops-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getRoleVisibleActions } from "@/features/actions/action-center-data";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import type { MyAction, MyActionActivity, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { ACTION_PRIORITY_CONFIG, ACTION_REVIEW_STATUSES, ACTION_STATUS_CONFIG, actionDueDays, formatShortDate, getActionDueLabel, getActionSourceDefinition, getActionSourceHref, isActionOverdue } from "@/lib/actions/action-config";
import { acknowledgeActionEscalation, useActionAttention } from "@/lib/actions/action-attention-store";
import { addActionEvidence, addActionProgressEvidence, assignActionToZoneMember, canReassignAction, canReviewAction, closeReviewedAction, reassignActionOwner, removeActionEvidence, removeActionProgressEvidence, sendActionBack, startAssignedAction, submitActionForReview, updateAction, useActionStore } from "@/lib/actions/action-store";
import { FIVE_S_CORRECTIVE_ACTION_CATEGORIES, getFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { ACTION_LIFECYCLE_STAGES, getActionLifecycleStage } from "@/lib/five-s/lifecycle-status";
import { useCurrentUser } from "@/lib/current-user";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage } from "@/lib/evidence-images";
import { formatOpsDate, formatOpsDateTime, formatOpsMoney } from "@/lib/ops-formatters";
import { cn } from "@/lib/utils";

type DetailSection = "overview" | "evidence" | "activity" | "review";
const DETAIL_SECTIONS: Array<{ id: DetailSection; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "evidence", label: "Evidence" },
  { id: "activity", label: "Activity" }, { id: "review", label: "Review" },
];
const ACTIVITY_LABELS: Record<MyActionActivity["type"], string> = {
  created: "Action created", awaiting_assignment: "Awaiting Zone Leader assignment", assigned: "Action assigned",
  started: "Work started", evidence_uploaded: "Evidence uploaded", submitted: "Submitted for review",
  resubmitted: "Resubmitted for review", reviewed: "Reviewed", sent_back: "Sent back for rework", closed: "Action closed",
  verified: "Verified", reminder_generated: "Reminder generated", escalated: "Action escalated", escalation_acknowledged: "Escalation acknowledged", reassigned: "Action reassigned",
};

export default function FiveSActionDetailPage({ actionId, initialSection }: { actionId: string; initialSection?: string }) {
  const router = useRouter();
  const actions = useActionStore();
  const actor = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === actor.id);
  const actorWithAuthority = { id: actor.id, name: actor.name, roles: adminUser?.roles, permissions: adminUser?.permissions };
  const storedAction = actions.find((item) => item.id === actionId);
  const action = getRoleVisibleActions(actions, actor, adminUser).find((item) => item.id === actionId);
  const attention = useActionAttention(actionId);
  const [section, setSection] = useState<DetailSection>(() => DETAIL_SECTIONS.some((item) => item.id === initialSection) ? initialSection as DetailSection : "overview");
  const [observation, setObservation] = useState("");
  const [category, setCategory] = useState("");
  const [costSaving, setCostSaving] = useState("0");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [closureRemark, setClosureRemark] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignId, setReassignId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [preview, setPreview] = useState<MyActionEvidence | null>(null);
  const [pendingTransition, setPendingTransition] = useState<"start" | "submit" | "send-back" | "close" | null>(null);
  const progressInputRef = useRef<HTMLInputElement | null>(null);
  const completionInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!action) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setObservation(action.resolutionObservation ?? action.actionTakenDescription ?? "");
      setCategory(action.correctiveActionCategory ?? "");
      setCostSaving(String(action.costSaving ?? 0));
    });
    return () => { cancelled = true; };
  }, [action]);

  const latestRework = [...(action?.reviewHistory ?? [])].reverse().find((item) => item.type === "sent_back");

  if (!action) return <PageContainer><div className="flex min-h-[55vh] flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center"><FileText className="size-9 text-muted-foreground" /><h1 className="mt-4 text-lg font-semibold">{storedAction ? "Action access denied" : "Action not found"}</h1><p className="mt-1 text-sm text-muted-foreground">{storedAction ? "This Action is outside your permitted role or zone scope." : "This action may have been removed or is unavailable."}</p><Button className="mt-5" variant="outline" onClick={() => router.push("/actions")}><ArrowLeft className="size-4" />Back to Actions</Button></div></PageContainer>;

  const isResponsible = action.responsiblePersonId ? action.responsiblePersonId === actor.id : action.assignedTo === actor.name;
  const canEdit = isResponsible && ["Assigned", "Open", "In Progress", "Rework Required"].includes(action.status);
  const zoneConfiguration = getFiveSZoneConfiguration(action.area);
  const canAssign = action.status === "Awaiting Assignment" && zoneConfiguration?.leaderId === actor.id;
  const canReview = canReviewAction(action, actorWithAuthority) && ACTION_REVIEW_STATUSES.includes(action.status);
  const canReassign = canReassignAction(action, actorWithAuthority) && Boolean(action.responsiblePersonId || action.responsiblePersonName || action.assignedTo);
  const canStart = isResponsible && ["Assigned", "Open", "Rework Required"].includes(action.status);
  const validResolution = observation.trim() && Boolean(category) && action.evidence.length > 0 && Number.isFinite(Number(costSaving)) && Number(costSaving) >= 0;
  const source = getActionSourceDefinition(action);
  const SourceIcon = source.icon;
  const sourceHref = getActionSourceHref(action);
  const dueDays = actionDueDays(action);
  const urgencyLabel = dueDays === 1 ? "Due tomorrow" : dueDays === 0 ? "Due today" : dueDays < 0 ? `Overdue by ${Math.abs(dueDays)} day${Math.abs(dueDays) === 1 ? "" : "s"}` : `Due in ${dueDays} days`;
  const activeEscalation = [...attention.escalations].filter((item) => item.status !== "Resolved").sort((left, right) => right.level - left.level)[0];

  function syncFields(updated: MyAction | undefined) {
    if (!updated) return;
    setObservation(updated.resolutionObservation ?? updated.actionTakenDescription ?? "");
    setCategory(updated.correctiveActionCategory ?? "");
    setCostSaving(String(updated.costSaving ?? 0));
  }
  function saveProgress() {
    if (!canEdit) return;
    syncFields(updateAction(actionId, { actionTakenDescription: observation, resolutionObservation: observation, correctiveActionCategory: category, costSaving: Number.isFinite(Number(costSaving)) ? Number(costSaving) : undefined, currency: "INR" }));
  }
  function startWork() {
    if (pendingTransition) return;
    setPendingTransition("start");
    window.setTimeout(() => { startAssignedAction(actionId, actorWithAuthority); setPendingTransition(null); }, 220);
  }
  function submitForReview() {
    if (pendingTransition || !validResolution) return;
    setPendingTransition("submit");
    window.setTimeout(() => { syncFields(submitActionForReview(actionId, actorWithAuthority, { observation, correctiveActionCategory: category, costSaving: Number(costSaving) })); setPendingTransition(null); }, 220);
  }
  async function addEvidence(event: React.ChangeEvent<HTMLInputElement>, kind: "progress" | "completion") {
    const file = event.target.files?.[0];
    const currentAction = actions.find((item) => item.id === actionId);
    if (!file || !canEdit || !currentAction) return;
    const count = kind === "progress" ? currentAction.progressEvidence?.length ?? 0 : currentAction.evidence.length;
    if (count >= MAX_EVIDENCE_IMAGES) { window.alert(`Maximum ${MAX_EVIDENCE_IMAGES} evidence images allowed.`); event.target.value = ""; return; }
    const url = file.type.startsWith("image/") ? await readImage(file) : undefined;
    const evidence: MyActionEvidence = { id: `EV-${crypto.randomUUID()}`, name: file.name, type: file.type.startsWith("image/") ? "image" : "document", evidenceType: kind === "progress" ? "progress" : "resolution", mimeType: file.type, uploadedAt: new Date().toISOString(), uploadedBy: actor.name, url };
    if (kind === "progress") addActionProgressEvidence(actionId, evidence, actor); else addActionEvidence(actionId, evidence, actor);
    event.target.value = "";
  }
  function confirmSendBack() {
    if (!remark.trim()) return;
    setPendingTransition("send-back");
    window.setTimeout(() => { sendActionBack(actionId, actorWithAuthority, remark); setRemark(""); setSendBackOpen(false); setPendingTransition(null); }, 220);
  }
  function confirmClose() {
    setPendingTransition("close");
    window.setTimeout(() => { closeReviewedAction(actionId, actorWithAuthority, closureRemark); setClosureRemark(""); setCloseOpen(false); setPendingTransition(null); }, 260);
  }

  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="OPS Workspace / Actions" title={action.title} description={action.id} leading={<Button variant="ghost" size="icon-sm" onClick={() => router.push("/actions")} aria-label="Back to Actions"><ArrowLeft className="size-4" /></Button>} actions={action.status === "Completed" ? <Button variant="outline" onClick={() => router.push(`/actions/${encodeURIComponent(action.id)}/report`)}><FileText className="size-4" />View Report</Button> : undefined} toolbar={<div className="flex w-full min-w-0 items-center overflow-x-auto pb-0.5"><LifecycleTimeline action={action} /></div>} />

    <Card className="gap-0 overflow-hidden"><CardContent className="grid gap-px bg-border/70 p-0 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><HeaderMeta label="Status"><Badge variant={ACTION_STATUS_CONFIG[action.status].variant}>{ACTION_STATUS_CONFIG[action.status].label}</Badge></HeaderMeta><HeaderMeta label="Priority"><Badge variant={ACTION_PRIORITY_CONFIG[action.priority].variant}>{action.priority}</Badge></HeaderMeta><HeaderMeta label="Due Date"><span className={cn(isActionOverdue(action) && "text-red-600 dark:text-red-400")}>{getActionDueLabel(action)}</span></HeaderMeta><HeaderMeta label="Action Owner">{action.responsiblePersonName ?? action.assignedTo ?? "Unassigned"}</HeaderMeta><HeaderMeta label="Zone Leader">{action.zoneLeaderName ?? "—"}</HeaderMeta><HeaderMeta label="Assigned By">{action.assignedByName ?? action.createdByName ?? action.auditor ?? "—"}</HeaderMeta><HeaderMeta label="Source"><span className="inline-flex items-center gap-1.5"><SourceIcon className="size-3.5 text-muted-foreground" />{source.label}</span></HeaderMeta></CardContent></Card>

    {action.status !== "Completed" && <section className={cn("rounded-xl border p-4", dueDays < 0 || action.priority === "Critical" ? "border-red-500/25 bg-red-500/[0.055]" : "bg-card")}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Attention</p><p className={cn("mt-1 text-sm font-semibold", dueDays < 0 && "text-red-700 dark:text-red-400")}>{urgencyLabel}</p>{activeEscalation && <p className="mt-1 text-xs text-muted-foreground">Escalated · Level {activeEscalation.level} · {activeEscalation.toUserName} · {formatDateTime(activeEscalation.createdAt)}</p>}</div>{activeEscalation?.status === "Open" && activeEscalation.toUserId === actor.id && <Button size="sm" variant="outline" onClick={() => acknowledgeActionEscalation(activeEscalation.id, actorWithAuthority)}>Acknowledge escalation</Button>}</div></section>}

    {canAssign && <Panel title="Assign Action Owner" icon={<ClipboardCheck className="size-4 text-primary" />}><p className="text-sm text-muted-foreground">Assign this {action.area} Action to the person responsible for completing it.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Select value={assigneeId} onValueChange={(value) => setAssigneeId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select Action Owner" /></SelectTrigger><SelectContent>{zoneConfiguration.members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select><Button disabled={!assigneeId} onClick={() => assignActionToZoneMember(action.id, actorWithAuthority, assigneeId)}>Assign Action</Button></div></Panel>}
    {canReassign && <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => { setReassignId(action.responsiblePersonId ?? ""); setReassignOpen(true); }}><UserRound className="size-3.5" />Reassign Action Owner</Button></div>}
    {action.status === "Rework Required" && latestRework && <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4"><div className="flex gap-3"><RotateCcw className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" /><div><p className="font-semibold text-amber-900 dark:text-amber-100">Rework Required</p><p className="mt-1 text-xs text-amber-800/75 dark:text-amber-200/70">{latestRework.actorName} · {formatDateTime(latestRework.createdAt)}</p><p className="mt-2 text-sm leading-6 text-amber-950 dark:text-amber-50">{latestRework.remark}</p></div></div></section>}

    <OpsTabBar label="Action details" active={section} onChange={(id) => setSection(id as DetailSection)} tabs={DETAIL_SECTIONS.map((item) => ({ ...item, count: item.id === "review" && canReview ? 1 : undefined }))} />

    {section === "overview" && <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]"><main className="grid min-w-0 gap-5">
      <Panel title="Origin" icon={<Link2 className="size-4 text-primary" />}><div className="grid gap-5"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><SourceIcon className="size-5" /></span><div className="min-w-0"><p className="text-sm font-semibold">{source.label}</p><p className="mt-0.5 break-words font-mono text-xs text-muted-foreground">{action.sourceId ?? action.sourceTitle}</p></div>{sourceHref && <Button nativeButton={false} render={<Link href={sourceHref} />} variant="outline" size="sm" className="ml-auto"><ExternalLink className="size-3.5" />View {source.label}</Button>}</div><div className="grid gap-4 border-t pt-4 sm:grid-cols-2"><Meta label="Source Location" value={action.sourceLocation ?? `${action.plant} · ${action.area}`} icon={<MapPin className="size-3.5" />} /><Meta label="Source Record" value={action.sourceId ?? action.sourceTitle} icon={<FileText className="size-3.5" />} />{action.sourceObservationId && <Meta label="Source Observation" value={action.sourceObservationId} icon={<FileText className="size-3.5" />} />}</div><div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/[0.055] px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">Observation / Finding</p><p className="mt-2 text-sm font-medium leading-6">{action.sourceObservation ?? action.originalFinding ?? action.description}</p></div></div></Panel>
      <Panel title="Resolution Details" icon={<CheckCircle2 className="size-4 text-primary" />}>
        {canStart && <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/[0.045] p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">Ready to begin corrective work?</p><p className="mt-1 text-xs text-muted-foreground">Start work to enable resolution details and evidence.</p></div><Button onClick={startWork} disabled={pendingTransition === "start"}><Play className="size-4" />{pendingTransition === "start" ? "Starting..." : "Start Work"}</Button></div>}
        <div className={cn("grid gap-4", canStart && "pointer-events-none opacity-45")}><Field label="Corrective Measure / Responsible Notes">{canEdit ? <Textarea className="min-h-28" value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Describe the corrective work completed..." /> : <ReadOnlyValue value={action.resolutionObservation ?? action.actionTakenDescription ?? "No responsible-person notes submitted."} />}</Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Corrective Action Category">{canEdit ? <Select value={category} onValueChange={(value) => setCategory(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{FIVE_S_CORRECTIVE_ACTION_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select> : <ReadOnlyValue value={action.correctiveActionCategory ?? "—"} />}</Field><Field label="Actual Cost Saving">{canEdit ? <div className="relative"><IndianRupee className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" type="number" min="0" step="0.01" value={costSaving} onChange={(event) => setCostSaving(event.target.value)} /></div> : <ReadOnlyValue value={action.costSaving === undefined ? "Not recorded" : `₹${action.costSaving.toLocaleString("en-IN")}`} />}</Field></div>{canEdit && action.status === "In Progress" && <div className="flex justify-end border-t pt-4"><Button variant="outline" onClick={saveProgress}>Save Progress</Button></div>}</div>
      </Panel>
    </main><ActionSummary action={action} /></div>}

    {section === "evidence" && <div className="grid min-w-0 gap-5 xl:grid-cols-3"><EvidencePanel tone="before" title="Before Evidence" description="Original condition captured when this action was created." evidence={action.issueEvidence ?? []} onPreview={setPreview} /><EvidencePanel tone="progress" title="Progress Evidence" description="Optional evidence captured while corrective work is underway." evidence={action.progressEvidence ?? []} editable={canEdit && !canStart} onAdd={() => progressInputRef.current?.click()} onPreview={setPreview} onRemove={(id) => removeActionProgressEvidence(action.id, id)} /><EvidencePanel tone="completion" title="Completion Evidence" description="Evidence supporting completion and reviewer verification." evidence={action.evidence} editable={canEdit && !canStart} required onAdd={() => completionInputRef.current?.click()} onPreview={setPreview} onRemove={(id) => removeActionEvidence(action.id, id)} /><input ref={progressInputRef} hidden type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => void addEvidence(event, "progress")} /><input ref={completionInputRef} hidden type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => void addEvidence(event, "completion")} /><input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void addEvidence(event, "completion")} />{canEdit && !canStart && <div className="flex justify-end xl:col-span-3"><Button variant="outline" onClick={() => cameraInputRef.current?.click()}><ImageIcon className="size-4" />Capture completion photo</Button></div>}</div>}
    {section === "activity" && <ActivityTimeline action={action} />}
    {section === "review" && <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]"><main className="grid gap-5"><Panel title="Review Package" icon={<ClipboardCheck className="size-4 text-primary" />}><div className="grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><Meta label="Original Issue" value={action.sourceObservation ?? action.originalFinding ?? action.description} /><Meta label="Action Owner's Notes" value={observation || action.resolutionObservation || action.actionTakenDescription || "Not submitted"} /><Meta label="Corrective Category" value={category || action.correctiveActionCategory || "Not submitted"} /><Meta label="Cost Saving" value={`₹${(Number(costSaving) || action.costSaving || 0).toLocaleString("en-IN")}`} /></div><div className="grid gap-5 border-t pt-4 sm:grid-cols-2"><EvidencePanel tone="before" title="Before Evidence" description="Original issue evidence" evidence={action.issueEvidence ?? []} compact onPreview={setPreview} /><EvidencePanel tone="completion" title="Completion Evidence" description="Submitted resolution evidence" evidence={action.evidence} compact onPreview={setPreview} /></div></div></Panel>
      {canReview ? <Panel title="Review Decision"><p className="text-sm leading-6 text-muted-foreground">Verify the original finding, Action Owner’s notes, and completion evidence before deciding.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setSendBackOpen(true)}><RotateCcw className="size-4" />Send Back</Button><Button onClick={() => setCloseOpen(true)}><CheckCircle2 className="size-4" />Verify & Close</Button></div></Panel> : canEdit ? <Panel title="Submit for Review"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Readiness label="Notes" ready={Boolean(observation.trim())} /><Readiness label="Category" ready={Boolean(category)} /><Readiness label="Cost Saving" ready={Number.isFinite(Number(costSaving)) && Number(costSaving) >= 0} /><Readiness label="Evidence" ready={action.evidence.length > 0} /></div><Button className="mt-4 w-full" disabled={!validResolution || pendingTransition === "submit" || canStart} onClick={submitForReview}><Send className="size-4" />{pendingTransition === "submit" ? "Submitting..." : action.status === "Rework Required" ? "Resubmit for Review" : "Submit for Review"}</Button><p className="mt-2 text-center text-xs text-muted-foreground">Notes, category, and completion evidence are required.</p></Panel> : <Panel title="Review Status"><p className="text-sm text-muted-foreground">{action.status === "Completed" ? `Closed by ${action.closedBy ?? action.reviewedBy ?? action.auditor ?? "reviewer"} on ${formatShortDate(action.closedAt ?? action.completedAt ?? action.reviewedAt ?? action.createdAt)}.` : action.submittedForReviewAt ? `Awaiting review by ${action.reviewerName ?? action.createdByName ?? action.auditor ?? "the assigned reviewer"}.` : "This action has not been submitted for review."}</p></Panel>}
    </main><ActionSummary action={action} /></div>}

    <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}><DialogContent><DialogHeader><DialogTitle>Send Action Back</DialogTitle><DialogDescription>Explain what the responsible person needs to correct before resubmitting.</DialogDescription></DialogHeader><Field label="Remark *"><Textarea className="min-h-28" value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Explain what needs correction..." /></Field><DialogFooter><Button variant="outline" onClick={() => setSendBackOpen(false)}>Cancel</Button><Button variant="destructive" disabled={!remark.trim() || pendingTransition === "send-back"} onClick={confirmSendBack}>{pendingTransition === "send-back" ? "Sending Back..." : "Send Back"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={closeOpen} onOpenChange={setCloseOpen}><DialogContent><DialogHeader><DialogTitle>Verify and close this Action?</DialogTitle><DialogDescription>The submitted resolution will be accepted and this Action will be marked as closed.</DialogDescription></DialogHeader><Field label="Closure remark (optional)"><Textarea className="min-h-24" value={closureRemark} onChange={(event) => setClosureRemark(event.target.value)} placeholder="Add verification or closure context..." /></Field><DialogFooter><Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button><Button onClick={confirmClose} disabled={pendingTransition === "close"}>{pendingTransition === "close" ? "Closing..." : "Verify & Close"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={reassignOpen} onOpenChange={setReassignOpen}><DialogContent><DialogHeader><DialogTitle>Reassign Action Owner</DialogTitle><DialogDescription>Select a new owner and record why responsibility changed.</DialogDescription></DialogHeader><Field label="New Action Owner *"><Select value={reassignId} onValueChange={(value) => setReassignId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select Action Owner" /></SelectTrigger><SelectContent>{zoneConfiguration?.members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Reason *"><Textarea className="min-h-24" value={reassignReason} onChange={(event) => setReassignReason(event.target.value)} placeholder="Why is this Action being reassigned?" /></Field><DialogFooter><Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button><Button disabled={!reassignId || !reassignReason.trim() || reassignId === action.responsiblePersonId} onClick={() => { const updated = reassignActionOwner(action.id, actorWithAuthority, reassignId, reassignReason); if (updated) { setReassignOpen(false); setReassignReason(""); } }}>Reassign</Button></DialogFooter></DialogContent></Dialog>

    {preview && <div className="fixed inset-0 z-[10020] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}><div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white"><div className="min-w-0"><p className="truncate text-sm font-medium">{preview.name}</p><p className="text-xs text-slate-400">Uploaded by {preview.uploadedBy} · {formatDateTime(preview.uploadedAt)}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => void previewRef.current?.requestFullscreen?.()} aria-label="Full screen"><Maximize2 className="size-4" /></Button>{preview.url && <Button nativeButton={false} render={<a href={preview.url} target="_blank" rel="noreferrer" />} variant="ghost" size="icon-sm" className="text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Open original"><ExternalLink className="size-4" /></Button>}<Button variant="ghost" size="icon-sm" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setPreview(null)} aria-label="Close preview"><X className="size-4" /></Button></div></div><div ref={previewRef} className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">{preview.type === "image" && preview.url ? <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" /> : <div className="rounded-xl border border-white/10 bg-slate-900 p-10 text-center text-white"><FileText className="mx-auto size-10 text-slate-400" /><p className="mt-4 text-sm">Preview unavailable for this file type.</p></div>}</div></div>}
  </PageContainer>;
}

function LifecycleTimeline({ action }: { action: MyAction }) {
  const currentIndex = ACTION_LIFECYCLE_STAGES.indexOf(getActionLifecycleStage(action.status));
  return <div className="flex min-w-[720px] flex-1 items-start" aria-label="Action lifecycle">{ACTION_LIFECYCLE_STAGES.map((label, index) => { const complete = index < currentIndex; const current = index === currentIndex; return <div key={label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center"><span className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px]", complete ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/10" : "border-border bg-background text-muted-foreground")}>{complete ? <Check className="size-3" /> : index + 1}</span>{index < ACTION_LIFECYCLE_STAGES.length - 1 && <span className={cn("absolute left-[calc(50%+10px)] right-[calc(-50%+10px)] top-2.5 h-px", index < currentIndex ? "bg-emerald-400" : "bg-border")} />}<span className={cn("whitespace-nowrap text-xs leading-4", current ? "font-semibold text-primary" : complete ? "font-medium text-foreground" : "font-medium text-muted-foreground")}>{label}</span></div>; })}</div>;
}

function ActionSummary({ action }: { action: MyAction }) {
  return <Panel title="Action Summary"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Meta label="Action Title" value={action.title} /><Meta label="Action ID" value={action.id} /><Meta label="Description" value={action.description} /><Meta label="Action Category" value={action.actionCategory ?? "—"} /><Meta label="Plant" value={action.plant} icon={<Building2 className="size-3.5" />} /><Meta label="Zone" value={action.area} icon={<MapPin className="size-3.5" />} /><Meta label="Department" value={action.department} /><Meta label="Action Owner" value={action.responsiblePersonName ?? action.assignedTo ?? "Unassigned"} icon={<UserRound className="size-3.5" />} /><Meta label="Zone Leader" value={action.zoneLeaderName ?? "—"} /><Meta label="Assigned By" value={action.assignedByName ?? action.createdByName ?? action.auditor ?? "—"} /><Meta label="Due Date" value={formatShortDate(action.dueDate)} icon={<CalendarDays className="size-3.5" />} /><Meta label="Created By" value={action.createdByName ?? action.auditor ?? "—"} /><Meta label="Created Date" value={formatDateTime(action.createdAt)} />{action.costSaving !== undefined && <Meta label="Cost Saving" value={formatOpsMoney(action.costSaving, "Not recorded")} />}</div></Panel>;
}

function ActivityTimeline({ action }: { action: MyAction }) {
  const history = action.activityHistory ?? [];
  return <Panel title="Activity Timeline" icon={<History className="size-4 text-primary" />}>{history.length === 0 ? <p className="text-sm text-muted-foreground">No lifecycle activity yet.</p> : <div className="mx-auto max-w-3xl"><OpsTimeline items={[...history].reverse().map((item) => ({ id: item.id, title: ACTIVITY_LABELS[item.type], actor: item.actorName, timestamp: item.createdAt, remark: item.remark }))} /></div>}</Panel>;
}

function EvidencePanel({ tone, title, description, evidence, editable = false, required = false, compact = false, onAdd, onPreview, onRemove = () => undefined }: { tone: "before" | "progress" | "completion"; title: string; description: string; evidence: MyActionEvidence[]; editable?: boolean; required?: boolean; compact?: boolean; onAdd?: () => void; onPreview: (item: MyActionEvidence) => void; onRemove?: (id: string) => void }) {
  const tones = { before: "bg-red-500", progress: "bg-amber-500", completion: "bg-emerald-500" };
  return <Card className="min-w-0 gap-0 overflow-hidden"><CardHeader className="border-b pb-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", tones[tone])} /><CardTitle className="text-sm">{title}{required && <span className="text-destructive"> *</span>}</CardTitle></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{editable && onAdd && <Button size="sm" variant="outline" onClick={onAdd}><Upload className="size-3.5" />Add</Button>}</div></CardHeader><CardContent className="p-4"><EvidenceGrid evidence={evidence} editable={editable} compact={compact} onPreview={onPreview} onRemove={onRemove} emptyLabel={`No ${title.toLowerCase()} attached`} /></CardContent></Card>;
}
function EvidenceGrid({ evidence, editable, compact, onPreview, onRemove, emptyLabel }: { evidence: MyActionEvidence[]; editable: boolean; compact: boolean; onPreview: (item: MyActionEvidence) => void; onRemove: (id: string) => void; emptyLabel: string }) {
  if (!evidence.length) return <div className="grid min-h-24 place-items-center rounded-lg border border-dashed bg-muted/15 text-center"><div><Paperclip className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p></div></div>;
  return <div className={cn("grid gap-2", !compact && "sm:grid-cols-2 xl:grid-cols-1")}>{evidence.map((item) => <div key={item.id} className="group flex min-w-0 items-center gap-3 rounded-lg border bg-background p-2.5"><button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onPreview(item)}><span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">{item.type === "image" && item.url ? <img src={item.url} alt="" className="size-full object-cover" /> : <FileText className="size-5 text-muted-foreground" />}</span><span className="min-w-0"><span className="block truncate text-xs font-medium">{item.name}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{item.uploadedBy}</span><span className="block text-[10px] text-muted-foreground">{formatDateTime(item.uploadedAt)}</span></span></button>{editable && <Button variant="ghost" size="icon-sm" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><X className="size-4" /></Button>}</div>)}</div>;
}
function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) { return <Card className="min-w-0 gap-0"><CardHeader className="border-b bg-muted/15 py-3"><CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle></CardHeader><CardContent className="pt-4">{children}</CardContent></Card>; }
function HeaderMeta({ label, children }: { label: string; children: React.ReactNode }) { return <div className="min-w-0 bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><div className="mt-1.5 truncate text-sm font-medium">{children}</div></div>; }
function Meta({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 flex items-start gap-1.5 break-words text-xs font-medium leading-5">{icon}{value || "—"}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>; }
function ReadOnlyValue({ value }: { value: string }) { return <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm leading-6">{value}</div>; }
function Readiness({ label, ready }: { label: string; ready: boolean }) { return <div className="rounded-lg border bg-muted/15 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className={cn("mt-1 text-xs font-semibold", ready ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>{ready ? "Ready" : "Required"}</p></div>; }
function formatDateTime(value: string) { return value.includes("T") ? formatOpsDateTime(value) : formatOpsDate(value); }
function readImage(file: File): Promise<string | undefined> { return optimizeEvidenceImage(file).then(({ dataUrl }) => dataUrl).catch((error) => { window.alert(error instanceof Error ? error.message : "Unable to process this image."); return undefined; }); }
