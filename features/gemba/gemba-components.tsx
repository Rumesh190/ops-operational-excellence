"use client";
/* eslint-disable @next/next/no-img-element -- local and user-captured evidence uses dynamic data URLs. */

import { useState } from "react";
import Link from "next/link";
import { Camera, Eye, FileCheck2, ImageIcon, MapPin, Mic, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import { OpsEvidenceViewer } from "@/components/ops/ops-evidence-viewer";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { ACTION_STATUS_CONFIG } from "@/lib/actions/action-config";
import { cn } from "@/lib/utils";
import type { GembaEvidence, GembaObservation, GembaObservationType, GembaWalkStatus } from "./types";
import { useGembaEvidenceUrl } from "./use-gemba-evidence-url";

export const OBSERVATION_TYPE_STYLE: Record<GembaObservationType, {
  variant: "success" | "warning" | "danger";
  dot: string;
  border: string;
  soft: string;
  text: string;
}> = {
  Positive: { variant: "success", dot: "bg-emerald-500", border: "border-l-emerald-500", soft: "bg-emerald-500/[0.055]", text: "text-emerald-600 dark:text-emerald-400" },
  Opportunity: { variant: "warning", dot: "bg-amber-500", border: "border-l-amber-500", soft: "bg-amber-500/[0.055]", text: "text-amber-600 dark:text-amber-400" },
  Issue: { variant: "danger", dot: "bg-red-500", border: "border-l-red-500", soft: "bg-red-500/[0.055]", text: "text-red-600 dark:text-red-400" },
};

export function GembaStatusBadge({ status }: { status: GembaWalkStatus }) {
  return <StatusBadge status={status} />;
}

export function ObservationTypeBadge({ type }: { type: GembaObservationType }) {
  return <Badge variant={OBSERVATION_TYPE_STYLE[type].variant}><span className={cn("mr-1 size-1.5 rounded-full", OBSERVATION_TYPE_STYLE[type].dot)} />{type}</Badge>;
}

export function GembaTabBar({ tabs, active, onChange, label = "Gemba views" }: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return <OpsTabBar tabs={tabs} active={active} onChange={onChange} label={label} />;
}

export function ObservationCard({ observation, action, onEdit, onCreateAction, compact = false }: {
  observation: GembaObservation;
  action?: MyAction;
  onEdit?: () => void;
  onCreateAction?: () => void;
  compact?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [preview, setPreview] = useState<GembaObservation["evidence"][number] | null>(null);
  const style = OBSERVATION_TYPE_STYLE[observation.type];
  return <>
    <article id={observation.id} className={cn("scroll-mt-24 overflow-hidden rounded-xl border border-l-[3px] bg-card shadow-sm", style.border)}>
      <div className={cn("flex min-w-0 items-start gap-3", compact ? "p-3" : "p-4")}>
        {observation.evidence[0] ? <button type="button" onClick={() => setPreview(observation.evidence[0])} className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-[72px]" aria-label={`Preview ${observation.evidence[0].name}`}><GembaEvidenceImage evidence={observation.evidence[0]} className="size-full object-cover" />{observation.evidence.length > 1 && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">+{observation.evidence.length - 1}</span>}</button> : <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed bg-muted/20 text-muted-foreground sm:size-[72px]"><ImageIcon className="size-5" /></span>}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2"><ObservationTypeBadge type={observation.type} /><span className="font-mono text-[10px] text-muted-foreground">{observation.id.split("-").slice(-2).join("-")}</span></div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{observation.title}</h3>
          {!compact && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{observation.description}</p>}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1"><MapPin className="size-3 shrink-0" /><span className="truncate">{observation.location}</span></span><span>{observation.evidence.length} photo{observation.evidence.length === 1 ? "" : "s"}</span></div>
          {observation.noActionReason && !action && <p className={cn("mt-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground", style.soft)}>{observation.noActionReason}</p>}
        </div>
      </div>
      <footer className="flex min-w-0 flex-wrap items-center gap-1 border-t bg-muted/[0.18] px-3 py-2">
        <Button size="sm" variant="ghost" onClick={() => setViewOpen(true)}><Eye className="size-3.5" />View</Button>
        {onEdit && <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="size-3.5" />Edit</Button>}
        {action ? <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/actions/${encodeURIComponent(action.id)}`} />} className="ml-auto"><FileCheck2 className="size-3.5" />{action.id}<Badge size="sm" variant={ACTION_STATUS_CONFIG[action.status].variant} className="ml-1 hidden sm:inline-flex">{action.status}</Badge></Button> : onCreateAction && observation.type !== "Positive" ? <Button size="sm" variant="outline" onClick={onCreateAction} className="ml-auto"><Plus className="size-3.5" />Create Action</Button> : <span className="ml-auto text-[11px] text-muted-foreground">No action needed</span>}
      </footer>
    </article>

    <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-2xl"><DialogHeader><div className="flex flex-wrap items-center gap-2"><ObservationTypeBadge type={observation.type} /><span className="font-mono text-xs text-muted-foreground">{observation.id}</span></div><DialogTitle className="pt-1 text-lg leading-6">{observation.title}</DialogTitle><DialogDescription>{observation.location} · Added by {observation.createdByName}</DialogDescription></DialogHeader><p className="text-sm leading-6">{observation.description}</p>{observation.peopleInvolved.length > 0 && <p className="text-xs text-muted-foreground">People involved: {observation.peopleInvolved.join(", ")}</p>}{observation.evidence.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{observation.evidence.map((item) => <button type="button" key={item.id} onClick={() => setPreview(item)} className="overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"><GembaEvidenceImage evidence={item} alt={item.note || item.name} className="aspect-[4/3] w-full object-cover" /><span className="block truncate px-2 py-1.5 text-left text-[11px] text-muted-foreground">{item.note || item.name}</span></button>)}</div>}{observation.voiceNote && <VoiceNotePlayback voiceNote={observation.voiceNote} />}</DialogContent></Dialog>
    <GembaEvidenceLightbox evidence={preview} onOpenChange={(open) => !open && setPreview(null)} />
  </>;
}

/** Renders one piece of Gemba photo evidence, resolving its URL from IndexedDB when only a `storageKey` reference is available (e.g. after a page refresh). */
export function GembaEvidenceImage({ evidence, className, alt = "" }: { evidence: GembaEvidence; className?: string; alt?: string }) {
  const url = useGembaEvidenceUrl(evidence);
  if (!url) return <span className={cn("grid place-items-center bg-muted text-muted-foreground", className)}><ImageIcon className="size-4 animate-pulse" /></span>;
  return <img src={url} alt={alt} className={className} />;
}

function GembaEvidenceLightbox({ evidence, onOpenChange }: { evidence: GembaEvidence | null; onOpenChange: (open: boolean) => void }) {
  const url = useGembaEvidenceUrl(evidence);
  return <OpsEvidenceViewer open={Boolean(evidence)} onOpenChange={onOpenChange} src={url} title={evidence?.name} description={evidence?.note || "Gemba observation evidence"} alt={evidence?.note || evidence?.name} />;
}

export function CompactEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <OpsEmptyState title={title} description={description} action={action} icon={Camera} compact />;
}

function VoiceNotePlayback({ voiceNote }: { voiceNote: NonNullable<GembaObservation["voiceNote"]> }) {
  const [unavailable, setUnavailable] = useState(false);
  const canPlay = Boolean(voiceNote.audioUrl) && !unavailable;
  return <div className="rounded-lg border bg-muted/[0.18] p-3">
    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Mic className="size-3.5" />Voice Note</p>
    {canPlay ? <audio controls src={voiceNote.audioUrl} onError={() => setUnavailable(true)} className="mt-2 w-full"><track kind="captions" /></audio> : <p className="mt-2 text-[11px] text-muted-foreground">Recording ({voiceNote.durationSeconds}s) — audio playback is unavailable in this session.</p>}
    {voiceNote.transcript && <p className="mt-2 text-xs leading-5 text-muted-foreground">&quot;{voiceNote.transcript}&quot;</p>}
  </div>;
}
