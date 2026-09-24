"use client";
/* eslint-disable @next/next/no-img-element -- report evidence is resolved from IndexedDB/object URLs and legacy static URLs. */

import Link from "next/link";
import { ArrowLeft, FileAudio, FileCheck2, ImageIcon, Lightbulb, Printer, Share2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useImprovements } from "@/features/five-s/continuous-improvement/store";
import { useRedTags } from "@/features/five-s/red-tag/store";
import { formatShortDate } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { canViewGembaWalk } from "./gemba-access";
import { ObservationTypeBadge } from "./gemba-components";
import { useGembaStore } from "./gemba-store";
import { formatGembaZoneLabel } from "./gemba-zone-labels";
import { resolveGembaCorrectiveActionNeeded, type GembaEvidence, type GembaObservation } from "./types";
import { useGembaEvidenceUrl } from "./use-gemba-evidence-url";

export function buildGembaReportSummary(observations: GembaObservation[]) {
  const unique = (values: Array<string | undefined>) => new Set(values.filter((value): value is string => Boolean(value))).size;
  return {
    total: observations.length,
    positive: observations.filter((item) => item.type === "Positive").length,
    opportunity: observations.filter((item) => item.type === "Opportunity").length,
    issue: observations.filter((item) => item.type === "Issue").length,
    actions: unique(observations.map((item) => item.actionId)),
    redTags: unique(observations.map((item) => item.redTagId)),
    improvements: unique(observations.map((item) => item.improvementId)),
    horizontalDeployments: observations.filter((item) => item.horizontalDeployment?.enabled).length,
  };
}

