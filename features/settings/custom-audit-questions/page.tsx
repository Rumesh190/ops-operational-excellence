"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Edit3, Plus, Search } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsFeedback } from "@/components/ops/ops-feedback";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import type { AuditQuestionResponseType, FiveSAuditStage } from "@/features/five-s/types/five-s";
import { useCurrentUser } from "@/lib/current-user";
import { AuditConfigurationAccessDenied, useCanManageAuditConfiguration } from "../settings-access";
import { createCustomAuditQuestion, DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID, moveCustomAuditQuestion, nextQuestionOrder, setCustomAuditQuestionActive, updateCustomAuditQuestion, useCustomAuditQuestions } from "./store";
import type { CustomAuditQuestion, CustomAuditQuestionInput } from "./types";

const STAGES: FiveSAuditStage[] = ["Sort", "Set in Order", "Shine", "Standardize", "Sustain", "General"];
const RESPONSES: AuditQuestionResponseType[] = ["Compliance", "Yes / No", "Text"];

function emptyInput(): CustomAuditQuestionInput {
  return { question: "", stage: "Sort", responseType: "Compliance", mandatory: false, requireEvidenceOnNonCompliance: false, instruction: "", referenceImage: "", active: true, order: 1 };
}

export default function CustomAuditQuestionsPage() {
  const questions = useCustomAuditQuestions().filter((question) => (question.organizationId ?? DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID) === DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID);
  const allowed = useCanManageAuditConfiguration();
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [status, setStatus] = useState("All");
  const [response, setResponse] = useState("All");
  const [editing, setEditing] = useState<CustomAuditQuestion | "new" | null>(null);
  const [form, setForm] = useState<CustomAuditQuestionInput>(emptyInput);
  const [confirmToggle, setConfirmToggle] = useState<CustomAuditQuestion | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const filtered = useMemo(() => questions.filter((question) => {
    const matchesSearch = question.question.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (stage === "All" || question.stage === stage) && (status === "All" || (status === "Active") === question.active) && (response === "All" || question.responseType === response);
  }).sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.order - b.order), [questions, response, search, stage, status]);

  if (!allowed) return <PageContainer><FiveSPageHeader eyebrow="" title="Custom Questions" description="Add organization-specific questions to the standard 5S checklist." /><AuditConfigurationAccessDenied /></PageContainer>;

  function openNew() {
    const next = emptyInput();
    next.order = nextQuestionOrder(next.stage);
    setForm(next);
    setEditing("new");
  }

  function openEdit(question: CustomAuditQuestion) {
    setForm({ organizationId: question.organizationId, question: question.question, stage: question.stage, responseType: question.responseType, mandatory: question.mandatory, requireEvidenceOnNonCompliance: question.requireEvidenceOnNonCompliance, instruction: question.instruction, referenceImage: question.referenceImage, active: question.active, order: question.order });
    setEditing(question);
  }

  function save() {
    if (!form.question.trim()) { setFeedback({ tone: "error", message: "Question is required." }); return; }
    try {
      const saved = editing === "new" ? createCustomAuditQuestion(form, currentUser.name) : editing ? updateCustomAuditQuestion(editing.id, form) : null;
      if (!saved) throw new Error("storage");
      setFeedback({ tone: "success", message: editing === "new" ? "Custom question created." : "Custom question updated." });
      setEditing(null);
    } catch {
      setFeedback({ tone: "error", message: "Could not save question. Try again." });
    }
  }

  function toggle(question: CustomAuditQuestion) {
    try {
      if (!setCustomAuditQuestionActive(question.id, !question.active)) throw new Error("storage");
      setFeedback({ tone: "success", message: question.active ? "Question deactivated." : "Question reactivated." });
    } catch { setFeedback({ tone: "error", message: "Could not update question. Try again." }); }
    setConfirmToggle(null);
  }

  function reorder(question: CustomAuditQuestion, direction: -1 | 1) {
    if (!moveCustomAuditQuestion(question.id, direction)) setFeedback({ tone: "error", message: "Could not update question order. Try again." });
  }

  const activeCount = questions.filter((question) => question.active).length;
  return <PageContainer>
    <FiveSPageHeader eyebrow="" title="Custom Questions" description="Add organization-specific questions to the standard 5S checklist." actions={<Button onClick={openNew}><Plus className="size-4" /> Add Question</Button>} />
    {feedback && <OpsFeedback tone={feedback.tone} message={feedback.message} />}

    <div className="grid gap-3 sm:grid-cols-3">
      <Summary title="Standard Questions" value="39" badge="Locked" />
      <Summary title="Custom Questions" value={String(activeCount)} badge="Active" />
      <Summary title="Inactive" value={String(questions.length - activeCount)} />
    </div>

    <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4 text-sm"><strong>The standard 39-question 5S checklist is locked.</strong><span className="ml-1 text-muted-foreground">Custom questions are added on top of the standard checklist and affect new audits only.</span></div>

    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_150px_160px_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="pl-9" /></div>
        <Filter value={stage} onChange={setStage} options={["All", ...STAGES]} label="All stages" />
        <Filter value={status} onChange={setStatus} options={["All", "Active", "Inactive"]} label="All statuses" />
        <Filter value={response} onChange={setResponse} options={["All", ...RESPONSES]} label="All responses" />
        <Button variant="ghost" onClick={() => { setSearch(""); setStage("All"); setStatus("All"); setResponse("All"); }}>Clear</Button>
      </div>

      {filtered.length ? <>
        <div className="hidden lg:block"><Table><TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Stage</TableHead><TableHead>Response Type</TableHead><TableHead>Mandatory</TableHead><TableHead>Evidence Rule</TableHead><TableHead>Status</TableHead><TableHead>Order</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((question) => <QuestionRow key={question.id} question={question} onEdit={() => openEdit(question)} onToggle={() => question.active ? setConfirmToggle(question) : toggle(question)} onMove={reorder} />)}</TableBody></Table></div>
        <div className="grid gap-3 lg:hidden">{filtered.map((question) => <QuestionCard key={question.id} question={question} onEdit={() => openEdit(question)} onToggle={() => question.active ? setConfirmToggle(question) : toggle(question)} onMove={reorder} />)}</div>
      </> : <div className="grid min-h-52 place-items-center text-center"><div><p className="font-semibold">No custom questions yet.</p><p className="mt-1 text-sm text-muted-foreground">Add organization-specific questions without changing the standard 39-question 5S checklist.</p><Button className="mt-4" onClick={openNew}><Plus className="size-4" /> Add Question</Button></div></div>}
    </CardContent></Card>

    <QuestionDialog open={Boolean(editing)} editing={editing} form={form} onChange={setForm} onClose={() => setEditing(null)} onSave={save} />
    <AlertDialog open={Boolean(confirmToggle)} onOpenChange={(open) => { if (!open) setConfirmToggle(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate custom question?</AlertDialogTitle><AlertDialogDescription>It will be excluded from new audits. Existing audit snapshots and reports will remain unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => confirmToggle && toggle(confirmToggle)}>Deactivate</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </PageContainer>;
}

function Summary({ title, value, badge }: { title: string; value: string; badge?: string }) { return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>{badge && <Badge variant="outline">{badge}</Badge>}</CardContent></Card>; }

function Filter({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: readonly string[]; label: string }) { return <Select value={value} onValueChange={(next) => next && onChange(next)}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option === "All" ? label : option}</SelectItem>)}</SelectContent></Select>; }

