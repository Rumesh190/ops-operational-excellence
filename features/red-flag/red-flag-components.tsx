"use client";
/* eslint-disable @next/next/no-img-element -- user-captured evidence is stored as dynamic data URLs. */

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Clock3, Eye, ImageIcon, RefreshCw, ShieldAlert, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import { OpsEvidenceViewer } from "@/components/ops/ops-evidence-viewer";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import { OpsTimeline } from "@/components/ops/ops-timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage, validateEvidenceSelection } from "@/lib/evidence-images";
import { formatOpsDateTime } from "@/lib/ops-formatters";
import { getOpsStatusVariant, OPS_PRIORITY } from "@/lib/ops-presentation";
import { cn } from "@/lib/utils";
import { getRedFlagSlaLabel, isRedFlagOverdue, redFlagAgeLabel } from "./red-flag-store";
import type { RedFlag, RedFlagActivity, RedFlagEvidence, RedFlagEvidenceGroup, RedFlagSeverity, RedFlagStatus } from "./types";

export const RED_FLAG_SEVERITY_CONFIG: Record<RedFlagSeverity, { variant: "danger" | "warning" | "secondary"; dot: string; rank: number; soft: string }> = {
  Critical: { ...OPS_PRIORITY.Critical, soft: "bg-red-500/[0.08] text-red-700 dark:text-red-300" },
  High: { ...OPS_PRIORITY.High, soft: "bg-orange-500/[0.08] text-orange-700 dark:text-orange-300" },
  Medium: { ...OPS_PRIORITY.Medium, soft: "bg-amber-500/[0.08] text-amber-700 dark:text-amber-300" },
  Low: { ...OPS_PRIORITY.Low, soft: "bg-slate-500/[0.08] text-slate-700 dark:text-slate-300" },
};

const RED_FLAG_STATUSES: RedFlagStatus[] = ["Open", "Action Created", "In Progress", "Awaiting Closure", "Closed", "Cancelled"];
export const RED_FLAG_STATUS_CONFIG = Object.fromEntries(RED_FLAG_STATUSES.map((status) => [status, { variant: getOpsStatusVariant(status) }])) as Record<RedFlagStatus, { variant: "danger" | "warning" | "success" | "info" | "secondary" }>;

export function SeverityBadge({ severity }: { severity: RedFlagSeverity }) {
  const style = RED_FLAG_SEVERITY_CONFIG[severity];
  return <Badge variant={style.variant}><span className={cn("mr-1 size-1.5 rounded-full", style.dot)} />{severity}</Badge>;
}

export function RedFlagStatusBadge({ status }: { status: RedFlagStatus }) {
  return <StatusBadge status={status} />;
}

export function AgeIndicator({ flag, showSla = false }: { flag: RedFlag; showSla?: boolean }) {
  const overdue = isRedFlagOverdue(flag);
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")} title={getRedFlagSlaLabel(flag)}>
    <Clock3 className="size-3.5" />{redFlagAgeLabel(flag)}{showSla && <span className="hidden sm:inline">· {getRedFlagSlaLabel(flag)}</span>}
  </span>;
}

