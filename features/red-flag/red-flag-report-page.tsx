"use client";
/* eslint-disable @next/next/no-img-element -- printable evidence may use dynamic data URLs. */

import Link from "next/link";
import { ArrowLeft, ImageIcon, Printer } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActionStore } from "@/lib/actions/action-store";
import { formatShortDate } from "@/lib/actions/action-config";
import { EvidenceGallery, RedFlagStatusBadge, SeverityBadge } from "./red-flag-components";
import { redFlagAgeLabel, useRedFlagStore } from "./red-flag-store";

export default function RedFlagReportPage({ flagId }: { flagId: string }) {
  const flags = useRedFlagStore();
  const actions = useActionStore();
  const flag = flags.find((item) => item.id === flagId);
  if (!flag) return <PageContainer><p className="text-sm">Red Flag not found.</p><Button className="w-fit" nativeButton={false} render={<Link href="/red-flag" />}>Return to Red Flag</Button></PageContainer>;
  const action = flag.actionId ? actions.find((item) => item.id === flag.actionId) : undefined;
  const initial = flag.evidence.filter((item) => item.group === "initial");
  const additional = flag.evidence.filter((item) => item.group === "additional");
  const closure = flag.evidence.filter((item) => item.group === "closure");
  return <PageContainer className="max-w-6xl">
    <style>{`@media print{@page{size:A4 portrait;margin:9mm}.red-flag-report-toolbar{display:none!important}.red-flag-print-report{border:0!important;box-shadow:none!important}.red-flag-print-block{break-inside:avoid;page-break-inside:avoid}}`}</style>
    <div className="red-flag-report-toolbar flex flex-wrap items-center justify-between gap-3 border-b pb-4"><Button variant="ghost" nativeButton={false} render={<Link href={`/red-flag/${flag.id}`} />}><ArrowLeft className="size-4" />Back to Red Flag</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print Report</Button></div>
    <article className="red-flag-print-report mx-auto w-full max-w-[920px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <header className="border-b bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Red Flag Resolution Report</h1><p className="mt-1 font-mono text-sm text-slate-300">{flag.id}</p></div><div className="flex flex-wrap gap-2"><SeverityBadge severity={flag.severity} /><RedFlagStatusBadge status={flag.status} /></div></div><h2 className="mt-5 text-xl font-semibold">{flag.title}</h2></header>
      <div className="grid gap-7 p-6 sm:p-8">
        <section className="red-flag-print-block grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"><ReportMeta label="Plant" value={flag.plant} /><ReportMeta label="Zone" value={flag.zone} /><ReportMeta label="Location" value={flag.location} /><ReportMeta label="Machine / Asset" value={flag.machineAsset || "Not specified"} /><ReportMeta label="Raised By" value={flag.raisedByName} /><ReportMeta label="Raised On" value={formatShortDate(flag.raisedAt)} /><ReportMeta label="Age / Resolution Time" value={redFlagAgeLabel(flag)} /><ReportMeta label="Linked Action" value={action ? `${action.id} · ${action.status}` : "No formal Action"} /><ReportMeta label="Closure Reviewer" value={flag.closedByName || "Awaiting verification"} /></section>
        <section className="red-flag-print-block border-y py-5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Issue description</p><p className="mt-2 text-sm leading-6">{flag.description}</p></section>
        <section className="red-flag-print-block grid gap-4 sm:grid-cols-2"><ReportText title="Immediate containment" text={flag.containmentNote || "No immediate containment recorded."} /><ReportText title="Corrective outcome" text={action?.resolutionObservation || action?.actionTakenDescription || flag.closureRemark || "Corrective outcome not yet verified."} /></section>
        <section className="red-flag-print-block"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Initial Evidence</h3><Badge variant="secondary">{initial.length}</Badge></div><div className="mt-3"><ReportEvidence evidence={initial} /></div></section>
        {(additional.length > 0 || closure.length > 0 || (action?.evidence.length ?? 0) > 0) && <section className="red-flag-print-block grid gap-5 border-t pt-5"><div><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Additional Evidence</h3><Badge variant="secondary">{additional.length}</Badge></div><div className="mt-3"><ReportEvidence evidence={additional} /></div></div><div><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Closure Evidence</h3><Badge variant="secondary">{closure.length + (action?.evidence.length ?? 0)}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{closure.map((item) => <EvidenceFigure key={item.id} name={item.note || item.name} url={item.url} />)}{action?.evidence.map((item) => <EvidenceFigure key={item.id} name={`Action · ${item.name}`} url={item.url} />)}{closure.length === 0 && !action?.evidence.length && <p className="col-span-full text-xs text-muted-foreground">No closure evidence captured.</p>}</div></div></section>}
        <section className="red-flag-print-block rounded-lg border p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Closure decision</p><p className="mt-2 text-sm leading-6">{flag.closureRemark || "This Red Flag has not been formally closed."}</p>{flag.closedAt && <p className="mt-3 text-xs text-muted-foreground">Verified by {flag.closedByName} · {formatShortDate(flag.closedAt)}</p>}</section>
      </div>
      <footer className="border-t px-6 py-4 text-[10px] text-muted-foreground sm:px-8">Generated from OPS Red Flag · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</footer>
    </article>
  </PageContainer>;
}

function ReportMeta({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-5">{value}</p></div>; }
function ReportText({ title, text }: { title: string; text: string }) { return <div className="rounded-lg border p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p><p className="mt-2 text-sm leading-6">{text}</p></div>; }
function ReportEvidence({ evidence }: { evidence: Parameters<typeof EvidenceGallery>[0]["evidence"] }) { return evidence.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{evidence.map((item) => <EvidenceFigure key={item.id} name={item.note || item.name} url={item.url} />)}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">No evidence captured.</p>; }
function EvidenceFigure({ name, url }: { name: string; url?: string }) { return <figure className="overflow-hidden rounded-md border">{url ? <img src={url} alt={name} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-muted"><ImageIcon className="size-5 text-muted-foreground" /></div>}<figcaption className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{name}</figcaption></figure>; }
