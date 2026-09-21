"use client";
/* eslint-disable @next/next/no-img-element -- CI evidence includes dynamic camera uploads and existing local evidence fixtures. */

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Clock3, FileEdit, ImageIcon, Link2, PauseCircle, PlayCircle, RotateCcw, Send, ShieldCheck, Trash2, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import { OpsEvidenceViewer } from "@/components/ops/ops-evidence-viewer";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import { OpsTimeline } from "@/components/ops/ops-timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage, validateEvidenceSelection } from "@/lib/evidence-images";
import { formatOpsDate, formatOpsDateTime, formatOpsMoney } from "@/lib/ops-formatters";
import { cn } from "@/lib/utils";
import { IMPROVEMENT_STATUS_LABELS } from "./config";
import type { ContinuousImprovement, ImprovementEvent, ImprovementEvidence, ImprovementPerson, ImprovementStatus } from "./types";

export function ImprovementStatusBadge({ status }: { status: ImprovementStatus }) {
  return <StatusBadge status={IMPROVEMENT_STATUS_LABELS[status]} />;
}

export function ImprovementTabs({ tabs, active, onChange, label = "Continuous Improvement sections" }: { tabs: Array<{ id: string; label: string; count?: number; href?: string }>; active: string; onChange: (id: string) => void; label?: string }) {
  return <OpsTabBar tabs={tabs} active={active} onChange={onChange} label={label} />;
}

