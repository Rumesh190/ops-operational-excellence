"use client";
/* eslint-disable @next/next/no-img-element -- previews are local user-captured data URLs. */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, Footprints, ImagePlus, MapPin, Plus, Users, X } from "lucide-react";

import { CreateLinkedActionDialog, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import { OpsFeedback } from "@/components/ops/ops-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/page-container";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import type { MyAction, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage } from "@/lib/evidence-images";
import { cn } from "@/lib/utils";
import { CompactEmpty, GembaStatusBadge, ObservationCard, OBSERVATION_TYPE_STYLE } from "./gemba-components";
import { canConductGembaWalk, canViewGembaWalk } from "./gemba-access";
import { completeGembaWalk, linkGembaAction, saveGembaObservation, startGembaWalk, useGembaStore } from "./gemba-store";
import type { GembaEvidence, GembaObservation, GembaObservationType, GembaWalk } from "./types";

const TYPES: Array<{ id: GembaObservationType; hint: string }> = [
  { id: "Positive", hint: "Good practice" },
  { id: "Opportunity", hint: "Could be better" },
  { id: "Issue", hint: "Needs attention" },
];

export default function GembaWalkPage({ walkId }: { walkId: string }) {
  const router = useRouter();
  const state = useGembaStore();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const candidate = state.walks.find((item) => item.id === walkId);
  const walk = candidate && canViewGembaWalk(candidate, currentUser, adminUser?.roles) && canConductGembaWalk(adminUser?.roles, currentUser) ? candidate : undefined;
  const observations = useMemo(() => state.observations.filter((item) => item.gembaId === walkId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.observations, walkId]);
  const actionMap = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editing, setEditing] = useState<GembaObservation | null>(null);
  const [linkedContext, setLinkedContext] = useState<LinkedActionContext | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [notice, setNotice] = useState("");

  if (!walk) return <PageContainer><FiveSPageHeader eyebrow="Gemba" title="Walk not found" description="This Gemba walk does not exist or is no longer available." /><Button className="w-fit" nativeButton={false} render={<Link href="/gemba" />}>Return to Gemba</Button></PageContainer>;
  const counts = {
    Positive: observations.filter((item) => item.type === "Positive").length,
    Opportunity: observations.filter((item) => item.type === "Opportunity").length,
    Issue: observations.filter((item) => item.type === "Issue").length,
  };
  const outstanding = observations.filter((item) => item.type === "Issue" && !item.actionId);

  function openNew() { setEditing(null); setCaptureOpen(true); }
  function openEdit(observation: GembaObservation) { setEditing(observation); setCaptureOpen(true); }
  function openAction(observation: GembaObservation) {
    setLinkedContext(toLinkedContext(walk!, observation));
    setActionOpen(true);
  }
  function actionCreated(action: MyAction) {
    if (!linkedContext?.sourceObservationId) return;
    linkGembaAction(walk!.id, linkedContext.sourceObservationId, action.id, currentUser);
    setNotice(`${action.id} created and linked to ${linkedContext.sourceObservationId}.`);
  }
  function confirmComplete() {
    completeGembaWalk(walk!.id, currentUser);
    setCompleteOpen(false);
    router.push(`/gemba/${walk!.id}`);
  }

  if (walk.status === "Draft") return <PageContainer className="max-w-4xl"><FiveSPageHeader eyebrow="Gemba" title={walk.id} description={`${walk.plant} · ${walk.zone} · ${walk.purpose}`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />} aria-label="Back to walk details"><ArrowLeft className="size-4" /></Button>} /><Card><CardContent className="grid min-h-64 place-items-center p-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/[0.08] text-primary"><Footprints className="size-6" /></span><h2 className="mt-4 text-base font-semibold">This walk is saved as a draft</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Start the walk when the team reaches {walk.zone}. Observation capture will open immediately.</p><Button className="mt-5" onClick={() => { startGembaWalk(walk.id, currentUser); setNotice("Walk started."); }}><Footprints className="size-4" />Start Walk</Button></div></CardContent></Card></PageContainer>;
  if (walk.status === "Completed") return <PageContainer className="max-w-4xl"><FiveSPageHeader eyebrow="Gemba" title="Walk completed" description={`${walk.id} was completed. The observations and linked actions remain available in the walk record.`} /><div className="flex gap-2"><Button nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />}>View Walk</Button><Button variant="outline" nativeButton={false} render={<Link href={`/gemba/${walk.id}/report`} />}>View Report</Button></div></PageContainer>;

  return <PageContainer className="gemba-active-walk max-w-6xl pb-24 sm:pb-0">
    <FiveSPageHeader eyebrow="Active Gemba Walk" title={walk.zone} description={`${walk.id} · ${walk.purpose}`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />} aria-label="Back to walk details"><ArrowLeft className="size-4" /></Button>} actions={<><GembaStatusBadge status={walk.status} /><Button className="hidden sm:inline-flex" onClick={openNew}><Plus className="size-4" />Add Observation</Button><Button variant="outline" onClick={() => setCompleteOpen(true)}><Check className="size-4" />Complete Walk</Button></>} />

    <section className="rounded-xl border bg-card p-3 shadow-sm"><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{walk.plant} · {walk.zone}</span><span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{walk.leadName} + {walk.participants.length} participant{walk.participants.length === 1 ? "" : "s"}</span></div><div className="flex flex-wrap items-center gap-3 text-xs"><strong className="text-sm tabular-nums">{observations.length} Observations</strong>{TYPES.map((type) => <span key={type.id} className="inline-flex items-center gap-1.5 text-muted-foreground"><span className={cn("size-1.5 rounded-full", OBSERVATION_TYPE_STYLE[type.id].dot)} />{counts[type.id]} {type.id}</span>)}<span className="font-medium text-primary">{walk.actionIds.length} Actions</span></div></div></section>

    {notice && <div className="flex items-center gap-2"><OpsFeedback tone="success" message={notice} className="flex-1" /><Button type="button" variant="ghost" size="icon-sm" onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="size-4" /></Button></div>}

    <div className="grid gap-3">{observations.map((observation) => <ObservationCard key={observation.id} observation={observation} action={observation.actionId ? actionMap.get(observation.actionId) : undefined} onEdit={() => openEdit(observation)} onCreateAction={() => openAction(observation)} />)}{observations.length === 0 && <Card className="gap-0"><CompactEmpty title="No observations captured yet" description="Use + Add Observation while walking the area. A title and type are enough to save quickly." action={<Button onClick={openNew}><Plus className="size-4" />Add Observation</Button>} /></Card>}</div>

    <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:hidden"><Button className="w-full" onClick={openNew}><Plus className="size-4" />Add Observation</Button></div>
    <ObservationCaptureDialog key={`${editing?.id ?? "new"}-${captureOpen}`} open={captureOpen} onOpenChange={setCaptureOpen} walkId={walk.id} zone={walk.zone} currentUser={currentUser} participants={walk.participants.map((item) => item.name)} observation={editing} onSaved={(observation, createAction) => { setNotice(`${observation.id} ${editing ? "updated" : "saved"}.`); setCaptureOpen(false); setEditing(null); if (createAction) { setLinkedContext(toLinkedContext(walk, observation)); setActionOpen(true); } }} />
    <CreateLinkedActionDialog key={linkedContext?.sourceObservationId ?? "no-observation"} open={actionOpen} onOpenChange={setActionOpen} context={linkedContext} onCreated={actionCreated} />

    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Review and complete walk</DialogTitle><DialogDescription>Confirm the captured record before closing this Gemba walk.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/[0.18] p-4 text-sm"><Summary label="Plant" value={walk.plant} /><Summary label="Zone" value={walk.zone} /><Summary label="Lead" value={walk.leadName} /><Summary label="Participants" value={String(walk.participants.length)} /><Summary label="Started" value={formatDateTime(walk.startedAt)} /><Summary label="Completing" value="Now" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Count label="Positive" value={counts.Positive} type="Positive" /><Count label="Opportunity" value={counts.Opportunity} type="Opportunity" /><Count label="Issue" value={counts.Issue} type="Issue" /><Count label="Actions" value={walk.actionIds.length} /></div>{outstanding.length > 0 && <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-3"><p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle className="size-4" />{outstanding.length} issue{outstanding.length === 1 ? "" : "s"} without an action</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You may still complete the walk. Add an action or record why follow-up is not required when appropriate.</p></div>}</div><DialogFooter><Button variant="outline" onClick={() => setCompleteOpen(false)}>Continue Walking</Button><Button onClick={confirmComplete} disabled={observations.length === 0}>Complete Walk</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}

