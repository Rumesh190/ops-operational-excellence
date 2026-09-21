"use client";
/* eslint-disable @next/next/no-img-element -- summary reports render user-captured evidence URLs. */

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, ImageIcon, Printer } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRoleVisibleActions } from "@/features/actions/action-center-data";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { canSeeImprovement, useImprovements } from "@/features/five-s/continuous-improvement/store";
import { useGembaStore } from "@/features/gemba/gemba-store";
import type { GembaWalk } from "@/features/gemba/types";
import { visibleRedFlags } from "@/features/red-flag/red-flag-access";
import { useRedFlagStore } from "@/features/red-flag/red-flag-store";
import { canViewVisualImprovement } from "@/features/visual-improvement/visual-improvement-access";
import { useVisualImprovements } from "@/features/visual-improvement/visual-improvement-store";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { useFiveSAuditStore } from "@/lib/five-s/audit-store";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { downloadCsv, safeReportFilename } from "./report-export";
import { getReportModule, getReportType, type ReportTypeId } from "./report-registry";
import { buildReportSummary, reportSummaryToCsv } from "./report-summary-data";

export default function ReportSummaryPage({ reportTypeId }: { reportTypeId: string }) {
  const definition = getReportType(reportTypeId);
  const access = useModuleEntitlements();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const audits = useFiveSAuditStore();
  const allActions = useActionStore();
  const allImprovements = useImprovements();
  const allRedFlags = useRedFlagStore();
  const allVisualImprovements = useVisualImprovements();
  const allGemba = useGembaStore();
  const moduleDefinition = definition ? getReportModule(definition.module) : undefined;
  const entitled = Boolean(moduleDefinition && access[moduleDefinition.entitlement]);

  const report = useMemo(() => {
    if (!definition || definition.sourceType !== "summary" || !entitled) return null;
    const actions = access.actions ? getRoleVisibleActions(allActions, currentUser, adminUser) : [];
    const improvements = access.continuousImprovement ? allImprovements.filter((record) => canSeeImprovement(record, currentUser)) : [];
    const redFlags = access.redFlag ? visibleRedFlags(allRedFlags, adminUser, currentUser) : [];
    const visualImprovements = definition.module === "visualImprovement" && access.visualImprovement ? allVisualImprovements.filter((record) => canViewVisualImprovement(adminUser, currentUser, record)) : [];
    const walks = access.gemba ? roleVisibleGembaWalks(allGemba.walks, currentUser, adminUser?.roles) : [];
    const walkIds = new Set(walks.map((walk) => walk.id));
    return buildReportSummary(definition.id as ReportTypeId, {
      audits: access.audit ? audits : [], actions, improvements, redFlags, visualImprovements,
      gemba: { walks, observations: access.gemba ? allGemba.observations.filter((observation) => walkIds.has(observation.gembaId)) : [] },
    });
  }, [access, adminUser, allActions, allGemba, allImprovements, allRedFlags, allVisualImprovements, audits, currentUser, definition, entitled]);

  if (!definition || definition.sourceType !== "summary") return <Unavailable title="Report not found" description="This report type is not registered as an OPS data summary." />;
  if (!entitled) return <Unavailable title="Module not enabled" description={`${definition.label} is hidden because ${moduleDefinition?.label ?? "its source module"} is not enabled for the current organization.`} />;
  if (!report) return <Unavailable title="Report unavailable" description="The requested report could not be generated from the current source records." />;

  function exportCsv() {
    downloadCsv(`${safeReportFilename(report!.title)}.csv`, reportSummaryToCsv(report!));
  }

  return <PageContainer className="max-w-none">
    <div className="ops-summary-toolbar flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3"><Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href="/reports" />} aria-label="Back to Reports"><ArrowLeft className="size-4" /></Button><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary">Reports / {report.moduleLabel}</p><h1 className="mt-1 text-xl font-semibold">Report Preview</h1><p className="mt-1 text-xs text-muted-foreground">Generated live from the current OPS source records.</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" nativeButton={false} render={<Link href={report.sourceHref} />}><ExternalLink className="size-4" />View Source Records</Button>{definition.supportsCsv && <Button variant="outline" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>}<Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button></div>
    </div>

    <article className="ops-summary-report mx-auto w-full max-w-[1180px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <header className="ops-summary-block border-b border-slate-200 bg-slate-950 px-6 py-7 text-white sm:px-8"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-sky-300">OPS · Operational Excellence Platform</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight">{report.title}</h2><p className="mt-1 font-mono text-xs text-slate-300">{report.reference}</p></div><Badge variant="success">Final</Badge></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{report.description}</p></header>
      <section className="ops-summary-metadata ops-summary-block grid gap-px border-b bg-slate-200 dark:bg-slate-700 sm:grid-cols-4"><DocumentMeta label="Module" value={report.moduleLabel} /><DocumentMeta label="Generated" value={formatDateTime(report.generatedAt)} /><DocumentMeta label="Rows" value={String(report.rows.length)} /><DocumentMeta label="Source" value="Live OPS records" /></section>
      {report.evidencePairs ? <EvidenceSummary pairs={report.evidencePairs} /> : <DataTable report={report} />}
      <footer className="border-t px-6 py-4 text-[10px] text-slate-500 sm:px-8">Generated from OPS source records · No duplicate report record is stored.</footer>
    </article>
  </PageContainer>;
}

