"use client";
/* eslint-disable @next/next/no-img-element -- report evidence may be a camera-uploaded data URL. */

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { canViewImprovement } from "./access";
import { formatImprovementDate, formatImprovementMoney } from "./components";
import { useImprovements } from "./store";
import type { ImprovementEvidence } from "./types";

export default function ContinuousImprovementReportPage({ improvementId }: { improvementId: string }) {
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const item = useImprovements().find((record) => record.id === improvementId);
  const allActions = useActionStore();
  if (!item || !canViewImprovement(adminUser, currentUser, item)) return <PageContainer><FiveSPageHeader eyebrow="Continuous Improvement / Report" title="Report unavailable" description="The requested improvement is unavailable or outside your permitted scope." /></PageContainer>;
  const actions = item.actionIds.map((id) => allActions.find((action) => action.id === id)).filter(Boolean);
  const variance = typeof item.actualSaving === "number" && typeof item.proposedSaving === "number" ? item.actualSaving - item.proposedSaving : undefined;
  return <PageContainer className="max-w-none"><style>{`@media print{@page{size:A4 landscape;margin:8mm}.ci-report-actions{display:none!important}.ci-report-document{border:0!important;box-shadow:none!important}.ci-report-block{break-inside:avoid;page-break-inside:avoid}body{background:#fff!important}}`}</style>
    <div className="ci-report-actions"><FiveSPageHeader eyebrow="Continuous Improvement / Report" title="Report Preview" description="Print or save this improvement report as PDF." leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}`} />}><ArrowLeft className="size-4" /></Button>} actions={<Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button>} /></div>
    <article className="ci-report-document mx-auto max-w-[1220px] overflow-hidden rounded-xl border border-blue-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <header className="ci-report-block border-b border-blue-100 bg-gradient-to-b from-blue-50/70 to-white px-6 py-5 text-center dark:border-slate-700 dark:from-blue-950/30 dark:to-slate-900"><Badge variant={item.status === "completed" ? "success" : "info"}>{item.status.replaceAll("_", " ")}</Badge><p className="mt-3 text-2xl font-extrabold uppercase tracking-[.08em] text-blue-800 dark:text-blue-300">Continuous Improvement Report</p><p className="mt-2 font-mono text-xs text-blue-700 dark:text-blue-400">{item.id}</p><h1 className="mx-auto mt-2 max-w-4xl text-2xl font-extrabold">{item.title}</h1></header>
      <div className="grid gap-4 p-5">
        <section className="ci-report-block grid gap-px overflow-hidden rounded-lg border border-blue-200 bg-blue-100 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-4"><ReportMeta label="Plant" value={item.plant} /><ReportMeta label="Zone" value={item.zone} /><ReportMeta label="Proposed By" value={item.proposedByName} /><ReportMeta label="Owner" value={item.ownerName} /><ReportMeta label="Participants" value={item.memberNames.join(", ") || "None"} /><ReportMeta label="Created" value={formatImprovementDate(item.createdAt)} /><ReportMeta label="Estimated Time" value={`${item.estimatedTime} ${item.estimatedTimeUnit}`} /><ReportMeta label="Benefit Type" value={item.benefitType} /></section>
        <section className="ci-report-block grid gap-3 md:grid-cols-3"><ReportText title="Problem / Opportunity" text={item.issueDescription} /><ReportText title="Proposed Improvement" text={item.proposedImprovement} /><ReportText title="Expected Benefit" text={item.expectedBenefit} /></section>
        <section className="ci-report-block grid gap-3 sm:grid-cols-3"><ReportStat label="Proposed Saving" value={formatImprovementMoney(item.proposedSaving)} /><ReportStat label="Actual Saving" value={formatImprovementMoney(item.actualSaving)} positive /><ReportStat label="Variance" value={typeof variance === "number" ? formatImprovementMoney(variance) : "Pending"} positive={typeof variance === "number" && variance >= 0} /></section>
        <section className="ci-report-block grid gap-3 md:grid-cols-2"><ReportEvidence label="Before Evidence" evidence={item.beforeEvidence} description={item.issueDescription} tone="before" /><ReportEvidence label="After Evidence" evidence={item.afterEvidence} description={item.actualBenefit || "Completion evidence pending"} tone="after" /></section>
        <section className="ci-report-block grid gap-3 md:grid-cols-2"><ReportText title="Implementation Process" text={item.implementationProcess || "Not started"} /><ReportText title="Final Action Taken" text={item.actionTaken || "Not recorded"} /><ReportText title="Actual Benefit" text={item.actualBenefit || "Not recorded"} /><ReportText title="Review Decision" text={`${item.reviewDecision ?? "Pending"}${item.reviewRemark ? ` · ${item.reviewRemark}` : ""}`} /></section>
        <section className="ci-report-block rounded-lg border border-blue-100 p-4 dark:border-slate-700"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">Linked Actions</p>{actions.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{actions.map((action) => action && <div key={action.id} className="rounded-md border p-3"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{action.id}</span><Badge variant={action.status === "Completed" ? "success" : "warning"}>{action.status}</Badge></div><p className="mt-2 text-xs font-semibold">{action.title}</p><p className="mt-1 text-[11px] text-slate-500">{action.responsiblePersonName ?? action.assignedTo}</p></div>)}</div> : <p className="mt-2 text-xs text-slate-500">No linked Actions.</p>}</section>
        <section className="ci-report-block grid gap-px overflow-hidden rounded-lg border border-blue-200 bg-blue-100 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-4"><ReportMeta label="Proposal Reviewed By" value={item.reviewedByName ?? "Pending"} /><ReportMeta label="Proposal Review Date" value={formatImprovementDate(item.reviewedAt)} /><ReportMeta label="Completion Reviewed By" value={item.completionReviewedByName ?? item.completedByName ?? "Pending"} /><ReportMeta label="Completion Date" value={formatImprovementDate(item.completedAt)} /></section>
      </div>
    </article>
  </PageContainer>;
}

function ReportEvidence({ label, evidence, description, tone }: { label: string; evidence: ImprovementEvidence[]; description: string; tone: "before" | "after" }) { const primary = evidence[0]; return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className={`py-2 text-center text-xs font-bold uppercase tracking-wider text-white ${tone === "before" ? "bg-amber-600" : "bg-emerald-600"}`}>{label}</div>{primary ? <img src={primary.url} alt={primary.caption || primary.name} className="aspect-[16/8] w-full object-cover" /> : <div className="grid aspect-[16/8] place-items-center bg-slate-50 text-sm text-slate-400 dark:bg-slate-800">No evidence</div>}<p className="min-h-16 p-3 text-center text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{description}</p></div>; }
function ReportMeta({ label, value }: { label: string; value: string }) { return <div className="bg-white p-3 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>; }
function ReportStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30"><p className={`text-2xl font-extrabold ${positive ? "text-emerald-700 dark:text-emerald-400" : "text-blue-800 dark:text-blue-300"}`}>{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p></div>; }
function ReportText({ title, text }: { title: string; text: string }) { return <div className="rounded-lg border border-blue-100 p-4 dark:border-slate-700"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">{title}</p><p className="mt-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{text}</p></div>; }