export function RedFlagTabBar({ tabs, active, onChange, label = "Red Flag views" }: {
  tabs: Array<{ id: string; label: string; count?: number; href?: string }>;
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return <OpsTabBar tabs={tabs} active={active} onChange={onChange} label={label} />;
}

export function EvidencePicker({ items, onChange, group, uploadedBy, title = "Add evidence", compact = false }: {
  items: RedFlagEvidence[];
  onChange: (items: RedFlagEvidence[]) => void;
  group: RedFlagEvidenceGroup;
  uploadedBy: string;
  title?: string;
  compact?: boolean;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<RedFlagEvidence | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function selected(list: FileList | null, replaceId?: string) {
    if (!list) return;
    const files = Array.from(list);
    setError("");
    try {
      validateEvidenceSelection(files, replaceId ? Math.max(0, items.length - 1) : items.length);
      setBusy(true);
      const next: RedFlagEvidence[] = [];
      for (const file of files) {
        const optimized = await optimizeEvidenceImage(file);
        next.push({ id: `RF-EV-${crypto.randomUUID()}`, name: file.name, url: optimized.dataUrl, mimeType: file.type, note: note.trim() || undefined, group, uploadedAt: new Date().toISOString(), uploadedBy });
      }
      onChange(replaceId && next[0] ? items.map((item) => item.id === replaceId ? { ...next[0], id: item.id } : item) : [...items, ...next]);
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process this image.");
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  return <div className="grid gap-2">
    <input ref={uploadRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void selected(event.target.files)} />
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void selected(event.target.files)} />
    <input ref={replaceRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { void selected(event.target.files, replaceTargetRef.current ?? undefined); replaceTargetRef.current = null; }} />
    <div className={cn("grid gap-2", !compact && "sm:grid-cols-[minmax(0,1fr)_auto_auto]")}>
      <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for selected photos" />
      <Button type="button" variant="outline" className="min-h-11" onClick={() => cameraRef.current?.click()} disabled={busy || items.length >= MAX_EVIDENCE_IMAGES}><Camera className="size-4" />Take Photo</Button>
      <Button type="button" variant="outline" className="min-h-11" aria-label={`${title}: Upload Photo`} onClick={() => uploadRef.current?.click()} disabled={busy || items.length >= MAX_EVIDENCE_IMAGES}><Upload className="size-4" />{busy ? "Processing..." : "Upload Photo"}</Button>
    </div>
    <p className={cn("text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>{error || `${items.length}/${MAX_EVIDENCE_IMAGES} photos · JPG, PNG, or camera capture`}</p>
    {items.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">{items.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border bg-muted"><button type="button" onClick={() => setPreview(item)} className="block w-full"><img src={item.url} alt={item.note || item.name} className="aspect-[4/3] w-full object-cover" /></button><p className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{item.note || item.name}</p><div className="grid grid-cols-3 border-t bg-background"><button type="button" onClick={() => setPreview(item)} className="grid min-h-9 place-items-center" aria-label={`View ${item.name}`}><Eye className="size-3.5" /></button><button type="button" onClick={() => { replaceTargetRef.current = item.id; replaceRef.current?.click(); }} className="grid min-h-9 place-items-center border-x" aria-label={`Replace ${item.name}`}><RefreshCw className="size-3.5" /></button><button type="button" onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))} className="grid min-h-9 place-items-center text-destructive" aria-label={`Remove ${item.name}`}><Trash2 className="size-3.5" /></button></div></div>)}</div>}
    <OpsEvidenceViewer open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)} src={preview?.url} title={preview?.name} description={preview?.note || "Red Flag evidence"} alt={preview?.note || preview?.name} />
  </div>;
}

export function EvidenceGallery({ evidence, empty = "No evidence captured in this group." }: { evidence: RedFlagEvidence[]; empty?: string }) {
  const [preview, setPreview] = useState<RedFlagEvidence | null>(null);
  if (!evidence.length) return <div className="grid min-h-32 place-items-center rounded-lg border border-dashed bg-muted/[0.12] px-5 py-7 text-center"><div><ImageIcon className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">{empty}</p></div></div>;
  return <><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{evidence.map((item) => <button key={item.id} type="button" onClick={() => setPreview(item)} className="overflow-hidden rounded-lg border bg-muted text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"><img src={item.url} alt={item.note || item.name} className="aspect-[4/3] w-full object-cover" /><span className="block truncate px-2.5 pt-2 text-xs font-medium">{item.note || item.name}</span><span className="block truncate px-2.5 pb-2 pt-0.5 text-[10px] text-muted-foreground">{item.uploadedBy} · {formatDateTime(item.uploadedAt)}</span></button>)}</div>
    <OpsEvidenceViewer open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)} src={preview?.url} title={preview?.name} description={preview?.note || "Red Flag evidence"} alt={preview?.note || preview?.name} />
  </>;
}

const ACTIVITY_ICONS: Record<RedFlagActivity["type"], typeof Camera> = {
  raised: ShieldAlert, evidence_added: Camera, containment_recorded: ShieldAlert, action_created: Upload, action_started: Clock3, action_submitted: Upload, action_closed: CheckCircle2, awaiting_closure: Clock3, closed: CheckCircle2, reopened: ShieldAlert, cancelled: Trash2,
};

export function RedFlagActivityTimeline({ activity }: { activity: RedFlagActivity[] }) {
  return <OpsTimeline items={[...activity].reverse().map((item) => ({ id: item.id, title: item.label, actor: item.actorName, timestamp: item.at, remark: item.remark, icon: ACTIVITY_ICONS[item.type] }))} />;
}

export function formatDateTime(value: string) {
  return formatOpsDateTime(value);
}

export function EmptyRedFlags({ title = "No Red Flags match", description = "Adjust the filters or raise a new Red Flag from the floor." }: { title?: string; description?: string }) {
  return <OpsEmptyState title={title} description={description} icon={ShieldAlert} />;
}
