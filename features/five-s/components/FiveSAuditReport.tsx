"use client";

import { ArrowLeft, FileText, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActionStore } from "@/lib/actions/action-store";
import { FIVE_S_ZONE_CONFIGURATION } from "@/lib/five-s/configuration";
import { useFiveSAuditStore } from "@/lib/five-s/audit-store";
import { useI18n } from "@/components/preferences/use-i18n";
import type { FiveSEvidence, FiveSQuestion } from "../types/five-s";
import type { MyAction } from "../types/my-actions";
import { isAuditQuestionAnswered } from "@/features/settings/custom-audit-questions/checklist";

const SCORE_LABELS: Record<number, string> = {
  0: "Non Compliance",
  1: "Partially Compliance",
  2: "Fully Compliance",
};

const SCORE_STYLES: Record<number, string> = {
  0: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
  1: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  2: "border-green-300 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300",
};

function formatDateTime(value?: string, locale = "en-IN") {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(value.includes("T") ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function percentage(score: number, maxScore: number) {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="audit-report-section">
      <h2 className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EvidenceItem({ evidence }: { evidence: FiveSEvidence | NonNullable<MyAction["issueEvidence"]>[number] }) {
  const url = "dataUrl" in evidence ? evidence.dataUrl : evidence.url;
  return (
    <div className="audit-report-block flex min-w-0 items-center gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
      {evidence.type === "image" && url ? (
        // Stored evidence uses local data URLs, so framework optimization is not applicable.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-12 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
          <FileText className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium" title={evidence.name}>{evidence.name}</p>
        <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{evidence.type}</p>
      </div>
    </div>
  );
}

export default function FiveSAuditReport({ auditId, origin, returnTo }: { auditId: string; origin?: string; returnTo?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const reportsOrigin = origin === "reports-audit";
  const backDestination = reportsOrigin && (returnTo?.startsWith("/5s/reports") || returnTo?.startsWith("/reports")) ? returnTo : "/5s/audits";
  const backLabel = reportsOrigin ? t("reports.backAuditReports") : t("reports.backAudits");
  const audits = useFiveSAuditStore();
  const allActions = useActionStore();
  const audit = audits.find((item) => item.id === auditId);

  if (!audit) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <FileText className="size-9 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Audit report unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">The requested audit could not be found in the current audit store.</p>
        <Button className="mt-5" variant="outline" onClick={() => router.push(backDestination)}>{backLabel}</Button>
      </div>
    );
  }

  const questions = audit.sections.flatMap((section) => section.questions);
  const completedQuestions = questions.filter(isAuditQuestionAnswered).length;
  const actions = allActions.filter((action) =>
    action.auditId === audit.id ||
    action.auditId === audit.title ||
    action.sourceTitle === audit.title
  );
  const evidence = audit.sections.flatMap((section) =>
    section.questions.flatMap((question) =>
      (question.evidence ?? []).map((item) => ({ section: section.category, question, item }))
    )
  );
  const scorePercent = percentage(audit.score, audit.maxScore);
  const displayStatus = audit.status === "Completed" ? "Completed" : completedQuestions === questions.length ? "Ready for Completion" : audit.status;
  const generatedAt = formatDateTime(new Date().toISOString(), locale);
  // Completed Audit records predate organization editing, so reports retain the seeded ownership snapshot.
  const zoneLeader = FIVE_S_ZONE_CONFIGURATION.find((zone) => zone.name === audit.area)?.leader;
  const actionCounts = {
    open: actions.filter((action) => ["Awaiting Assignment", "Assigned", "Open"].includes(action.status)).length,
    inProgress: actions.filter((action) => action.status === "In Progress").length,
    pendingReview: actions.filter((action) => ["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status)).length,
    rework: actions.filter((action) => action.status === "Rework Required").length,
    overdue: actions.filter((action) => action.status === "Overdue").length,
    closed: actions.filter((action) => action.status === "Completed").length,
  };
  const totalCostSaving = actions
    .filter((action) => action.status === "Completed")
    .reduce((total, action) => total + (Number.isFinite(action.costSaving) ? action.costSaving ?? 0 : 0), 0);

  async function handlePrint() {
    await document.fonts?.ready;
    const report = document.querySelector<HTMLElement>(".audit-report-document");
    const images = report ? Array.from(report.querySelectorAll("img")) : [];
    await Promise.all(images.map(async (image) => { if (image.complete) return; try { await image.decode(); } catch { /* Keep the report printable if optional evidence fails. */ } }));
    window.print();
  }

  return (
    <div className="audit-report-page -m-5 min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:-m-6 sm:p-6 lg:-m-7 xl:-m-8">
      <div className="audit-report-controls mx-auto mb-4 flex max-w-[1120px] flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(backDestination)}>
          <ArrowLeft className="size-4" /> {backLabel}
        </Button>
        <div className="flex flex-wrap gap-2">
          {reportsOrigin && <Button variant="outline" onClick={() => router.push(`/audits?audit=${encodeURIComponent(audit.id)}`)}>
            <FileText className="size-4" /> View Audit
          </Button>}
          <Button onClick={handlePrint}>
            <Printer className="size-4" /> {t("reports.savePdf")}
          </Button>
        </div>
      </div>

      <article className="audit-report-document mx-auto min-w-0 max-w-[1120px] space-y-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:space-y-7 sm:p-8">
        <header className="flex flex-col justify-between gap-5 border-b-2 border-slate-900 pb-5 dark:border-slate-200 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary">{t("reports.auditReport")}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{audit.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{audit.plant} · {audit.area}</p>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <p>{t("reports.reportGenerated")}</p>
            <p className="mt-1 font-medium text-foreground">{generatedAt}</p>
          </div>
        </header>

        <ReportSection title={t("reports.auditSummary")}>
          <div className="audit-summary-grid grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {[
              [`${completedQuestions} / ${questions.length}`, "Questions"],
              [`${audit.score} / ${audit.maxScore}`, "Total Score"],
              [`${scorePercent}%`, "Compliance"],
              [String(actions.length), "Actions"],
              [String(actionCounts.open), "Open"],
              [String(actionCounts.inProgress), "In Progress"],
              [String(actionCounts.pendingReview), "Pending Review"],
              [String(actionCounts.rework), "Rework"],
              [String(actionCounts.overdue), "Overdue"],
              [String(actionCounts.closed), "Closed"],
              [String(evidence.length), "Evidence"],
              [`₹${totalCostSaving.toLocaleString("en-IN")}`, "Cost Saving"],
            ].map(([value, label]) => (
              <div key={label} className="audit-report-block rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title={t("reports.auditDetails")}>
          <dl className="audit-details-grid grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Plant", audit.plant], ["Zone", audit.area], ["Zone Leader", zoneLeader],
              ["Auditor", audit.auditor], ["Status", displayStatus],
              [t("common.started"), formatDateTime(audit.startedAt, locale)], [t("common.completed"), formatDateTime(audit.completedAt, locale)],
              [t("audit.dueDate"), formatDateTime(audit.dueDate, locale)],
            ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
              <div key={label} className="audit-report-block">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </ReportSection>

        <ReportSection title={t("reports.overallPerformance")}>
          <div className="audit-performance-row audit-report-block flex flex-col gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-3xl font-bold tabular-nums">{scorePercent}%</p><p className="text-sm text-muted-foreground">Overall Compliance</p></div>
            <p className="text-xl font-semibold tabular-nums">{audit.score} / {audit.maxScore}</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((score) => <Badge key={score} variant="outline" className={SCORE_STYLES[score]}>{score} — {SCORE_LABELS[score]}</Badge>)}
            </div>
          </div>
        </ReportSection>

        <ReportSection title={t("reports.sectionPerformance")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead><tr className="border-b border-slate-300 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Section</th><th className="px-3 py-2">Questions</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Compliance</th><th className="px-3 py-2">Actions</th><th className="pl-3 py-2">Non-compliances</th>
              </tr></thead>
              <tbody>{audit.sections.map((section) => {
                const sectionActions = section.questions.filter((question) => question.actionId).length;
                const nonCompliances = section.questions.filter((question) => question.score === 0).length;
                const answered = section.questions.filter(isAuditQuestionAnswered).length;
                return <tr key={section.category} className="audit-report-block border-b border-slate-200 last:border-0 dark:border-slate-700">
                  <td className="py-3 pr-3 font-semibold">{section.category}</td><td className="px-3 py-3">{answered} / {section.questions.length}</td><td className="px-3 py-3">{section.score} / {section.maxScore}</td><td className="px-3 py-3 font-medium">{percentage(section.score, section.maxScore)}%</td><td className="px-3 py-3">{sectionActions}</td><td className="pl-3 py-3">{nonCompliances}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title={t("reports.correctiveActions")}>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Open {actionCounts.open}</Badge>
            <Badge variant="outline">In Progress {actionCounts.inProgress}</Badge>
            <Badge variant="outline">Pending Review {actionCounts.pendingReview}</Badge>
            <Badge variant="outline">Rework {actionCounts.rework}</Badge>
            <Badge variant="outline">Overdue {actionCounts.overdue}</Badge>
            <Badge variant="outline">Closed {actionCounts.closed}</Badge>
          </div>
          {actions.length ? <div className="audit-actions-grid grid gap-3 md:grid-cols-2">{actions.map((action) => {
            const relatedQuestion = questions.find((question) => question.actionId === action.id);
            return <article key={action.id} className="audit-report-block rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{action.id}</p><h3 className="mt-1 text-sm font-semibold">{action.title}</h3></div><Badge variant="outline">{action.status}</Badge></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{action.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{action.actionCategory ?? action.category ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Priority</dt><dd className="font-medium">{action.priority}</dd></div>
                <div><dt className="text-muted-foreground">Responsible Person</dt><dd className="font-medium">{action.responsiblePersonName ?? action.assignedTo}</dd></div>
                <div><dt className="text-muted-foreground">{t("audit.due")}</dt><dd className="font-medium">{formatDateTime(action.dueDate, locale)}</dd></div>
                <div><dt className="text-muted-foreground">Cost Saving</dt><dd className="font-medium">₹{(action.costSaving ?? 0).toLocaleString("en-IN")}</dd></div>
                <div><dt className="text-muted-foreground">5S Section</dt><dd className="font-medium">{action.category ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">{t("common.created")}</dt><dd className="font-medium">{formatDateTime(action.createdAt, locale)}</dd></div>
              </dl>
              {relatedQuestion && <p className="mt-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><span className="text-muted-foreground">Finding:</span> {relatedQuestion.observation || relatedQuestion.question}</p>}
              {[...(action.issueEvidence ?? []), ...action.evidence].length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{[...(action.issueEvidence ?? []), ...action.evidence].map((item) => <EvidenceItem key={item.id} evidence={item} />)}</div>}
              {action.status === "Completed" && <Button size="sm" variant="outline" className="mt-3 print:hidden" onClick={() => router.push(`/5s/actions/${encodeURIComponent(action.id)}/report`)}><FileText className="size-3.5" /> View Action Report</Button>}
            </article>;
          })}</div> : <p className="text-sm text-muted-foreground">No corrective actions were created for this audit.</p>}
        </ReportSection>

        <ReportSection title="Question-Level Findings">
          <div className="space-y-5">{audit.sections.map((section, sectionIndex) => (
            <section key={section.category} className="audit-report-section">
              <h3 className="mb-2 text-sm font-bold">{String(sectionIndex + 1).padStart(2, "0")} — {section.category.toUpperCase()}</h3>
              <div className="space-y-2">{section.questions.map((question, questionIndex) => <QuestionFinding key={question.id} question={question} number={questionIndex + 1} />)}</div>
            </section>
          ))}</div>
        </ReportSection>

        {evidence.length > 0 && <ReportSection title={t("audit.evidence")}>
          <div className="audit-evidence-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{evidence.map(({ section, question, item }) => (
            <div key={item.id} className="audit-report-block"><p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">{section} · {question.id}</p><EvidenceItem evidence={item} /></div>
          ))}</div>
        </ReportSection>}

        {audit.auditorSignature && <ReportSection title={t("signature.title")}>
          <div className="audit-report-block grid items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-[1fr_260px_1fr]">
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Signed By</p><p className="mt-1 text-sm font-semibold">{audit.auditorSignature.userName}</p><p className="mt-1 text-xs text-muted-foreground">Auditor</p></div>
            <img src={audit.auditorSignature.signatureImage} alt={`${audit.auditorSignature.userName} auditor signature`} className="h-24 w-full rounded-md border bg-white object-contain p-2" />
            <div className="sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("signature.signedOn")}</p><p className="mt-1 text-sm font-semibold">{formatDateTime(audit.auditorSignature.signedAt, locale)}</p></div>
          </div>
        </ReportSection>}

        <footer className="audit-report-footer border-t border-slate-200 pt-4 text-[10px] text-muted-foreground dark:border-slate-700">
          {audit.title} · Report Generated {generatedAt}
        </footer>
      </article>
    </div>
  );
}

function QuestionFinding({ question, number }: { question: FiveSQuestion; number: number }) {
  const score = question.score;
  const border = score === 0 ? "border-l-red-500" : score === 1 ? "border-l-amber-500" : score === 2 ? "border-l-green-500" : "border-l-slate-300 dark:border-l-slate-600";
  const response = question.responseType === "Text" ? question.textResponse : question.responseType === "Yes / No" ? question.yesNoResponse : undefined;
  return (
    <article className={`audit-report-block rounded-md border border-l-4 border-slate-200 p-3 dark:border-slate-700 ${border}`}>
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-medium leading-5"><span className="mr-2 text-muted-foreground">Q{number}</span>{question.question}{question.questionSource === "custom" && <Badge variant="outline" className="ml-2 text-[9px]">Custom</Badge>}</p>{score !== null ? <Badge variant="outline" className={`shrink-0 ${SCORE_STYLES[score]}`}>{score} — {SCORE_LABELS[score]}</Badge> : response ? <Badge variant="outline" className="shrink-0">{question.responseType === "Text" ? "Answered" : response}</Badge> : null}</div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-[1fr_auto_auto]">
        <p><span className="text-muted-foreground">{response ? "Response:" : "Observation:"}</span> {response || question.observation || "No observation recorded"}</p>
        <p><span className="text-muted-foreground">Action:</span> {question.actionId ? "Created" : "None"}</p>
        <p><span className="text-muted-foreground">Evidence:</span> {question.evidence?.length ?? 0}</p>
      </div>
    </article>
  );
}