function ObservationCaptureDialog({ open, onOpenChange, walkId, zone, currentUser, participants, observation, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; walkId: string; zone: string; currentUser: ReturnType<typeof useCurrentUser>; participants: string[]; observation: GembaObservation | null; onSaved: (observation: GembaObservation, createAction: boolean) => void;
}) {
  const [type, setType] = useState<GembaObservationType>(observation?.type ?? "Positive");
  const [title, setTitle] = useState(observation?.title ?? "");
  const [description, setDescription] = useState(observation?.description ?? "");
  const [location, setLocation] = useState(observation?.location ?? zone);
  const [people, setPeople] = useState<string[]>(observation?.peopleInvolved ?? []);
  const [evidence, setEvidence] = useState<GembaEvidence[]>(observation?.evidence ?? []);
  const [noActionReason, setNoActionReason] = useState(observation?.noActionReason ?? "");
  const [createAction, setCreateAction] = useState(false);
  const [more, setMore] = useState(Boolean(observation));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);

  async function addEvidence(files: FileList | null) {
    if (!files) return;
    setError(""); setBusy(true);
    try {
      const selected = Array.from(files).slice(0, Math.max(0, MAX_EVIDENCE_IMAGES - evidence.length));
      if (!selected.length) throw new Error(`Maximum ${MAX_EVIDENCE_IMAGES} photos allowed.`);
      const next: GembaEvidence[] = [];
      for (const file of selected) {
        const optimized = await optimizeEvidenceImage(file);
        next.push({ id: `GEM-EV-${crypto.randomUUID()}`, name: file.name, url: optimized.dataUrl, mimeType: file.type, uploadedAt: new Date().toISOString(), uploadedBy: currentUser.name });
      }
      setEvidence((items) => [...items, ...next]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add this image."); }
    finally { setBusy(false); }
  }

  function submit() {
    setError("");
    if (!title.trim()) { setError("Add a short observation title."); return; }
    const saved = saveGembaObservation(walkId, { type, title: title.trim(), description: description.trim() || title.trim(), location: location.trim() || zone, peopleInvolved: people, evidence, noActionReason: type === "Positive" || createAction ? undefined : noActionReason.trim() || undefined }, currentUser, observation?.id);
    if (!saved) { setError("The observation could not be saved."); return; }
    onSaved(saved, createAction && type !== "Positive" && !saved.actionId);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[96dvh] max-w-2xl gap-3 sm:max-h-[90vh]"><DialogHeader><DialogTitle>{observation ? "Edit Observation" : "Add Observation"}</DialogTitle><DialogDescription>Capture the essential detail now. Everything else is optional.</DialogDescription></DialogHeader>
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2">{TYPES.map((item) => <button key={item.id} type="button" onClick={() => { setType(item.id); if (item.id === "Positive") setCreateAction(false); }} className={cn("min-h-16 rounded-lg border px-2 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", type === item.id ? cn("border-current", OBSERVATION_TYPE_STYLE[item.id].soft) : "bg-background hover:bg-muted/30")}><span className={cn("mx-auto block size-2 rounded-full", OBSERVATION_TYPE_STYLE[item.id].dot)} /><span className="mt-1.5 block text-xs font-semibold">{item.id}</span><span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">{item.hint}</span></button>)}</div>
      <Field label="Short Title *"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === "Positive" ? "What is working well?" : type === "Issue" ? "What needs attention?" : "What could be improved?"} /></Field>
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="h-14" onClick={() => cameraRef.current?.click()}><Camera className="size-5" />Take Photo</Button><label className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted/30"><ImagePlus className="size-5" />Upload<input hidden type="file" accept="image/*" multiple onChange={(event) => { void addEvidence(event.target.files); event.target.value = ""; }} /></label><input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => { void addEvidence(event.target.files); event.target.value = ""; }} /></div>
      {evidence.length > 0 && <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">{evidence.map((item) => <div key={item.id} className="w-28 shrink-0 overflow-hidden rounded-lg border bg-muted"><div className="relative h-20"><img src={item.url} alt="" className="size-full object-cover" /><button type="button" onClick={() => setEvidence((items) => items.filter((candidate) => candidate.id !== item.id))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white" aria-label={`Remove ${item.name}`}><X className="size-3.5" /></button></div><input value={item.note ?? ""} onChange={(event) => setEvidence((items) => items.map((candidate) => candidate.id === item.id ? { ...candidate, note: event.target.value } : candidate))} className="h-8 w-full border-0 border-t bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-inset focus:ring-ring" placeholder="Add note" aria-label={`Note for ${item.name}`} /></div>)}</div>}
      {type !== "Positive" && <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3", type === "Issue" ? "border-red-500/25 bg-red-500/[0.045]" : "bg-muted/[0.12]")}><Checkbox checked={createAction} disabled={Boolean(observation?.actionId)} onCheckedChange={(checked) => setCreateAction(checked === true)} /><span><span className="block text-sm font-medium">Create an Action after saving</span><span className="block text-[11px] text-muted-foreground">{type === "Issue" ? "Recommended for issues requiring follow-up." : "Optional for this improvement opportunity."}</span></span></label>}
      <button type="button" onClick={() => setMore((value) => !value)} className="flex min-h-10 items-center justify-between border-y py-2 text-sm font-medium"><span>Additional details <span className="font-normal text-muted-foreground">(optional)</span></span><ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} /></button>
      {more && <div className="grid gap-4"><Field label="Description"><Textarea className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context the team will need later..." /></Field><Field label="Area / Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={`${zone} area or workstation`} /></Field>{participants.length > 0 && <Field label="People Involved"><div className="grid gap-1 rounded-lg border p-2 sm:grid-cols-2">{participants.map((name) => <label key={name} className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted/40"><Checkbox checked={people.includes(name)} onCheckedChange={(checked) => setPeople((current) => checked === true ? [...current, name] : current.filter((item) => item !== name))} />{name}</label>)}</div></Field>}{type !== "Positive" && !createAction && <Field label="Why no Action? (optional)"><Input value={noActionReason} onChange={(event) => setNoActionReason(event.target.value)} placeholder="e.g. Corrected immediately during the walk" /></Field>}</div>}
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!title.trim() || busy}>{busy ? "Processing..." : observation ? "Save Changes" : "Save Observation"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function toLinkedContext(walk: GembaWalk, observation: GembaObservation): LinkedActionContext {
  const evidence: MyActionEvidence[] = observation.evidence.map((item) => ({ id: item.id, evidenceType: "finding", name: item.name, type: "image", mimeType: item.mimeType, uploadedAt: item.uploadedAt, uploadedBy: item.uploadedBy, url: item.url }));
  return { source: "Gemba", sourceModule: "gemba", sourceId: walk.id, sourceObservationId: observation.id, sourceObservation: observation.title, title: observation.type === "Issue" ? `Resolve: ${observation.title}` : `Improve: ${observation.title}`, description: observation.description, plant: walk.plant, zone: walk.zone, location: observation.location, evidence };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-1.5 text-sm font-medium">{label}{children}</label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-medium">{value}</p></div>; }
function Count({ label, value, type }: { label: string; value: number; type?: GembaObservationType }) { return <div className="rounded-lg border bg-card p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-semibold tabular-nums", type && (type === "Positive" ? "text-emerald-600 dark:text-emerald-400" : type === "Issue" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"))}>{value}</p></div>; }
function formatDateTime(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not recorded"; }
