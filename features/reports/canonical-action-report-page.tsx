"use client";
/* eslint-disable @next/next/no-img-element -- canonical evidence may be a local/data URL. */

import { ArrowLeft, ExternalLink, FileText, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MyAction, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { getActionSourceDefinition, getActionSourceRecordLabel } from "@/lib/actions/action-config";
import { actionEvidenceEmptyText, type ResolvedActionSourceEvidence } from "@/lib/actions/action-evidence";
import { formatOpsDate, formatOpsDateTime, formatOpsMoney } from "@/lib/ops-formatters";
import { getActionReportTitle } from "./report-presentation";

interface Props {
  action: MyAction;
  beforeEvidence: ResolvedActionSourceEvidence;
  onBack: () => void;
  onViewSource?: () => void;
  backLabel?: string;
}

export default function CanonicalActionReportPage({ action, beforeEvidence, onBack, onViewSource, backLabel = "Back to Actions" }: Props) {
  const source = getActionSourceDefinition(action);
  const completedAt = action.closedAt ?? action.completedAt;
  const generatedAt = new Date();
  return <div className="-m-5 min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:-m-6 sm:p-6 lg:-m-7 xl:-m-8">
    <style>{`@media print{@page{size:A4 portrait;margin:10mm}.canonical-action-report-controls{display:none!important}.canonical-action-report{border:0!important;box-shadow:none!important}.canonical-action-report-section{break-inside:avoid;page-break-inside:avoid}}`}</style>
    <div className="canonical-action-report-controls mx-auto mb-4 flex max-w-[920px] flex-wrap justify-between gap-2"><Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />{backLabel}</Button><div className="flex gap-2">{onViewSource && <Button variant="outline" onClick={onViewSource}><ExternalLink className="size-4" />View Action</Button>}<Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button></div></div>
    <article className="canonical-action-report mx-auto max-w-[920px] overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900">
      <header className="border-b bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-sky-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">{getActionReportTitle(action)}</h1><p className="mt-1 font-mono text-sm text-slate-300">Action ID: {action.id}</p></div><Badge variant="success">{action.status}</Badge></div><h2 className="mt-5 text-xl font-semibold">{action.title}</h2></header>
      <div className="grid gap-7 p-6 sm:p-8">
        <Section title="Source context"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Source" value={`${source.label} · ${getActionSourceRecordLabel(action)}`} /><Meta label="Plant" value={action.plant} /><Meta label="Zone" value={action.area} /><Meta label="Department" value={action.department} />{action.sourceObservation && <Meta label="Decision / Observation" value={action.sourceObservation} />}</div></Section>
        <Section title="Action details"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Priority" value={action.priority} /><Meta label="Category" value={action.category ?? action.actionCategory ?? "Not recorded"} /><Meta label="Action Owner" value={action.responsiblePersonName ?? action.assignedTo} /><Meta label="Assigned By" value={action.assignedByName ?? action.createdByName ?? action.auditor ?? "Not recorded"} /><Meta label="Created Date" value={formatOpsDateTime(action.createdAt)} /><Meta label="Due Date" value={formatOpsDate(action.dueDate)} /><Meta label="Completed Date" value={formatOpsDateTime(completedAt)} />{action.costSaving !== undefined && <Meta label="Cost Saving" value={formatOpsMoney(action.costSaving)} />}</div></Section>
        <Section title="Corrective action"><p className="text-sm leading-6">{action.description}</p>{(action.resolutionObservation || action.actionTakenDescription) && <div className="mt-4 border-t pt-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Outcome</p><p className="mt-2 text-sm leading-6">{action.resolutionObservation ?? action.actionTakenDescription}</p></div>}</Section>
        <Section title="Evidence"><div className="grid gap-5 sm:grid-cols-2"><EvidencePanel label="Before Evidence" evidence={beforeEvidence.evidence} provenance={beforeEvidence.provenance} empty={actionEvidenceEmptyText(beforeEvidence.state)} /><EvidencePanel label="After Evidence" evidence={action.evidence} provenance="Action completion evidence" empty="No evidence captured" /></div></Section>
        <Section title="Review & closure"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Completed By" value={action.completedByName ?? action.responsiblePersonName ?? action.assignedTo} /><Meta label="Submitted for Review" value={formatOpsDateTime(action.submittedForReviewAt)} /><Meta label="Verified By" value={action.reviewedBy ?? action.closedBy ?? "Not recorded"} /><Meta label="Closed By" value={action.closedBy ?? action.reviewedBy ?? "Not recorded"} /><Meta label="Closed Date" value={formatOpsDateTime(action.closedAt)} />{action.closureRemark && <Meta label="Closure Remark" value={action.closureRemark} />}</div></Section>
        <Section title="Timeline"><ol className="grid gap-3 border-l pl-4">{(action.activityHistory ?? []).map((event) => <li key={event.id}><p className="text-sm font-semibold">{activityLabel(event.type)}</p><p className="text-xs text-muted-foreground">{formatOpsDateTime(event.createdAt)} · {event.actorName}</p>{event.remark && <p className="mt-1 text-xs">{event.remark}</p>}</li>)}</ol>{!action.activityHistory?.length && <p className="text-sm text-muted-foreground">No lifecycle history recorded.</p>}</Section>
      </div>
      <footer className="border-t px-6 py-4 text-[10px] text-muted-foreground sm:px-8">Generated by OPS · {formatOpsDateTime(generatedAt)} · {action.id}</footer>
    </article>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="canonical-action-report-section"><h3 className="mb-4 border-b pb-2 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{title}</h3>{children}</section>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm leading-5">{value}</p></div>; }
function EvidencePanel({ label, evidence, provenance, empty }: { label: string; evidence: MyActionEvidence[]; provenance: string; empty: string }) { const image = evidence.find((item) => item.type === "image" && item.url); return <figure><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>{image?.url ? <img src={image.url} alt={image.name} className="aspect-[4/3] w-full rounded-lg border object-contain" /> : <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed text-center text-xs text-muted-foreground"><span><FileText className="mx-auto mb-2 size-6" />{empty}</span></div>}<figcaption className="mt-2 text-xs text-muted-foreground">{provenance}</figcaption></figure>; }
function activityLabel(type: string) { return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