function QuestionRow({ question, onEdit, onToggle, onMove }: { question: CustomAuditQuestion; onEdit: () => void; onToggle: () => void; onMove: (question: CustomAuditQuestion, direction: -1 | 1) => void }) { return <TableRow className={!question.active ? "opacity-55" : undefined}><TableCell className="max-w-sm font-medium">{question.question}</TableCell><TableCell>{question.stage}</TableCell><TableCell>{question.responseType}</TableCell><TableCell>{question.mandatory ? "Yes" : "No"}</TableCell><TableCell className="max-w-40 text-xs">{question.requireEvidenceOnNonCompliance ? "Required on Non-Compliance" : "Not required"}</TableCell><TableCell><Badge variant="outline">{question.active ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{question.order}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" aria-label="Move up" onClick={() => onMove(question, -1)}><ArrowUp className="size-4" /></Button><Button size="icon-sm" variant="ghost" aria-label="Move down" onClick={() => onMove(question, 1)}><ArrowDown className="size-4" /></Button><Button size="icon-sm" variant="ghost" aria-label="Edit question" onClick={onEdit}><Edit3 className="size-4" /></Button><Button size="sm" variant="ghost" onClick={onToggle}>{question.active ? "Deactivate" : "Reactivate"}</Button></div></TableCell></TableRow>; }

function QuestionCard(props: Parameters<typeof QuestionRow>[0]) { const { question, onEdit, onToggle, onMove } = props; return <article className={`rounded-lg border p-4 ${question.active ? "" : "opacity-55"}`}><div className="flex items-start justify-between gap-3"><p className="font-medium leading-5">{question.question}</p><Badge variant="outline">{question.active ? "Active" : "Inactive"}</Badge></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Stage</dt><dd className="font-medium">{question.stage}</dd></div><div><dt className="text-muted-foreground">Response</dt><dd className="font-medium">{question.responseType}</dd></div><div><dt className="text-muted-foreground">Mandatory</dt><dd className="font-medium">{question.mandatory ? "Yes" : "No"}</dd></div><div><dt className="text-muted-foreground">Order</dt><dd className="font-medium">{question.order}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">{question.requireEvidenceOnNonCompliance ? "Evidence required on Non-Compliance" : "No custom evidence rule"}</p><div className="mt-3 flex flex-wrap justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => onMove(question, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button><Button size="icon-sm" variant="ghost" onClick={() => onMove(question, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button><Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button><Button size="sm" variant="ghost" onClick={onToggle}>{question.active ? "Deactivate" : "Reactivate"}</Button></div></article>; }

function QuestionDialog({ open, editing, form, onChange, onClose, onSave }: { open: boolean; editing: CustomAuditQuestion | "new" | null; form: CustomAuditQuestionInput; onChange: (form: CustomAuditQuestionInput) => void; onClose: () => void; onSave: () => void }) {
  const update = <K extends keyof CustomAuditQuestionInput>(key: K, value: CustomAuditQuestionInput[K]) => onChange({ ...form, [key]: value });
  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editing === "new" ? "Add Custom Question" : "Edit Custom Question"}</DialogTitle><DialogDescription>Changes apply to newly generated audit checklists only.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="custom-question">Question</Label><Textarea id="custom-question" value={form.question} onChange={(event) => update("question", event.target.value)} className="mt-2 min-h-24" maxLength={500} /></div><div><Label>5S Stage</Label><Select value={form.stage} onValueChange={(value) => { if (!value) return; const nextStage = value as FiveSAuditStage; onChange({ ...form, stage: nextStage, order: editing === "new" ? nextQuestionOrder(nextStage) : form.order }); }}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><Label>Response Type</Label><Select value={form.responseType} onValueChange={(value) => value && update("responseType", value as AuditQuestionResponseType)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{RESPONSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Toggle label="Mandatory" checked={form.mandatory} onChange={(value) => update("mandatory", value)} /><Toggle label="Require Evidence on Non-Compliance" checked={form.requireEvidenceOnNonCompliance} disabled={form.responseType !== "Compliance"} onChange={(value) => update("requireEvidenceOnNonCompliance", value)} /><div className="sm:col-span-2"><Label htmlFor="custom-instruction">Instruction / Guidance <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="custom-instruction" value={form.instruction ?? ""} onChange={(event) => update("instruction", event.target.value)} className="mt-2" /></div><div className="sm:col-span-2"><Label htmlFor="custom-reference">Reference Image URL <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="custom-reference" value={form.referenceImage ?? ""} onChange={(event) => update("referenceImage", event.target.value)} className="mt-2" placeholder="https://… or data:image/…" /></div><Toggle label="Active" checked={form.active} onChange={(value) => update("active", value)} /><div><Label htmlFor="custom-order">Order within stage</Label><Input id="custom-order" type="number" min={1} value={form.order} onChange={(event) => update("order", Math.max(1, Number(event.target.value) || 1))} className="mt-2" /></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave}>{editing === "new" ? "Add Question" : "Save Changes"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) { return <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border p-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} disabled={disabled} /></div>; }
