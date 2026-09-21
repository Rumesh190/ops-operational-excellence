"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MyAction, MyActionEvidence, MyActionPriority } from "@/features/five-s/types/my-actions";
import { createAction } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { getFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { useActiveActionCategories } from "@/lib/actions/action-category-store";
import { getPriorityDueDate, useActiveActionPriorities } from "@/lib/actions/action-configuration-store";
import { cn } from "@/lib/utils";

export interface LinkedActionContext {
  source: "Gemba" | "Red Flag" | "Red Tag" | "Visual Management" | "Visual Improvement" | "Continuous Improvement";
  sourceModule: "gemba" | "redFlag" | "redTag" | "visualManagement" | "visualImprovement" | "continuousImprovement";
  sourceId: string;
  sourceObservationId?: string;
  sourceObservation: string;
  title: string;
  description: string;
  plant: string;
  zone: string;
  location: string;
  evidence: MyActionEvidence[];
  defaultPriority?: MyActionPriority;
  defaultResponsibleId?: string;
  defaultDueDate?: string;
}

export function CreateLinkedActionDialog({ open, onOpenChange, context, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: LinkedActionContext | null;
  onCreated: (action: MyAction) => void;
}) {
  const currentUser = useCurrentUser();
  const actionCategories = useActiveActionCategories();
  const actionPriorities = useActiveActionPriorities();
  const [priority, setPriority] = useState<MyActionPriority>(context?.defaultPriority ?? "Medium");
  const [category, setCategory] = useState("");
  const [responsibleId, setResponsibleId] = useState(context?.defaultResponsibleId ?? "");
  const [busy, setBusy] = useState(false);
  const zone = context ? getFiveSZoneConfiguration(context.zone) : undefined;
  const effectivePriority = actionPriorities.some((item) => item.id === priority) ? priority : actionPriorities[0]?.id ?? priority;
  const dueDate = context?.defaultDueDate ?? getPriorityDueDate(effectivePriority);

  function submit() {
    if (!context || !zone || !category || !responsibleId || busy) return;
    const responsible = zone.members.find((member) => member.id === responsibleId);
    if (!responsible) return;
    setBusy(true);
    const action = createAction({
      title: context.title,
      description: context.description,
      source: context.source,
      sourceTitle: context.sourceId,
      sourceModule: context.sourceModule,
      sourceId: context.sourceId,
      sourceLabel: context.source,
      sourceLocation: `${context.plant} · ${context.zone} · ${context.location}`,
      sourceObservationId: context.sourceObservationId,
      sourceObservation: context.sourceObservation,
      originalFinding: context.sourceObservation,
      plant: context.plant,
      department: zone.department,
      area: context.zone,
      zoneId: context.zone,
      assignedTo: responsible.name,
      responsiblePersonId: responsible.id,
      responsiblePersonName: responsible.name,
      zoneLeaderId: zone.leaderId,
      zoneLeaderName: zone.leader,
      assignedByUserId: currentUser.id,
      assignedByName: currentUser.name,
      assignedAt: new Date().toISOString(),
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      auditor: currentUser.name,
      status: "Assigned",
      priority: effectivePriority,
      dueDate,
      actionCategory: category,
      issueEvidence: context.evidence,
    });
    onOpenChange(false);
    setBusy(false);
    onCreated(action);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-[92vw] sm:p-8 lg:max-w-[min(940px,calc(100vw-64px))]">
      <DialogHeader className="shrink-0 pb-3 sm:pb-4">
        <DialogTitle>Create Action from {context?.source ?? "Source"}</DialogTitle>
        <DialogDescription>The source context and evidence are linked automatically. Add only the action ownership details.</DialogDescription>
      </DialogHeader>
      {context && <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 sm:-mx-8 sm:px-8">
        <div className="grid gap-6">
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Source context · read-only</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={context.source === "Red Flag" ? "danger" : "info"}>{context.source}</Badge><span className="font-mono text-xs text-muted-foreground">{context.sourceId}</span>{context.sourceObservationId && <span className="font-mono text-xs text-muted-foreground">{context.sourceObservationId}</span>}{context.defaultPriority && <Badge variant={context.defaultPriority === "Critical" || context.defaultPriority === "High" ? "danger" : context.defaultPriority === "Medium" ? "warning" : "secondary"}>{context.defaultPriority} context</Badge>}</div>
            <p className="mt-2 text-sm font-semibold">{context.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{context.description}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="size-3.5" />{context.zone} · {context.location} · {context.evidence.length} evidence photo{context.evidence.length === 1 ? "" : "s"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority *"><Select value={effectivePriority} onValueChange={(value) => setPriority((value ?? actionPriorities[0]?.id ?? "Medium") as MyActionPriority)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{actionPriorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Due Date" derived><Input type="date" value={dueDate} disabled /></Field>
            <Field label="Action Category *"><Select value={category} onValueChange={(value) => setCategory(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{actionCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Action Owner *"><Select value={responsibleId} onValueChange={(value) => setResponsibleId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select zone member" /></SelectTrigger><SelectContent>{zone?.members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Zone Leader" derived><Input value={zone?.leader ?? "—"} disabled /></Field>
            <Field label="Assigned By" derived><Input value={currentUser.name} disabled /></Field>
          </div>
        </div>
      </div>}
      <DialogFooter className="shrink-0 sm:-mx-8 sm:-mb-8 sm:p-8"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!context || !category || !responsibleId || busy} onClick={submit}>{busy ? "Creating..." : "Create Action"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function Field({ label, children, derived = false }: { label: string; children: React.ReactNode; derived?: boolean }) {
  return <label className={cn("grid min-w-0 gap-1.5 text-sm font-medium", derived && "text-muted-foreground")}>{label}{children}</label>;
}
