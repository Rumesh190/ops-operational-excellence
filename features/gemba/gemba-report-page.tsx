"use client";
/* eslint-disable @next/next/no-img-element -- the printable report includes local and captured evidence. */

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { formatShortDate } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { canViewGembaWalk } from "./gemba-access";
import { ObservationTypeBadge } from "./gemba-components";
import { useGembaStore } from "./gemba-store";
import { formatGembaZoneLabel } from "./gemba-zone-labels";

export default function GembaReportPage({ walkId }: { walkId: string }) {
  const state = useGembaStore();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const candidate = state.walks.find((item) => item.id === walkId);
  const walk = candidate && canViewGembaWalk(candidate, currentUser, adminUser?.roles) ? candidate : undefined;
  if (!walk) return <PageContainer><p className="text-sm">Gemba walk not found.</p><Button className="w-fit" nativeButton={false} render={<Link href="/gemba" />}>Return to Gemba</Button></PageContainer>;
  const observations = state.observations.filter((item) => item.gembaId === walk.id);
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  const positive = observations.filter((item) => item.type === "Positive").length;
  const opportunity = observations.filter((item) => item.type === "Opportunity").length;
  const issue = observations.filter((item) => item.type === "Issue").length;
  return <PageContainer className="max-w-6xl">
    <div className="gemba-report-toolbar flex flex-wrap items-center justify-between gap-3 border-b pb-4"><Button variant="ghost" nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />}><ArrowLeft className="size-4" />Back to Walk</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print Report</Button></div>
    <article className="gemba-print-report mx-auto w-full max-w-[920px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <header className="border-b bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Gemba Walk Report</h1><p className="mt-1 font-mono text-sm text-slate-300">{walk.id}</p></div><Badge variant={walk.status === "Completed" ? "success" : "info"}>{walk.status}</Badge></div></header>
      <div className="grid gap-7 p-6 sm:p-8">
        <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"><ReportMeta label="Plant" value={walk.plant} /><ReportMeta label="Zone" value={formatGembaZoneLabel(walk.zone)} /><ReportMeta label="Walk Lead" value={walk.leadName} /><ReportMeta label="Participants" value={walk.participants.length ? walk.participants.map((item) => item.name).join(", ") : "None recorded"} /><ReportMeta label="Date" value={formatShortDate(walk.scheduledDate)} /><ReportMeta label="Duration" value={durationLabel(walk.startedAt, walk.completedAt)} /><div className="sm:col-span-2 lg:col-span-3"><ReportMeta label="Purpose" value={walk.purpose} /></div></section>
        <section className="border-y py-5"><h2 className="text-sm font-semibold">Walk Summary</h2><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Summary label="Total Observations" value={observations.length} /><Summary label="Positive" value={positive} /><Summary label="Opportunities" value={opportunity} /><Summary label="Issues" value={issue} /><Summary label="Actions Created" value={walk.actionIds.length} /></div></section>
        <section><h2 className="text-sm font-semibold">Observations</h2><div className="mt-3 grid gap-4">{observations.map((observation, index) => { const action = observation.actionId ? actionMap.get(observation.actionId) : undefined; return <article key={observation.id} className="gemba-print-observation break-inside-avoid rounded-lg border p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><ObservationTypeBadge type={observation.type} /><span className="font-mono text-[10px] text-muted-foreground">{observation.id}</span></div><h3 className="mt-3 text-base font-semibold">{observation.title}</h3><p className="mt-1 text-xs text-muted-foreground">{formatGembaZoneLabel(walk.zone)} · {observation.location}</p><p className="mt-3 text-sm leading-6">{observation.description}</p>{observation.evidence.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{observation.evidence.map((item) => <figure key={item.id} className="overflow-hidden rounded-md border"><img src={item.url} alt={item.note || item.name} className="aspect-[4/3] w-full object-cover" /><figcaption className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{item.note || item.name}</figcaption></figure>)}</div>}<div className="mt-4 border-t pt-3 text-xs">{action ? <p><span className="text-muted-foreground">Action reference:</span> <strong>{action.id}</strong> · {action.status}</p> : observation.noActionReason ? <p><span className="text-muted-foreground">Follow-up:</span> {observation.noActionReason}</p> : <p className="text-muted-foreground">No action linked.</p>}</div></article>; })}{observations.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No observations captured.</p>}</div></section>
      </div>
      <footer className="border-t px-6 py-4 text-[10px] text-muted-foreground sm:px-8">Generated from OPS Gemba · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</footer>
    </article>
  </PageContainer>;
}

function ReportMeta({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-5">{value}</p></div>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>; }
function durationLabel(start?: string, end?: string) { if (!start) return "Not started"; const minutes = Math.max(0, Math.round(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 60_000)); return `${minutes} minutes`; }