function DataTable({ report }: { report: NonNullable<ReturnType<typeof buildReportSummary>> }) {
  return <section className="p-5 sm:p-7"><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"><tr>{report.columns.map((column) => <th key={column.key} className="px-3 py-3 font-semibold">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700">{report.rows.map((row, index) => <tr key={`${report.typeId}:${index}`} className="align-top"><>{report.columns.map((column) => <td key={column.key} className="max-w-xs px-3 py-3 leading-5">{formatCell(row[column.key])}</td>)}</></tr>)}</tbody></table></div>{!report.rows.length && <div className="grid min-h-40 place-items-center rounded-lg border border-dashed text-center"><div><FileText className="mx-auto size-6 text-slate-400" /><p className="mt-2 text-sm font-semibold">No matching source records</p><p className="mt-1 text-xs text-slate-500">This report is valid and will populate as operational records qualify.</p></div></div>}</section>;
}

function EvidenceSummary({ pairs }: { pairs: NonNullable<NonNullable<ReturnType<typeof buildReportSummary>>["evidencePairs"]> }) {
  return <section className="grid gap-5 p-5 sm:p-7">{pairs.map((pair) => <article key={pair.id} className="ops-summary-block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{pair.module} · {pair.reference}</p><h3 className="mt-1 text-sm font-semibold">{pair.title}</h3></div><p className="text-[10px] text-slate-500">{formatDate(pair.completionDate)}</p></div><div className="grid md:grid-cols-2"><Evidence label="Before" url={pair.before} /><Evidence label="After" url={pair.after} /></div><div className="border-t px-4 py-3 text-xs leading-5"><p>{pair.description}</p><p className="mt-1 text-slate-500">Owner: {pair.owner}</p></div></article>)}{!pairs.length && <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-center"><div><ImageIcon className="mx-auto size-7 text-slate-400" /><p className="mt-2 text-sm font-semibold">No completed before-and-after records</p></div></div>}</section>;
}

function Evidence({ label, url }: { label: string; url?: string }) { return <figure className="border-b border-slate-200 last:border-b-0 dark:border-slate-700 md:border-b-0 md:border-r md:last:border-r-0"><figcaption className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white ${label === "Before" ? "bg-amber-600" : "bg-emerald-600"}`}>{label}</figcaption>{url ? <img src={url} alt={`${label} evidence`} className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-slate-50 text-slate-400 dark:bg-slate-800"><ImageIcon className="size-6" /></div>}</figure>; }
function DocumentMeta({ label, value }: { label: string; value: string }) { return <div className="bg-white p-4 dark:bg-slate-900"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>; }
function Unavailable({ title, description }: { title: string; description: string }) { return <PageContainer><div className="grid min-h-[50vh] place-items-center text-center"><div><FileText className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 text-lg font-semibold">{title}</h1><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p><Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/reports" />}>Back to Reports</Button></div></div></PageContainer>; }
function formatCell(value: string | undefined) { if (!value) return "—"; if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return formatDate(value); return value; }
function formatDate(value: string) { if (!value) return "—"; const date = new Date(value.includes("T") ? value : `${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function roleVisibleGembaWalks(walks: GembaWalk[], currentUser: ReturnType<typeof useCurrentUser>, roles: readonly string[] | undefined) { if (currentUser.isSuperAdmin || roles?.some((role) => role === "Admin" || role === "Auditor")) return walks; return walks.filter((walk) => walk.zone === currentUser.primaryZone || walk.leadId === currentUser.id || walk.participants.some((person) => person.id === currentUser.id)); }
