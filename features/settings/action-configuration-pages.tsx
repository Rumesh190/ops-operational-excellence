"use client";

import { useMemo, useState } from "react";
import { BellRing, Clock3, ShieldAlert, type LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { OpsFeedback } from "@/components/ops/ops-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldMessage } from "@/components/ui/field-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { saveActionEscalationConfiguration, saveActionPriorities, saveActionReminderConfiguration, useActionConfiguration, validateActionPriorities, validateEscalationRules, validateReminderConfiguration, type ActionEscalationRecipientRole, type ActionEscalationRule, type ActionPrioritySetting, type ActionReminderConfiguration } from "@/lib/actions/action-configuration-store";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function changed<T>(draft: T, saved: T) { return JSON.stringify(draft) !== JSON.stringify(saved); }

function AccessPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const access = useSettingsAccess();
  return <PageContainer><FiveSPageHeader eyebrow="Actions" title={title} description={description} />{access.canManageConfiguration ? children : <SettingsAccessDenied area="Action Configuration" />}</PageContainer>;
}

function SaveBar({ dirty, onCancel, onSave }: { dirty: boolean; onCancel: () => void; onSave: () => void }) {
  if (!dirty) return null;
  return <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className="flex-1 text-sm font-medium">Unsaved changes</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={onSave}>Save Changes</Button></div></div>;
}

export function PriorityDueDatesPage() {
  const allSaved = useActionConfiguration().priorities;
  const saved = allSaved.filter((item) => item.id !== "Critical");
  const [draft, setDraft] = useState<ActionPrioritySetting[] | null>(null);
  const values = draft ?? saved;
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string }>();
  const errors = useMemo(() => validateActionPriorities(values), [values]);
  function update(id: ActionPrioritySetting["id"], patch: Partial<ActionPrioritySetting>) { setDraft((items) => (items ?? clone(saved)).map((item) => item.id === id ? { ...item, ...patch } : item)); setFeedback(undefined); }
  function save() { const result = saveActionPriorities([...allSaved.filter((item) => item.id === "Critical"), ...values]); if (result.success) setDraft(null); setFeedback(result.success ? { tone: "success", message: "Priority settings updated." } : { tone: "error", message: result.errors.save ?? "Resolve the highlighted fields before saving." }); }
  return <AccessPage title="Priority & Due Dates" description="Configure default Action due dates by priority."><>
    {feedback && <OpsFeedback {...feedback} />}
    <div className="grid gap-3">{[...values].sort((a, b) => a.order - b.order).map((item) => <Card key={item.id} className="gap-0"><CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(140px,.7fr)_140px_minmax(220px,1.4fr)_auto] sm:items-start"><div><Label htmlFor={`${item.id}-label`}>Priority</Label><Input id={`${item.id}-label`} className="mt-2" value={item.label} onChange={(event) => update(item.id, { label: event.target.value })} /><FieldMessage error>{errors[`${item.id}.label`]}</FieldMessage></div><div><Label htmlFor={`${item.id}-offset`}>Default Due Date</Label><div className="relative mt-2"><Input id={`${item.id}-offset`} type="number" min={0} value={item.dueOffsetDays} onChange={(event) => update(item.id, { dueOffsetDays: Number(event.target.value) })} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span></div><FieldMessage error>{errors[`${item.id}.dueOffsetDays`]}</FieldMessage></div><div><Label htmlFor={`${item.id}-description`}>Description</Label><Textarea id={`${item.id}-description`} className="mt-2 min-h-10" value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} /></div><div className="flex items-center justify-between gap-3 sm:pt-8"><span className="text-sm">{item.active ? "Active" : "Inactive"}</span><Switch checked={item.active} onCheckedChange={(active) => update(item.id, { active })} aria-label={`${item.label} status`} /></div></CardContent></Card>)}</div>
    <FieldMessage error>{errors.active}</FieldMessage><p className="text-xs leading-5 text-muted-foreground">Changes apply to newly created Actions only. Existing due dates and historical priority values are not recalculated.</p>
    <SaveBar dirty={Boolean(draft && changed(draft, saved))} onCancel={() => { setDraft(null); setFeedback(undefined); }} onSave={save} />
  </></AccessPage>;
}

