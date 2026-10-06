"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, DoorOpen, ListTodo, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCanonicalLinkedAction, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { rollbackCreatedAction, useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import {
  evaluateKpiPerformance,
  formatKpiNumericValue,
  formatKpiTarget,
  KPI_BUCKET_LABELS,
  type KpiPerformanceStatus,
  type VisualManagementKpiDefinition,
} from "./kpi-configuration";
import { useVisualManagementKpis } from "./kpi-configuration-store";
import {
  getLatestActual,
  linkDeviationAction,
  submitKpiActual,
  useKpiExecution,
  type KpiDeviation,
} from "./kpi-execution-store";
import { createReportingPeriod } from "./reporting-period";
import { MeetingAttendanceControls } from "./meeting-attendance-controls";
import type { VisualManagementMeeting } from "./types";
import { addMeetingAttendee, addMeetingGuest, completeVisualManagementMeeting, meetingDurationMinutes, removeMeetingAttendee, setMeetingAttendance, useVisualManagementStore } from "./visual-management-store";

type Draft = {
  value: string;
  note: string;
  neutral: boolean;
  responsibleId: string;
  error?: string;
  deviation?: KpiDeviation;
};

type AssignedMetric = VisualManagementKpiDefinition;

function todayKey(type: "daily" | "weekly" | "monthly", now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (type === "daily") return day;
  if (type === "monthly") return day.slice(0, 7);
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - start.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function statusVariant(status: KpiPerformanceStatus) {
  return status === "green" ? "success" : status === "amber" ? "warning" : status === "red" ? "danger" : "muted";
}

function statusLabel(status: KpiPerformanceStatus, neutral: boolean) {
  if (neutral) return "No Production / Holiday";
  return status === "unavailable" ? "Awaiting actual" : status.toUpperCase();
}

function valueLabel(kpi: VisualManagementKpiDefinition) {
  return kpi.measurementType === "percentage"
    ? "Actual value (%)"
    : kpi.unit
      ? `Actual value (${kpi.unit})`
      : "Actual value";
}

export function DailyManagementMeetingWorkspace({ meeting }: { meeting: VisualManagementMeeting }) {
  const router = useRouter();
  const current = useCurrentUser();
  const users = useAdminUsers();
  const actions = useActionStore();
  const state = useVisualManagementStore();
  const kpis = useVisualManagementKpis();
  const execution = useKpiExecution();
  const board = state.boards.find((item) => item.id === meeting.boardId)!;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [summary, setSummary] = useState("");
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const assigned = useMemo<AssignedMetric[]>(
    () =>
      execution.assignments
        .filter((item) => item.boardId === board.id && item.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .flatMap((item) => {
          const kpi = kpis.find((entry) => entry.id === item.kpiId);
          return kpi
            ? [{ ...kpi, target: item.target ?? kpi.target, performanceThreshold: item.performanceThreshold ?? kpi.performanceThreshold }]
            : [];
        }),
    [board.id, execution.assignments, kpis],
  );

  const grouped = useMemo(() => {
    const categories = new Map<string, AssignedMetric[]>();
    assigned.forEach((kpi) => {
      const group = categories.get(kpi.bucket) ?? [];
      group.push(kpi);
      categories.set(kpi.bucket, group);
    });
    const order = ["safety", "quality", "delivery", "cost", "people", "environment", "morale", "5s"];
    return Array.from(categories, ([bucket, allMetrics]) => {
      return { bucket, label: KPI_BUCKET_LABELS[bucket as keyof typeof KPI_BUCKET_LABELS], metrics: allMetrics.slice(0, 1), allMetrics };
    }).sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));
  }, [assigned]);

  const draftFor = (kpi: VisualManagementKpiDefinition): Draft =>
    drafts[kpi.id] ?? { value: "", note: "", neutral: false, responsibleId: "" };
  const periodFor = (kpi: VisualManagementKpiDefinition) =>
    createReportingPeriod(kpi.reviewFrequency ?? "daily", todayKey(kpi.reviewFrequency ?? "daily"))!;
  const currentEntry = (kpi: VisualManagementKpiDefinition) =>
    execution.actualEntries.find(
      (entry) => entry.boardId === board.id && entry.kpiId === kpi.id && entry.reportingPeriod.key === periodFor(kpi).key,
    );
  const resultFor = (kpi: VisualManagementKpiDefinition, draft: Draft): KpiPerformanceStatus =>
    draft.neutral
      ? "unavailable"
      : draft.value.trim()
        ? evaluateKpiPerformance(
            Number(draft.value),
            kpi.measurementType,
            kpi.direction,
            kpi.target,
            kpi.performanceThreshold,
          )
        : "unavailable";

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((all) => ({
      ...all,
      [id]: {
        ...(all[id] ?? { value: "", note: "", neutral: false, responsibleId: "" }),
        ...patch,
        error: undefined,
      },
    }));
    setSummary("");
  }

  function validate(kpi: VisualManagementKpiDefinition) {
    const draft = draftFor(kpi);
    const existing = currentEntry(kpi);
    const existingDeviation = existing && execution.deviations.find((item) => item.kpiActualEntryId === existing.id);
    if (existing && (!existingDeviation || existingDeviation.actionId)) return "";
    if (!draft.neutral && (!draft.value.trim() || !Number.isFinite(Number(draft.value)))) {
      return "Enter an actual or mark No Production / Holiday.";
    }
    const status = existing?.statusSnapshot ?? resultFor(kpi, draft);
    if (!draft.neutral && status === "unavailable") return "Enter a valid actual value.";
    if ((status === "amber" || status === "red") && !draft.note.trim() && !existingDeviation?.comment) {
      return "Add what happened.";
    }
    if ((status === "amber" || status === "red") && !draft.responsibleId) return "Select an Action owner.";
    return "";
  }

  function persistMetric(kpi: VisualManagementKpiDefinition) {
    const existing = currentEntry(kpi);
    if (existing) {
      return {
        success: true as const,
        entry: existing,
        deviation: execution.deviations.find((item) => item.kpiActualEntryId === existing.id),
      };
    }
    const draft = draftFor(kpi);
    const status = resultFor(kpi, draft);
    const result = submitKpiActual({
      boardId: board.id,
      kpiId: kpi.id,
      value: Number(draft.value || 0),
      reportingPeriod: periodFor(kpi),
      reportedByUserId: current.id,
      comment: draft.note,
      deviationComment: draft.note,
      correctiveActionRequired: status === "amber" || status === "red" ? true : undefined,
      neutralReason: draft.neutral ? "no_production_holiday" : undefined,
    });
    if (result.success && result.deviation) update(kpi.id, { deviation: result.deviation });
    return result;
  }

  function complete() {
    const errors = assigned.map((kpi) => [kpi, validate(kpi)] as const);
    const invalid = errors.find(([, error]) => error);
    if (invalid) {
      setDrafts((all) =>
        Object.fromEntries(
          assigned.map((kpi) => [
            kpi.id,
            {
              ...draftFor(kpi),
              ...all[kpi.id],
              error: errors.find(([entry]) => entry.id === kpi.id)?.[1] || undefined,
            },
          ]),
        ),
      );
      setSummary(
        `Complete the following: ${errors
          .filter(([, error]) => error)
          .map(([kpi, error]) => `${kpi.name} — ${error}`)
          .join(" • ")}`,
      );
      refs.current[invalid[0].id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      refs.current[invalid[0].id]?.focus({ preventScroll: true });
      return;
    }

    for (const kpi of assigned) {
      const result = persistMetric(kpi);
      if (!result.success) {
        update(kpi.id, { error: result.error });
        setSummary("Some metric results could not be saved.");
        return;
      }
      if (result.deviation && !result.deviation.actionId) {
        const draft = draftFor(kpi);
        let createdActionId = "";
        try {
          const context = buildActionContext(board, kpi, draft, result.entry, result.deviation, users);
          const action = createCanonicalLinkedAction(
            context,
            draft.responsibleId,
            current,
            KPI_BUCKET_LABELS[kpi.bucket],
            result.deviation.status === "red" ? "High" : "Medium",
          );
          createdActionId = action.id;
          if (!linkDeviationAction(result.deviation.id, action.id)) {
            throw new Error("The Action could not be linked to this metric.");
          }
        } catch (caught) {
          if (createdActionId) rollbackCreatedAction(createdActionId);
          update(kpi.id, {
            error: caught instanceof Error ? caught.message : "Action creation failed.",
          });
          setSummary("Required Actions could not be created. The meeting remains open.");
          return;
        }
      }
    }
    if (completeVisualManagementMeeting(meeting.id)) {
      router.push(`/visual-management/meetings/${meeting.id}`);
    }
  }

  const completeCount = assigned.filter((kpi) => !validate(kpi)).length;
  const incompleteCount = assigned.length - completeCount;
  const progressText = completeCount === assigned.length
    ? `${assigned.length} metrics · Ready to complete`
    : `${assigned.length} metrics · ${completeCount} complete · ${incompleteCount} require${incompleteCount === 1 ? "s" : ""} attention`;
  const periodLabel = periodFor(assigned[0] ?? ({ reviewFrequency: "daily" } as VisualManagementKpiDefinition)).label;
  const present = meeting.participants.filter((participant) => participant.attendance === "Present").length;
  const redCount = assigned.filter((kpi) => (currentEntry(kpi)?.statusSnapshot ?? resultFor(kpi, draftFor(kpi))) === "red").length;
  const amberCount = assigned.filter((kpi) => (currentEntry(kpi)?.statusSnapshot ?? resultFor(kpi, draftFor(kpi))) === "amber").length;
  const relevantActions = actions.filter((action) => action.visualManagementSource?.boardId === board.id || action.area === board.zone).slice(0, 6);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/visual-management/boards/${board.id}`} />}
            aria-label="Exit meeting"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{board.name}</h1>
            <p className="text-xs text-muted-foreground">{meeting.occurrenceDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${meeting.occurrenceDate}T12:00:00`)) : periodLabel}{meeting.scheduledTime ? ` · ${meeting.scheduledTime}` : ""} · {board.meetingFrequency.split(" · ")[0]} Meeting · Lead: {meeting.lead.name} · {present} Participants</p>
          </div>
          <Badge variant={redCount ? "danger" : amberCount ? "warning" : "success"}>{redCount ? `${redCount} red KPI` : amberCount ? `${amberCount} amber KPI` : "KPIs on track"}</Badge>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/visual-management/boards/${board.id}`} />}><DoorOpen className="size-4" />Exit Meeting Mode</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1680px] gap-4 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <Card className="gap-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Users className="size-4" />Attendance</CardTitle>
              <Badge variant="secondary">{present}/{meeting.participants.length} present</Badge>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map((person) => (
                  <Button key={person.id} type="button" aria-pressed={person.attendance === "Present"} variant="outline" size="sm" onClick={() => setMeetingAttendance(meeting.id, person.id, person.attendance === "Present" ? "Absent" : "Present")} className={person.attendance === "Present" ? "border-emerald-500/30 bg-emerald-500/[0.06]" : ""}>
                    {person.attendance === "Present" ? <Check className="size-3.5 text-emerald-600" /> : <span aria-hidden="true" className="size-3.5 rounded-full border" />}{person.name}{person.companyOrRole ? ` · ${person.companyOrRole}` : ""}{person.guest ? " · Guest" : ""}
                  </Button>
                ))}
              </div>
              <MeetingAttendanceControls attendees={meeting.participants} onAddUser={(person) => addMeetingAttendee(meeting.id, person)} onAddGuest={(name, companyOrRole) => addMeetingGuest(meeting.id, name, companyOrRole)} onRemove={(id) => removeMeetingAttendee(meeting.id, id)} />
            </CardContent>
          </Card>
          <Card className="gap-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between border-b py-3">
              <CardTitle className="text-sm">KPI Review</CardTitle>
              <Badge variant="secondary">{completeCount} / {assigned.length} reviewed · {amberCount} amber · {redCount} red</Badge>
            </CardHeader>
             <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
         {grouped.map(({ bucket, label, metrics, allMetrics }) => {
           const completed = allMetrics.filter((kpi) => !validate(kpi)).length;
          return (
             <section key={bucket} aria-label={`${label} metrics`} className="contents">
               <div className="sr-only">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]">{label}</h2>
                <p className="text-sm text-muted-foreground">
                   {completed} / {allMetrics.length} completed
                </p>
              </div>

                <div className="contents">
                {metrics.map((kpi) => {
                  const draft = draftFor(kpi);
                  const existing = currentEntry(kpi);
                  const neutral = existing?.neutralReason === "no_production_holiday" || draft.neutral;
                  const status = existing?.statusSnapshot ?? resultFor(kpi, draft);
                  const deviation = existing
                    ? execution.deviations.find((item) => item.kpiActualEntryId === existing.id)
                    : draft.deviation;
                  const action = actions.find((item) => item.id === deviation?.actionId);
                  const needsException = !neutral && (status === "amber" || status === "red");

                  return (
                    <Card
                      key={kpi.id}
                      ref={(node) => {
                        refs.current[kpi.id] = node;
                      }}
                      tabIndex={-1}
                        className={`gap-0 self-start shadow-none outline-none ${draft.error ? "border-destructive bg-destructive/[0.04]" : status === "red" ? "border-red-500/40" : status === "amber" ? "border-amber-500/40" : ""}`}
                     >
                       <CardContent className="grid gap-3 p-4">
                         <div className="min-w-0 border-b pb-4">
                           <p className="text-lg font-semibold">{label}</p>
                           <Badge variant={statusVariant(status)} className="mt-2 w-fit">{statusLabel(status, neutral)}</Badge>
                            <p className="mt-3 text-sm text-muted-foreground">{kpi.name}</p>
                         </div>
                         <ReadOnlyField label="Status" value={statusLabel(status, neutral)} />
                         <ReadOnlyField label="Target" value={formatKpiTarget(kpi)} />
                          <div className="grid gap-2">
                            <label className="grid gap-1 text-sm font-medium">
                             <span>Actual</span>
                             <Input
                              type="number"
                              step="any"
                              aria-label={valueLabel(kpi)}
                               className="h-11 w-full"
                              disabled={neutral || Boolean(existing)}
                              value={existing && !existing.neutralReason ? String(existing.value) : draft.value}
                              onChange={(event) => update(kpi.id, { value: event.target.value })}
                            />
                          </label>
                            <label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                              <Checkbox
                                checked={neutral}
                                disabled={Boolean(existing)}
                                onCheckedChange={(checked) => update(kpi.id, { neutral: checked === true, value: "", note: "", responsibleId: "" })}
                              />
                              No Production / Holiday
                            </label>
                          </div>
                         {needsException ? <label className="grid gap-1.5 text-sm font-medium">
                           What happened? *
                           <Textarea className="min-h-28 resize-none" placeholder="Briefly explain why this KPI is outside target." disabled={Boolean(existing)} value={existing ? deviation?.comment ?? existing.comment ?? "" : draft.note} onChange={(event) => update(kpi.id, { note: event.target.value })} />
                         </label> : null}
                         {needsException && !action ? (
                                <div className="border-t pt-3">
                                  <p className="text-sm font-medium">Action owner *</p>
                                   <Select
                                     value={draft.responsibleId}
                                     onValueChange={(value) => update(kpi.id, { responsibleId: value ?? "" })}
                                   >
                                     <SelectTrigger className="mt-2 w-full">
                                       <SelectValue placeholder="Select action owner">
                                         {draft.responsibleId ? board.members.find((member) => member.id === draft.responsibleId)?.name ?? "Select action owner" : undefined}
                                       </SelectValue>
                                     </SelectTrigger>
                                     <SelectContent>
                                       {board.members.filter((member) => member.id === current.id).map((member) => (
                                         <SelectItem key={member.id} value={member.id}>{member.name} — Assign to me</SelectItem>
                                       ))}
                                       {board.members.filter((member) => member.id !== current.id).map((member) => (
                                         <SelectItem key={member.id} value={member.id}>
                                           {member.name}
                                         </SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                               </div>
                             ) : needsException && action ? (
                               <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/45 p-3 text-sm">
                                <ListTodo className="size-4" />
                                <strong>Corrective Action</strong>
                                <span className="text-muted-foreground">
                                  {action.responsiblePersonName ?? action.assignedTo} · Due {action.dueDate}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  nativeButton={false}
                                  render={<Link href={`/actions/${action.id}`} target="_blank" />}
                                >
                                  View Action
                                </Button>
                              </div>
                         ) : null}

                      {draft.error ? (
                        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                          {draft.error}
                        </p>
                      ) : null}
                       </CardContent>
                     </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!assigned.length ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-semibold">No metrics configured</p>
            <p className="mt-1 text-sm text-muted-foreground">Add metrics in Board Settings before running this meeting.</p>
          </div>
        ) : null}
            </CardContent>
          </Card>
          <Card className="gap-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm"><ListTodo className="size-4" />Previous Actions</CardTitle>
              <Badge variant="secondary">{relevantActions.filter((action) => action.status !== "Completed").length} open</Badge>
            </CardHeader>
            <CardContent className="grid gap-2 p-3">
              {relevantActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{action.title}</p><p className="text-xs text-muted-foreground">{action.responsiblePersonName ?? action.assignedTo} · Due {action.dueDate}</p></div>
                  <Badge variant={action.status === "Completed" ? "success" : action.status === "Overdue" ? "danger" : "warning"}>{action.status}</Badge>
                  <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/actions/${action.id}`} target="_blank" />}>View</Button>
                </div>
              ))}
              {!relevantActions.length ? <p className="py-3 text-center text-sm text-muted-foreground">No previous Actions for this board.</p> : null}
            </CardContent>
          </Card>
        </div>
        <aside className="grid content-start xl:sticky xl:top-20 xl:h-fit">
          <Card className="gap-0 shadow-sm">
            <CardHeader className="border-b py-3"><CardTitle className="text-sm">Meeting Summary</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4">
              <Summary label="Duration" value={`${meetingDurationMinutes(meeting)} min`} />
              <Summary label="Participants" value={`${present} present`} />
              <Summary label="KPI status" value={`${redCount} red · ${amberCount} amber`} />
              <Summary label="Topics" value={String(meeting.topicIds.length)} />
              <Summary label="Actions" value={String(relevantActions.length)} />
              <Summary label="Red Flags / CI" value={`${meeting.redFlagIds.length} / ${meeting.continuousImprovementIds.length}`} />
              {summary ? <p role="alert" className="text-sm font-medium text-destructive">{summary}</p> : <p className="text-sm text-muted-foreground">{progressText}</p>}
              <Button className="mt-2 min-h-11" onClick={complete} disabled={!assigned.length}><Check className="size-4" />Complete Meeting</Button>
            </CardContent>
          </Card>
        </aside>
      </main>

      <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={summary ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"} role={summary ? "alert" : undefined}>
            {summary || progressText}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/visual-management/boards/${board.id}`)}>
              Back to Board
            </Button>
            <Button onClick={complete} disabled={!assigned.length}>
              Complete Meeting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1.5 text-sm font-medium"><span>{label}</span><div className="flex h-11 items-center rounded-md border bg-muted/20 px-3 text-sm font-normal">{value}</div></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function buildActionContext(
  board: ReturnType<typeof useVisualManagementStore>["boards"][number],
  kpi: VisualManagementKpiDefinition,
  draft: Draft,
  entry: NonNullable<ReturnType<typeof getLatestActual>>,
  deviation: KpiDeviation,
  users: ReturnType<typeof useAdminUsers>,
): LinkedActionContext {
  const actual = formatKpiNumericValue(entry.value, entry.measurementSnapshot);
  const target = formatKpiTarget(kpi);
  const period = entry.reportingPeriod.label;
  const note = draft.note || deviation.comment;
  return {
    source: "Visual Management",
    sourceModule: "visualManagement",
    sourceId: board.id,
    sourceTitle: `${kpi.name} · ${board.name} · ${period}`,
    sourceRecordLabel: `${kpi.name} · ${board.name} · ${period}`,
    sourceObservationId: deviation.id,
    sourceObservation: `${actual} actual · Target ${target} · ${entry.statusSnapshot.toUpperCase()} · ${note}`,
    title: `${kpi.name} corrective action`,
    description: `Visual Management
${board.name}
${kpi.name}
${period}
Actual ${actual} · Target ${target} · ${entry.statusSnapshot.toUpperCase()}
${note}`,
    plant: board.plant,
    zone: board.zone ?? "Zone A",
    location: board.name,
    evidence: [],
    defaultPriority: entry.statusSnapshot === "red" ? "High" : "Medium",
    defaultResponsibleId: kpi.ownerUserId && users.some((item) => item.id === kpi.ownerUserId) ? kpi.ownerUserId : undefined,
    visualManagementSource: {
      boardId: board.id,
      configuredKpiId: kpi.id,
      actualEntryId: entry.id,
      deviationId: deviation.id,
      reportingPeriod: { ...entry.reportingPeriod },
      boardNameSnapshot: board.name,
      kpiNameSnapshot: kpi.name,
      actualValueSnapshot: entry.value,
      targetSnapshot: entry.targetSnapshot,
      measurementSnapshot: entry.measurementSnapshot,
      statusSnapshot: deviation.status,
      deviationSnapshot: deviation.comment,
    },
  };
}
