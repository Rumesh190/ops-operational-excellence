"use client";
/* eslint-disable @next/next/no-img-element -- report evidence may be a locally persisted data URL. */

import Link from "next/link";
import { ArrowLeft, ImageIcon, Printer } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActionStore } from "@/lib/actions/action-store";
import { formatOpsDateTime } from "@/lib/ops-formatters";
import { getRedTagReasonDisplay, RED_TAG_DECISION_LABELS } from "./types";
import { useRedTags } from "./store";

export function RedTagReportPage({ tagId }: { tagId: string }) {
  const tag = useRedTags().find((item) => item.id === tagId);
  const actions = useActionStore();
  if (!tag) return <PageContainer><p>Red Tag not found.</p></PageContainer>;
  const action = tag.actionId ? actions.find((item) => item.id === tag.actionId) : undefined;
  const after = tag.afterEvidence?.length ? tag.afterEvidence : tag.dispositionDetails?.evidence ?? [];
  const isKeep = tag.decisionRecord?.type === "keep";
  return <PageContainer className="max-w-none">
    <style>{`@media print{@page{size:A4 portrait;margin:10mm}.red-tag-report-controls{display:none!important}.red-tag-report{border:0!important;box-shadow:none!important}.red-tag-report-block{break-inside:avoid;page-break-inside:avoid}}`}</style>
    <div className="red-tag-report-controls mx-auto mb-4 flex max-w-[920px] justify-between gap-3 border-b pb-4"><Button variant="ghost" nativeButton={false} render={<Link href={`/5s/red/${encodeURIComponent(tag.id)}`} />}><ArrowLeft className="size-4" />Back to Red Tag</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button></div>
    <article className="red-tag-report mx-auto max-w-[920px] overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="border-b bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-red-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">Red Tag Report</h1><p className="mt-1 font-mono text-sm text-slate-300">{tag.tagNumber}</p></div><Badge variant={tag.status === "Closed" ? "success" : "info"}>{tag.status}</Badge></div><h2 className="mt-5 text-xl font-semibold">{tag.itemName}</h2></header>
      <div className="grid gap-7 p-6 sm:p-8">
        <ReportSection title="Item details"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Plant" value={tag.plant} /><Meta label="Zone" value={tag.zone} /><Meta label="Department" value={tag.department ?? tag.section} />{tag.quantity !== undefined && <Meta label="Quantity" value={String(tag.quantity)} />}{tag.category && <Meta label="Category" value={tag.category} />}<Meta label="Tagging Category" value={tag.reasonCategory ?? "Not recorded"} /><Meta label="Tagging Reason" value={getRedTagReasonDisplay(tag.reason, tag.customReason)} /><Meta label="Created By" value={tag.createdByName} /><Meta label="Created Date" value={formatOpsDateTime(tag.createdAt)} /></div>{tag.remarks && <p className="mt-5 border-t pt-4 text-sm leading-6">{tag.remarks}</p>}</ReportSection>
        <ReportSection title="Review & decision"><div className="grid gap-4 sm:grid-cols-2"><Meta label="Reviewer" value={tag.review?.reviewerName ?? "Not recorded"} /><Meta label="Decision" value={tag.decisionRecord ? RED_TAG_DECISION_LABELS[tag.decisionRecord.type] : "Not recorded"} />{tag.review?.comments && <Meta label="Review Notes" value={tag.review.comments} />}</div></ReportSection>
        {isKeep ? <><ReportSection title="Identification Evidence"><div className="sm:max-w-md"><Evidence label="Before Evidence" url={tag.imageUrl} name="Identification Photo" /></div></ReportSection><ReportSection title="Keep outcome"><div className="grid gap-4 sm:grid-cols-2"><Meta label="Outcome" value="Kept · Closed" /><Meta label="Confirmed By" value={tag.keepConfirmation?.confirmedByName ?? "Not recorded"} /><Meta label="Confirmation Date" value={formatOpsDateTime(tag.keepConfirmation?.confirmedAt)} />{tag.keepConfirmation?.justification && <Meta label="Confirmation Note" value={tag.keepConfirmation.justification} />}</div></ReportSection></> : <ReportSection title="Disposition Outcome"><div className="grid gap-5 sm:grid-cols-2"><Evidence label="Before Evidence" url={tag.imageUrl} name="Identification Photo" /><Evidence label="After Evidence" url={after[0]?.url} name={after[0]?.name ?? "Disposition Completion Photo"} /></div><div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Final Status" value={tag.status} /><Meta label="Method" value={tag.handlingMode === "linked_action" ? "Linked Action" : "Handle Directly"} /><Meta label="Decision" value={tag.decisionRecord ? RED_TAG_DECISION_LABELS[tag.decisionRecord.type] : "Not recorded"} /><Meta label="Responsible Person" value={tag.dispositionDetails?.responsiblePersonName ?? "Not recorded"} /><Meta label="Target Date" value={formatOpsDateTime(tag.dispositionDetails?.targetDate)} /><Meta label="Completed By" value={tag.dispositionDetails?.completedByName ?? "Not recorded"} /><Meta label="Completed Date" value={formatOpsDateTime(tag.dispositionDetails?.completedAt)} />{tag.dispositionDetails?.executionNotes && <Meta label="Execution Notes" value={tag.dispositionDetails.executionNotes} />}{tag.dispositionDetails?.completionNotes && <Meta label="Completion Notes" value={tag.dispositionDetails.completionNotes} />}{tag.dispositionDetails?.approval?.approved && <Meta label="Approval" value={`${tag.dispositionDetails.approval.approvedByName} · ${formatOpsDateTime(tag.dispositionDetails.approval.approvedAt)}`} />}{action && <><Meta label="Action ID" value={action.id} /><Meta label="Action Status" value={action.status} /><Meta label="Action Owner" value={action.responsiblePersonName ?? action.assignedTo} /></>}</div></ReportSection>}
        <ReportSection title="Timeline"><ol className="grid gap-3 border-l pl-4">{tag.history.map((event) => <li key={event.id}><p className="text-sm font-semibold">{event.label}</p><p className="text-xs text-muted-foreground">{formatOpsDateTime(event.at)} · {event.actor}</p></li>)}</ol></ReportSection>
      </div>
      <footer className="border-t px-6 py-4 text-[10px] text-muted-foreground sm:px-8">Generated by OPS · {formatOpsDateTime(new Date())} · {tag.tagNumber}</footer>
    </article>
  </PageContainer>;
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="red-tag-report-block"><h3 className="mb-4 border-b pb-2 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{title}</h3>{children}</section>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-5">{value}</p></div>; }
function Evidence({ label, url, name }: { label: string; url?: string; name: string }) { return <figure><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>{url ? <img src={url} alt={name} className="aspect-[4/3] w-full rounded-lg border object-contain" /> : <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed text-center text-xs text-muted-foreground"><span><ImageIcon className="mx-auto mb-2 size-6" />No evidence captured</span></div>}<figcaption className="mt-2 text-xs text-muted-foreground">{name}</figcaption></figure>; }