export function ReminderRulesPage() {
  const saved = useActionConfiguration().reminders;
  const [draft, setDraft] = useState<ActionReminderConfiguration | null>(null);
  const values = draft ?? saved;
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string }>();
  const errors = validateReminderConfiguration(values);
  function update(change: (current: ActionReminderConfiguration) => ActionReminderConfiguration) { setDraft((current) => change(current ?? clone(saved))); setFeedback(undefined); }
  function save() { const result = saveActionReminderConfiguration(values); if (result.success) setDraft(null); setFeedback(result.success ? { tone: "success", message: "Reminder rules saved." } : { tone: "error", message: result.errors.save ?? "Resolve the highlighted fields before saving." }); }
  return <AccessPage title="Reminder Rules" description="Configure when Action owners receive due-date reminders."><>
    {feedback && <OpsFeedback {...feedback} />}
    <div className="grid gap-3"><RuleCard icon={Clock3} title="Due Soon Reminder" enabled={values.dueSoon.enabled} onEnabled={(enabled) => update((current) => ({ ...current, dueSoon: { ...current.dueSoon, enabled } }))}><NumberField label="Days Before Due" value={values.dueSoon.daysBeforeDue} min={0} onChange={(daysBeforeDue) => update((current) => ({ ...current, dueSoon: { ...current.dueSoon, daysBeforeDue } }))} error={errors.dueSoon} /></RuleCard><RuleCard icon={BellRing} title="Due Today Reminder" enabled={values.dueToday.enabled} onEnabled={(enabled) => update((current) => ({ ...current, dueToday: { enabled } }))}><p className="text-xs text-muted-foreground">Sent on the Action due date.</p></RuleCard><RuleCard icon={ShieldAlert} title="Overdue Reminder" enabled={values.overdue.enabled} onEnabled={(enabled) => update((current) => ({ ...current, overdue: { ...current.overdue, enabled } }))}><NumberField label="Days After Due" value={values.overdue.daysAfterDue} min={0} onChange={(daysAfterDue) => update((current) => ({ ...current, overdue: { ...current.overdue, daysAfterDue } }))} error={errors.overdue} /></RuleCard><RuleCard icon={BellRing} title="Repeat Overdue Reminder" enabled={values.repeatOverdue.enabled} onEnabled={(enabled) => update((current) => ({ ...current, repeatOverdue: { ...current.repeatOverdue, enabled } }))}><NumberField label="Repeat Every" value={values.repeatOverdue.repeatEveryDays} min={1} onChange={(repeatEveryDays) => update((current) => ({ ...current, repeatOverdue: { ...current.repeatOverdue, repeatEveryDays } }))} error={errors.repeatOverdue} /></RuleCard></div>
    <Card className="gap-0"><CardContent className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium">Also notify Zone Leader</p><p className="mt-1 text-xs text-muted-foreground">The Action Owner remains the primary recipient.</p></div><Switch checked={values.includeZoneLeader} onCheckedChange={(includeZoneLeader) => update((current) => ({ ...current, includeZoneLeader }))} aria-label="Also notify Zone Leader" /></CardContent></Card>
    <SaveBar dirty={Boolean(draft && changed(draft, saved))} onCancel={() => { setDraft(null); setFeedback(undefined); }} onSave={save} />
  </></AccessPage>;
}

export function EscalationRulesPage() {
  const saved = useActionConfiguration().escalations;
  const [draft, setDraft] = useState<ActionEscalationRule[] | null>(null);
  const values = draft ?? saved;
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string }>();
  const errors = validateEscalationRules(values);
  function update(level: ActionEscalationRule["level"], patch: Partial<ActionEscalationRule>) { setDraft((items) => (items ?? clone(saved)).map((item) => item.level === level ? { ...item, ...patch } : item)); setFeedback(undefined); }
  function save() { const result = saveActionEscalationConfiguration(values); if (result.success) setDraft(null); setFeedback(result.success ? { tone: "success", message: "Escalation rules updated." } : { tone: "error", message: result.errors.save ?? "Resolve the highlighted fields before saving." }); }
  return <AccessPage title="Escalation Rules" description="Configure when overdue Actions escalate and who receives the escalation."><>
    {feedback && <OpsFeedback {...feedback} />}
    <div className="grid gap-3 lg:grid-cols-2">{[...values].sort((a, b) => a.level - b.level).map((rule) => <Card key={rule.level} className="gap-0"><CardHeader className="flex-row items-center border-b pb-4"><div className="min-w-0 flex-1"><CardTitle className="text-base">Level {rule.level}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{rule.enabled ? "Active escalation stage" : "Disabled escalation stage"}</p></div><Switch checked={rule.enabled} onCheckedChange={(enabled) => update(rule.level, { enabled })} aria-label={`Level ${rule.level} status`} /></CardHeader><CardContent className="grid gap-4 p-4 sm:grid-cols-2"><div><Label>Days Overdue</Label><Input className="mt-2" type="number" min={0} value={rule.daysOverdue} onChange={(event) => update(rule.level, { daysOverdue: Number(event.target.value) })} /><FieldMessage error>{errors[`level${rule.level}.daysOverdue`]}</FieldMessage></div><div><Label>Escalate To</Label><Select value={rule.recipientRole} onValueChange={(value) => value && update(rule.level, { recipientRole: value as ActionEscalationRecipientRole })}><SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zoneLeader">Zone Leader</SelectItem><SelectItem value="adminReviewer">Admin / Reviewer</SelectItem></SelectContent></Select><FieldMessage error>{errors[`level${rule.level}.recipientRole`]}</FieldMessage></div></CardContent></Card>)}</div>
    <FieldMessage error>{errors.levels}</FieldMessage><p className="text-xs leading-5 text-muted-foreground">Saved timing is used by future reminder-engine evaluations. Existing Action records and past escalations are not rewritten.</p>
    <SaveBar dirty={Boolean(draft && changed(draft, saved))} onCancel={() => { setDraft(null); setFeedback(undefined); }} onSave={save} />
  </></AccessPage>;
}

function RuleCard({ icon: Icon, title, enabled, onEnabled, children }: { icon: LucideIcon; title: string; enabled: boolean; onEnabled: (value: boolean) => void; children: React.ReactNode }) { return <Card className="gap-0"><CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(220px,1fr)_minmax(180px,.7fr)] sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary"><Icon className="size-4" /></span><div><p className="text-sm font-medium">{title}</p><div className="mt-1 flex items-center gap-2"><Badge variant={enabled ? "success" : "muted"}>{enabled ? "Enabled" : "Disabled"}</Badge><Switch checked={enabled} onCheckedChange={onEnabled} aria-label={`${title} status`} /></div></div></div><div className={enabled ? "" : "pointer-events-none opacity-50"}>{children}</div></CardContent></Card>; }
function NumberField({ label, value, min, onChange, error }: { label: string; value: number; min: number; onChange: (value: number) => void; error?: string }) { return <div><Label>{label}</Label><div className="relative mt-2"><Input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span></div><FieldMessage error>{error}</FieldMessage></div>; }