export default function GembaReportPage({ walkId }: { walkId: string }) {
  const state = useGembaStore();
  const actions = useActionStore();
  const redTags = useRedTags();
  const improvements = useImprovements();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const candidate = state.walks.find((item) => item.id === walkId);
  const walk = candidate && canViewGembaWalk(candidate, currentUser, adminUser?.roles) ? candidate : undefined;

  if (!walk) return <PageContainer><div className="grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-center"><div><h1 className="text-lg font-semibold">Gemba report unavailable</h1><p className="mt-1 text-sm text-muted-foreground">The requested walk does not exist or is outside your permitted scope.</p><Button className="mt-4" nativeButton={false} render={<Link href="/gemba" />}>Return to Gemba</Button></div></div></PageContainer>;

  const observations = state.observations.filter((item) => item.gembaId === walk.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const summary = buildGembaReportSummary(observations);
  const actionMap = new Map(actions.map((item) => [item.id, item]));
  const redTagMap = new Map(redTags.map((item) => [item.id, item]));
  const improvementMap = new Map(improvements.map((item) => [item.id, item]));

  return <PageContainer className="max-w-none print:p-0">
    <style>{`@media print{@page{size:A4 portrait;margin:10mm}.gemba-report-toolbar{display:none!important}.gemba-print-report{max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.gemba-print-observation{break-inside:avoid;page-break-inside:avoid}.gemba-evidence-grid figure{break-inside:avoid;page-break-inside:avoid}body{background:white!important}.gemba-print-report header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
    <div className="gemba-report-toolbar mx-auto flex w-full max-w-[980px] flex-wrap items-center justify-between gap-3 border-b pb-4"><Button variant="ghost" nativeButton={false} render={<Link href={`/gemba/${encodeURIComponent(walk.id)}`} />}><ArrowLeft className="size-4" />Back to Walk</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button></div>
    <article className="gemba-print-report mx-auto w-full max-w-[980px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <header className="border-b bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Gemba Walk Report</h1><p className="mt-1 font-mono text-sm text-slate-300">{walk.id}</p></div><Badge variant={walk.status === "Completed" ? "success" : "info"}>{walk.status}</Badge></div></header>
      <div className="grid gap-7 p-5 sm:p-8">
        <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4"><ReportMeta label="Plant" value={walk.plant} /><ReportMeta label="Zone" value={formatGembaZoneLabel(walk.zone)} /><ReportMeta label="Walk Lead" value={walk.leadName} /><ReportMeta label="Date" value={formatShortDate(walk.scheduledDate)} /><ReportMeta label="Started" value={formatDateTime(walk.startedAt)} /><ReportMeta label="Completed" value={formatDateTime(walk.completedAt)} /><ReportMeta label="Duration" value={durationLabel(walk.startedAt, walk.completedAt)} /><ReportMeta label="Status" value={walk.status} /><div className="sm:col-span-2 lg:col-span-4"><ReportMeta label="Participants" value={participantLabel(walk.participants)} /></div><div className="sm:col-span-2 lg:col-span-4"><ReportMeta label="Purpose" value={walk.purpose} /></div>{walk.notes && <div className="sm:col-span-2 lg:col-span-4"><ReportMeta label="Notes" value={walk.notes} /></div>}</section>
        <section className="border-y py-5"><h2 className="text-sm font-semibold">Executive Walk Summary</h2><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Summary label="Total Observations" value={summary.total} /><Summary label="Positive" value={summary.positive} /><Summary label="Opportunities" value={summary.opportunity} /><Summary label="Issues" value={summary.issue} /><Summary label="Actions Created" value={summary.actions} /><Summary label="Red Tags Created" value={summary.redTags} /><Summary label="Improvements Created" value={summary.improvements} /><Summary label="Horizontal Deployments" value={summary.horizontalDeployments} /></div></section>
        <section><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary">Walk Record</p><h2 className="mt-1 text-base font-semibold">Observations</h2></div><span className="text-xs text-muted-foreground">{summary.total} total</span></div><div className="mt-3 grid gap-5">{observations.map((observation, index) => {
          const action = observation.actionId ? actionMap.get(observation.actionId) : undefined;
          const redTag = observation.redTagId ? redTagMap.get(observation.redTagId) : undefined;
          const improvement = observation.improvementId ? improvementMap.get(observation.improvementId) : undefined;
          const correctiveActionNeeded = resolveGembaCorrectiveActionNeeded(observation);
          return <article key={observation.id} className="gemba-print-observation rounded-lg border p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">OBSERVATION {String(index + 1).padStart(2, "0")}</span><ObservationTypeBadge type={observation.type} /></div><span className="font-mono text-[10px] text-muted-foreground">{observation.id}</span></div>
            <h3 className="mt-3 text-base font-semibold">{observation.title}</h3><p className="mt-1 text-xs text-muted-foreground">{observation.location} · Observed {formatDateTime(observation.createdAt)} · {observation.createdByName}</p><p className="mt-3 text-sm leading-6">{observation.description}</p>
            {observation.peopleInvolved.length > 0 && <p className="mt-2 text-xs"><span className="text-muted-foreground">People involved:</span> {observation.peopleInvolved.join(", ")}</p>}
            {observation.evidence.length > 0 && <div className="gemba-evidence-grid mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{observation.evidence.map((item) => <ReportEvidence key={item.id} evidence={item} />)}</div>}
            {observation.voiceNote && <div className="mt-4 flex items-center gap-2 rounded-md border bg-muted/15 px-3 py-2 text-xs"><FileAudio className="size-4 text-primary" /><span><strong>Voice note attached</strong> · {observation.voiceNote.durationSeconds}s{observation.voiceNote.transcript ? " · Structured observation text shown above" : ""}</span></div>}
            {(correctiveActionNeeded !== undefined || observation.redTagId || observation.improvementId) && <div className="mt-4 border-t pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational follow-up</p><div className="mt-2 grid gap-2 sm:grid-cols-2">
              {observation.type !== "Positive" && <div className="rounded-md border px-3 py-2 text-xs"><p className="font-semibold">Corrective Action</p><p className="mt-1 text-muted-foreground">{correctiveActionNeeded ? "Required" : "Not required"}</p></div>}
              {observation.actionId && <LinkedRecord icon={FileCheck2} label="Action" id={observation.actionId} href={`/actions/${encodeURIComponent(observation.actionId)}`} available={Boolean(action)} detail={action ? `${action.status} · ${action.responsiblePersonName ?? action.assignedTo ?? "Owner not assigned"} · Due ${formatShortDate(action.dueDate)}` : "Linked record unavailable"} />}
              {observation.redTagId && <LinkedRecord icon={Tag} label="Red Tag" id={observation.redTagId} href={`/5s/red/${encodeURIComponent(observation.redTagId)}`} available={Boolean(redTag)} detail={redTag ? `${redTag.status} · ${redTag.itemName}${redTag.decisionRecord ? ` · ${redTag.decisionRecord.type.replaceAll("_", " ")}` : ""}` : "Linked record unavailable"} />}
              {observation.improvementId && <LinkedRecord icon={Lightbulb} label="Continuous Improvement" id={observation.improvementId} href={`/continuous-improvement/${encodeURIComponent(observation.improvementId)}`} available={Boolean(improvement)} detail={improvement ? `${improvement.status.replaceAll("_", " ")} · ${improvement.title}` : "Linked record unavailable"} />}
              {correctiveActionNeeded === false && observation.noActionReason && <div className="rounded-md border px-3 py-2 text-xs"><p className="font-semibold">Reason corrective action is not required</p><p className="mt-1 text-muted-foreground">{observation.noActionReason}</p></div>}
            </div></div>}
            {observation.horizontalDeployment?.enabled && <div className="mt-4 border-t pt-3"><p className="flex items-center gap-2 text-xs font-semibold"><Share2 className="size-3.5 text-primary" />Horizontal Deployment · {observation.horizontalDeployment.recipients.length} zone{observation.horizontalDeployment.recipients.length === 1 ? "" : "s"}</p><div className="mt-2 divide-y rounded-md border px-3">{observation.horizontalDeployment.recipients.map((recipient) => <div key={recipient.zoneId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span><strong>{formatGembaZoneLabel(recipient.zoneName)}</strong> · {recipient.leaderName ? `Zone Leader: ${recipient.leaderName}` : "Zone Leader not assigned"}</span><span className="text-muted-foreground">{recipient.notificationStatus === "shared" ? "Shared" : "Notification unavailable"}</span></div>)}</div></div>}
          </article>;
        })}{observations.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center"><ImageIcon className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">No observations captured</p><p className="mt-1 text-xs text-muted-foreground">This walk has no observation records to include in the report.</p></div>}</div></section>
      </div>
      <footer className="border-t px-6 py-4 text-[10px] text-muted-foreground sm:px-8">Generated from the current OPS Gemba record · {formatDateTime(new Date().toISOString())}</footer>
    </article>
  </PageContainer>;
}

function ReportEvidence({ evidence }: { evidence: GembaEvidence }) {
  const url = useGembaEvidenceUrl(evidence);
  return <figure className="overflow-hidden rounded-md border bg-muted/10">{url ? <img src={url} alt={evidence.note || evidence.name} className="aspect-[4/3] w-full object-contain" /> : <div className="grid aspect-[4/3] place-items-center p-3 text-center text-[11px] text-muted-foreground"><span><ImageIcon className="mx-auto mb-2 size-5" />Evidence unavailable</span></div>}<figcaption className="border-t px-2 py-1.5 text-[10px] text-muted-foreground"><span className="block truncate">{evidence.note || evidence.name}</span><span>{evidence.uploadedBy} · {formatDateTime(evidence.uploadedAt)}</span></figcaption></figure>;
}

function LinkedRecord({ icon: Icon, label, id, href, available, detail }: { icon: typeof FileCheck2; label: string; id: string; href: string; available: boolean; detail: string }) {
  const content = <><Icon className="mt-0.5 size-3.5 shrink-0 text-primary" /><span className="min-w-0"><span className="block font-semibold">{label} · {id}</span><span className="mt-0.5 block text-muted-foreground capitalize">{detail}</span></span></>;
  return available ? <Link href={href} className="flex gap-2 rounded-md border px-3 py-2 text-xs outline-none hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring print:text-black">{content}</Link> : <div className="flex gap-2 rounded-md border px-3 py-2 text-xs">{content}</div>;
}

function ReportMeta({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-5">{value}</p></div>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>; }
function participantLabel(participants: Array<{ name: string; homeZone?: string }>) { return participants.length ? participants.map((item) => item.homeZone ? `${item.name} (${formatGembaZoneLabel(item.homeZone)})` : item.name).join(", ") : "None recorded"; }
function formatDateTime(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded"; }
function durationLabel(start?: string, end?: string) { if (!start) return "Not recorded"; if (!end) return "In progress"; const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)); return `${minutes} minutes`; }