export function ImprovementEvidencePicker({ items, onChange, uploadedBy, label = "Upload images", required = false }: { items: ImprovementEvidence[]; onChange: (items: ImprovementEvidence[]) => void; uploadedBy: string; label?: string; required?: boolean }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function selected(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list);
    setError("");
    try {
      validateEvidenceSelection(files, items.length);
      setBusy(true);
      const next: ImprovementEvidence[] = [];
      for (const file of files) {
        const optimized = await optimizeEvidenceImage(file);
        next.push({ id: `CI-EV-${crypto.randomUUID()}`, name: file.name, url: optimized.dataUrl, mimeType: file.type, caption: caption.trim() || undefined, uploadedAt: new Date().toISOString(), uploadedBy });
      }
      onChange([...items, ...next]);
      setCaption("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process this image.");
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  return <div className="grid gap-3">
    <input ref={uploadRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void selected(event.target.files)} />
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void selected(event.target.files)} />
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><Input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Short caption for selected photos" /><Button type="button" variant="outline" className="min-h-11" onClick={() => cameraRef.current?.click()} disabled={busy || items.length >= MAX_EVIDENCE_IMAGES}><Camera className="size-4" />Camera</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => uploadRef.current?.click()} disabled={busy || items.length >= MAX_EVIDENCE_IMAGES}><Upload className="size-4" />{busy ? "Processing..." : label}</Button></div>
    <p className={cn("text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>{error || `${required ? "Required · " : "Optional · "}${items.length}/${MAX_EVIDENCE_IMAGES} photos · JPG, PNG, or camera capture`}</p>
    {items.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">{items.map((item) => <figure key={item.id} className="group relative overflow-hidden rounded-lg border bg-muted/25"><img src={item.url} alt={item.caption || item.name} className="aspect-[4/3] w-full object-cover" /><button type="button" onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))} aria-label={`Remove ${item.name}`} className="absolute right-1 top-1 grid size-8 place-items-center rounded-md bg-black/70 text-white outline-none hover:bg-black focus-visible:ring-2 focus-visible:ring-white"><Trash2 className="size-3.5" /></button><figcaption className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{item.caption || item.name}</figcaption></figure>)}</div>}
  </div>;
}

export function ImprovementBeforeAfter({ item }: { item: ContinuousImprovement }) {
  const [preview, setPreview] = useState<{ label: string; evidence: ImprovementEvidence } | null>(null);
  return <>
    <div className="grid gap-3 md:grid-cols-2"><EvidencePanel label="Before" evidence={item.beforeEvidence} description={item.issueDescription} tone="before" onPreview={(evidence) => setPreview({ label: "Before", evidence })} /><EvidencePanel label="After" evidence={item.afterEvidence} description={item.actualBenefit || "Completion evidence will appear after implementation."} tone="after" onPreview={(evidence) => setPreview({ label: "After", evidence })} /></div>
    <OpsEvidenceViewer open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)} src={preview?.evidence.url} title={preview ? `${preview.label} · ${item.title}` : undefined} description={preview?.evidence.caption || preview?.evidence.name || "Continuous Improvement evidence"} alt={preview?.evidence.caption || preview?.evidence.name} />
  </>;
}

function EvidencePanel({ label, evidence, description, tone, onPreview }: { label: string; evidence: ImprovementEvidence[]; description: string; tone: "before" | "after"; onPreview: (evidence: ImprovementEvidence) => void }) {
  const primary = evidence[0];
  return <div className="min-w-0 overflow-hidden rounded-xl border bg-card"><div className="flex items-center justify-between border-b px-3 py-2"><span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className={cn("size-1.5 rounded-full", tone === "before" ? "bg-amber-500" : "bg-emerald-500")} />{label}</span>{primary && <span className="text-[10px] text-muted-foreground">Click to expand</span>}</div>{primary ? <button type="button" onClick={() => onPreview(primary)} className="block w-full overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><img src={primary.url} alt={primary.caption || primary.name} className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.015]" /></button> : <div className="grid aspect-[16/9] place-items-center bg-muted/25 text-center text-xs text-muted-foreground"><div><ImageIcon className="mx-auto mb-2 size-5" />No {label.toLowerCase()} evidence</div></div>}<p className="p-3 text-xs leading-5 text-muted-foreground sm:p-4 sm:text-sm sm:leading-6">{description}</p>{evidence.length > 1 && <div className="flex gap-2 overflow-x-auto border-t p-2">{evidence.slice(1).map((item) => <button key={item.id} type="button" onClick={() => onPreview(item)} className="shrink-0 overflow-hidden rounded-md border"><img src={item.url} alt={item.caption || item.name} className="aspect-[4/3] w-20 object-cover" /></button>)}</div>}</div>;
}

const EVENT_CONFIG: Record<ImprovementEvent["type"], { label: string; icon: typeof Clock3 }> = {
  created: { label: "Draft created", icon: FileEdit }, updated: { label: "Proposal updated", icon: FileEdit }, submitted: { label: "Submitted", icon: Send }, review_started: { label: "Review started", icon: ShieldCheck }, approved: { label: "Approved", icon: CheckCircle2 }, rejected: { label: "Rejected", icon: XCircle }, on_hold: { label: "Placed on hold", icon: PauseCircle }, review_resumed: { label: "Review resumed", icon: RotateCcw }, started: { label: "Implementation started", icon: PlayCircle }, progress_updated: { label: "Implementation updated", icon: FileEdit }, action_created: { label: "Action created", icon: Link2 }, evidence_uploaded: { label: "Evidence uploaded", icon: Camera }, completion_submitted: { label: "Completion submitted", icon: Send }, completion_returned: { label: "Returned for changes", icon: RotateCcw }, completion_resubmitted: { label: "Completion resubmitted", icon: Send }, completed: { label: "Completed", icon: CheckCircle2 },
};

export function ImprovementTimeline({ activity }: { activity: ImprovementEvent[] }) {
  return <OpsTimeline items={[...activity].reverse().map((item) => ({ id: item.id, title: EVENT_CONFIG[item.type].label, actor: item.actorName, timestamp: item.at, remark: item.remark, icon: EVENT_CONFIG[item.type].icon }))} />;
}

export function ParticipantList({ participants }: { participants: ImprovementPerson[] }) {
  if (!participants.length) return <span className="text-sm text-muted-foreground">No additional participants</span>;
  return <div className="flex flex-wrap gap-2">{participants.slice(0, 5).map((person) => <span key={person.id} className="inline-flex items-center gap-2 rounded-full border bg-muted/20 py-1 pl-1 pr-2.5 text-xs font-medium"><span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">{initials(person.name)}</span>{person.name}</span>)}{participants.length > 5 && <Badge variant="secondary">+{participants.length - 5}</Badge>}</div>;
}

export function ImprovementEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <OpsEmptyState title={title} description={description} action={action} icon={ImageIcon} />;
}

export function formatImprovementDate(value?: string, time = false) {
  return time ? formatOpsDateTime(value) : formatOpsDate(value);
}

export function formatImprovementMoney(value?: number) {
  return formatOpsMoney(value);
}

export function improvementAge(value: string, now = new Date()) {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? "Today" : `${days}d`;
}

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
