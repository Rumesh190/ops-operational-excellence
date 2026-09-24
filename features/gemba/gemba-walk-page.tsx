"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Eye, Footprints, ImagePlus, Lightbulb, MapPin, Mic, Pencil, Plus, RefreshCw, ThumbsUp, Trash2, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CreateLinkedActionDialog, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import { CreateRedTagFromGembaDialog } from "@/features/gemba/components/create-red-tag-dialog";
import { CreateCIFromGembaDialog } from "@/features/gemba/components/create-ci-from-observation-dialog";
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
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImageToBlob } from "@/lib/evidence-images";
import { deleteGembaPhoto, getGembaPhoto, isGembaPhotoStorageAvailable, saveGembaPhoto } from "@/lib/gemba/gemba-photo-storage";
import { useOrganizationConfiguration } from "@/lib/organization-store";
import { cn } from "@/lib/utils";
import { CompactEmpty, GembaEvidenceImage, GembaEvidenceLightbox, GembaStatusBadge, ObservationCard, OBSERVATION_TYPE_STYLE } from "./gemba-components";
import { canConductGembaWalk, canViewGembaWalk } from "./gemba-access";
import { completeGembaWalk, linkGembaAction, linkGembaRedTag, linkGembaImprovement, saveGembaObservation, startGembaWalk, useGembaStore } from "./gemba-store";
import { isEvidencePhotoRequired, resolveGembaCorrectiveActionNeeded, type GembaEvidence, type GembaObservation, type GembaObservationType, type GembaVoiceNote, type GembaWalk } from "./types";
import { VoiceCaptureFlow } from "./voice-capture-flow";
import { formatGembaZoneLabel } from "./gemba-zone-labels";

const TYPES: Array<{ id: GembaObservationType; hint: string; icon: LucideIcon }> = [
  { id: "Positive", hint: "Good practice", icon: ThumbsUp },
  { id: "Opportunity", hint: "Could be better", icon: Lightbulb },
  { id: "Issue", hint: "Needs attention", icon: AlertTriangle },
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
  const [redTagObservation, setRedTagObservation] = useState<GembaObservation | null>(null);
  const [redTagOpen, setRedTagOpen] = useState(false);
  const [improvementObservation, setImprovementObservation] = useState<GembaObservation | null>(null);
  const [improvementOpen, setImprovementOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [notice, setNotice] = useState("");

  if (!walk) return <PageContainer><FiveSPageHeader eyebrow="Gemba" title="Walk not found" description="This Gemba walk does not exist or is no longer available." /><Button className="w-fit" nativeButton={false} render={<Link href="/gemba" />}>Return to Gemba</Button></PageContainer>;
  const counts = {
    Positive: observations.filter((item) => item.type === "Positive").length,
    Opportunity: observations.filter((item) => item.type === "Opportunity").length,
    Issue: observations.filter((item) => item.type === "Issue").length,
  };
  const outstanding = observations.filter((item) => item.type === "Issue" && !item.actionId && resolveGembaCorrectiveActionNeeded(item) !== false);

  function openNew() { setEditing(null); setCaptureOpen(true); }
  function openEdit(observation: GembaObservation) { setEditing(observation); setCaptureOpen(true); }
  function openAction(observation: GembaObservation) {
    if (observation.actionId) return;
    setLinkedContext(toLinkedContext(walk!, observation));
    setActionOpen(true);
  }
  function openRedTag(observation: GembaObservation) {
    if (observation.redTagId) return;
    setRedTagObservation(observation);
    setRedTagOpen(true);
  }
  function openImprovement(observation: GembaObservation) {
    if (observation.improvementId) return;
    setImprovementObservation(observation);
    setImprovementOpen(true);
  }
  function actionCreated(action: MyAction) {
    if (!linkedContext?.sourceObservationId) return false;
    const linked = linkGembaAction(walk!.id, linkedContext.sourceObservationId, action.id, currentUser);
    if (!linked) return false;
    setNotice(`${action.id} created and linked to ${linkedContext.sourceObservationId}.`);
    return true;
  }
  function redTagCreated(redTagId: string) {
    if (!redTagObservation) return;
    const linked = linkGembaRedTag(walk!.id, redTagObservation.id, redTagId, currentUser);
    if (linked) {
      setNotice(`${redTagId} created and linked to ${redTagObservation.id}.`);
    }
  }
  function improvementCreated(improvementId: string) {
    if (!improvementObservation) return;
    const linked = linkGembaImprovement(walk!.id, improvementObservation.id, improvementId, currentUser);
    if (linked) {
      setNotice(`${improvementId} created and linked to ${improvementObservation.id}.`);
    }
  }
  function confirmComplete() {
    completeGembaWalk(walk!.id, currentUser);
    setCompleteOpen(false);
    router.push(`/gemba/${walk!.id}`);
  }

  if (walk.status === "Scheduled") return <PageContainer className="max-w-4xl"><FiveSPageHeader eyebrow="Gemba" title={walk.id} description={`${walk.plant} · ${formatGembaZoneLabel(walk.zone)} · ${walk.purpose}`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />} aria-label="Back to walk details"><ArrowLeft className="size-4" /></Button>} /><Card><CardContent className="grid min-h-64 place-items-center p-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/[0.08] text-primary"><Footprints className="size-6" /></span><h2 className="mt-4 text-base font-semibold">This walk is scheduled</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Start the walk when the team reaches {formatGembaZoneLabel(walk.zone)}. Observation capture will open immediately.</p><Button className="mt-5" onClick={() => { startGembaWalk(walk.id, currentUser); setNotice("Walk started."); }}><Footprints className="size-4" />Start Walk</Button></div></CardContent></Card></PageContainer>;
  if (walk.status === "Completed") return <PageContainer className="max-w-4xl"><FiveSPageHeader eyebrow="Gemba" title="Walk completed" description={`${walk.id} was completed. The observations and linked actions remain available in the walk record.`} /><div className="flex gap-2"><Button nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />}>View Walk</Button><Button variant="outline" nativeButton={false} render={<Link href={`/gemba/${walk.id}/report`} />}>View Report</Button></div></PageContainer>;

  return <PageContainer className="gemba-active-walk max-w-6xl pb-24 sm:pb-0">
    <FiveSPageHeader eyebrow="Active Gemba Walk" title={formatGembaZoneLabel(walk.zone)} description={`${walk.id} · ${walk.purpose}`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/gemba/${walk.id}`} />} aria-label="Back to walk details"><ArrowLeft className="size-4" /></Button>} actions={<><GembaStatusBadge status={walk.status} /><Button className="hidden sm:inline-flex" onClick={openNew}><Plus className="size-4" />Add Observation</Button><Button variant="outline" onClick={() => setCompleteOpen(true)}><Check className="size-4" />Complete Walk</Button></>} />

    <section className="rounded-xl border bg-card p-3 shadow-sm"><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{walk.plant} · {formatGembaZoneLabel(walk.zone)}</span><span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{walk.leadName} + {walk.participants.length} participant{walk.participants.length === 1 ? "" : "s"}</span></div><div className="flex flex-wrap items-center gap-3 text-xs"><strong className="text-sm tabular-nums">{observations.length} Observations</strong>{TYPES.map((type) => <span key={type.id} className="inline-flex items-center gap-1.5 text-muted-foreground"><span className={cn("size-1.5 rounded-full", OBSERVATION_TYPE_STYLE[type.id].dot)} />{counts[type.id]} {type.id}</span>)}<span className="font-medium text-primary">{walk.actionIds.length} Actions</span></div></div></section>

    {notice && <div className="flex items-center gap-2"><OpsFeedback tone="success" message={notice} className="flex-1" /><Button type="button" variant="ghost" size="icon-sm" onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="size-4" /></Button></div>}

    <div className="grid gap-3">{observations.map((observation) => <ObservationCard key={observation.id} observation={observation} action={observation.actionId ? actionMap.get(observation.actionId) : undefined} onEdit={() => openEdit(observation)} onCreateAction={() => openAction(observation)} onCreateRedTag={() => openRedTag(observation)} onCreateImprovement={() => openImprovement(observation)} />)}{observations.length === 0 && <Card className="gap-0"><CompactEmpty title="No observations captured yet" description="Use + Add Observation while walking the area. A title and type are enough to save quickly." action={<Button onClick={openNew}><Plus className="size-4" />Add Observation</Button>} /></Card>}</div>

    <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:hidden"><Button className="w-full" onClick={openNew}><Plus className="size-4" />Add Observation</Button></div>
    <ObservationCaptureDialog key={`${editing?.id ?? "new"}-${captureOpen}`} open={captureOpen} onOpenChange={setCaptureOpen} walkId={walk.id} plant={walk.plant} zone={walk.zone} walkPurpose={walk.purpose} currentUser={currentUser} participants={walk.participants.map((item) => item.name)} observation={editing} onSaved={(observation, createAction) => { setNotice(`${observation.id} ${editing ? "updated" : "saved"}.`); setCaptureOpen(false); setEditing(null); if (createAction) { setLinkedContext(toLinkedContext(walk, observation)); setActionOpen(true); } }} />
    <CreateLinkedActionDialog key={linkedContext?.sourceObservationId ?? "no-observation"} open={actionOpen} onOpenChange={setActionOpen} context={linkedContext} onCreated={actionCreated} />
    {redTagObservation && <CreateRedTagFromGembaDialog key={redTagObservation.id} open={redTagOpen} onOpenChange={setRedTagOpen} observation={redTagObservation} walkId={walk.id} plant={walk.plant} zone={walk.zone} onCreated={redTagCreated} />}
    {improvementObservation && <CreateCIFromGembaDialog key={improvementObservation.id} open={improvementOpen} onOpenChange={setImprovementOpen} observation={improvementObservation} walkId={walk.id} plant={walk.plant} zone={walk.zone} onCreated={improvementCreated} />}

    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Review and complete walk</DialogTitle><DialogDescription>Confirm the captured record before closing this Gemba walk.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/[0.18] p-4 text-sm"><Summary label="Plant" value={walk.plant} /><Summary label="Zone" value={formatGembaZoneLabel(walk.zone)} /><Summary label="Lead" value={walk.leadName} /><Summary label="Participants" value={String(walk.participants.length)} /><Summary label="Started" value={formatDateTime(walk.startedAt)} /><Summary label="Completing" value="Now" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Count label="Positive" value={counts.Positive} type="Positive" /><Count label="Opportunity" value={counts.Opportunity} type="Opportunity" /><Count label="Issue" value={counts.Issue} type="Issue" /><Count label="Actions" value={walk.actionIds.length} /></div>{outstanding.length > 0 && <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-3"><p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle className="size-4" />{outstanding.length} issue{outstanding.length === 1 ? "" : "s"} without an action</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You may still complete the walk. Add an action or record why follow-up is not required when appropriate.</p></div>}</div><DialogFooter><Button variant="outline" onClick={() => setCompleteOpen(false)}>Continue Walking</Button><Button onClick={confirmComplete} disabled={observations.length === 0}>Complete Walk</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}

type CaptureMode = "choose" | "voice" | "form";

function ObservationCaptureDialog({ open, onOpenChange, walkId, plant, zone, walkPurpose, currentUser, participants, observation, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; walkId: string; plant: string; zone: string; walkPurpose: string; currentUser: ReturnType<typeof useCurrentUser>; participants: string[]; observation: GembaObservation | null; onSaved: (observation: GembaObservation, createAction: boolean) => void;
}) {
  const [mode, setMode] = useState<CaptureMode>(observation ? "form" : "choose");
  const [type, setType] = useState<GembaObservationType>(observation?.type ?? "Positive");
  const [typeTouched, setTypeTouched] = useState(false);
  const [title, setTitle] = useState(observation?.title ?? "");
  const [description, setDescription] = useState(observation?.description ?? "");
  const [location, setLocation] = useState(observation?.location ?? zone);
  const [people, setPeople] = useState<string[]>(observation?.peopleInvolved ?? []);
  const [evidence, setEvidence] = useState<GembaEvidence[]>(observation?.evidence ?? []);
  const [voiceNote, setVoiceNote] = useState<GembaVoiceNote | undefined>(observation?.voiceNote);
  const [noActionReason, setNoActionReason] = useState(observation?.noActionReason ?? "");
  const [correctiveActionNeeded, setCorrectiveActionNeeded] = useState<boolean | undefined>(observation ? resolveGembaCorrectiveActionNeeded(observation) : undefined);
  const [createAction, setCreateAction] = useState(false);
  const [deploymentEnabled, setDeploymentEnabled] = useState(Boolean(observation?.horizontalDeployment?.enabled));
  const [targetZoneIds, setTargetZoneIds] = useState<string[]>(observation?.horizontalDeployment?.targetZoneIds ?? []);
  const [deploymentError, setDeploymentError] = useState("");
  const [more, setMore] = useState(Boolean(observation));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [previewEvidence, setPreviewEvidence] = useState<GembaEvidence | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<GembaEvidence | null>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const originalEvidenceIdsRef = useRef(new Set(observation?.evidence.map((item) => item.id) ?? []));
  const sessionStorageKeysRef = useRef(new Set<string>());
  const removedOriginalBlobsRef = useRef(new Map<string, Blob>());
  const organization = useOrganizationConfiguration();
  const sourcePlant = organization.plants.find((item) => item.name === plant || item.id === plant);
  const targetZones = organization.zones.filter((item) => item.status === "Active" && item.plantId === sourcePlant?.id && item.name !== zone && item.id !== zone);

  async function storeEvidenceFile(file: File, note?: string): Promise<GembaEvidence> {
    if (!isGembaPhotoStorageAvailable()) throw new Error("Photo storage is unavailable in this browser. Try a different browser or continue without a photo.");
    const optimized = await optimizeEvidenceImageToBlob(file);
    const id = `GEM-EV-${crypto.randomUUID()}`;
    await saveGembaPhoto(id, optimized.blob);
    sessionStorageKeysRef.current.add(id);
    return { id, storageKey: id, name: file.name, url: URL.createObjectURL(optimized.blob), mimeType: optimized.mimeType, size: optimized.size, note, uploadedAt: new Date().toISOString(), uploadedBy: currentUser.name };
  }

  async function addEvidence(files: FileList | null) {
    if (!files) return;
    setError(""); setBusy(true);
    try {
      const selected = Array.from(files).slice(0, Math.max(0, MAX_EVIDENCE_IMAGES - evidence.length));
      if (!selected.length) throw new Error(`Maximum ${MAX_EVIDENCE_IMAGES} photos allowed.`);
      const next: GembaEvidence[] = [];
      try {
        for (const file of selected) next.push(await storeEvidenceFile(file));
      } catch (caught) {
        await Promise.allSettled(next.map((item) => item.storageKey ? deleteGembaPhoto(item.storageKey) : Promise.resolve()));
        for (const item of next) {
          if (item.storageKey) sessionStorageKeysRef.current.delete(item.storageKey);
          if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
        }
        throw caught;
      }
      setEvidence((items) => [...items, ...next]);
      setEvidenceError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add this image."); }
    finally { setBusy(false); }
  }

  async function deleteEvidenceAsset(item: GembaEvidence) {
    if (!item.storageKey) return;
    if (originalEvidenceIdsRef.current.has(item.id)) {
      const blob = await getGembaPhoto(item.storageKey);
      if (!blob) throw new Error("The existing photo could not be found. It was left attached.");
      await deleteGembaPhoto(item.storageKey);
      removedOriginalBlobsRef.current.set(item.storageKey, blob);
    } else {
      await deleteGembaPhoto(item.storageKey);
      sessionStorageKeysRef.current.delete(item.storageKey);
    }
  }

  async function removeEvidence(item: GembaEvidence) {
    setError(""); setBusy(true);
    try {
      await deleteEvidenceAsset(item);
      setEvidence((items) => items.filter((candidate) => candidate.id !== item.id));
      if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to remove this photo. It remains attached."); }
    finally { setBusy(false); }
  }

  async function replaceEvidence(item: GembaEvidence, file: File) {
    setError(""); setBusy(true);
    let replacement: GembaEvidence | null = null;
    try {
      // Confirm the replacement Blob exists before touching the current asset.
      replacement = await storeEvidenceFile(file, item.note);
      await deleteEvidenceAsset(item);
      setEvidence((items) => items.map((candidate) => candidate.id === item.id ? replacement! : candidate));
      if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      setEvidenceError("");
    } catch (caught) {
      if (replacement?.storageKey) {
        await deleteGembaPhoto(replacement.storageKey).catch(() => {});
        sessionStorageKeysRef.current.delete(replacement.storageKey);
      }
      if (replacement?.url?.startsWith("blob:")) URL.revokeObjectURL(replacement.url);
      setError(caught instanceof Error ? caught.message : "Unable to replace this photo. The existing photo remains attached.");
    } finally { setBusy(false); }
  }

  function beginReplace(item: GembaEvidence) {
    replaceTargetRef.current = item;
    replaceRef.current?.click();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      for (const key of sessionStorageKeysRef.current) void deleteGembaPhoto(key).catch(() => {});
      for (const [key, blob] of removedOriginalBlobsRef.current) void saveGembaPhoto(key, blob).catch((error) => console.error(`[gemba] failed to restore photo ${key}`, error));
    }
    onOpenChange(nextOpen);
  }

  function selectType(next: GembaObservationType) {
    setType(next);
    setTypeTouched(true);
    if (next === "Positive") { setCreateAction(false); setCorrectiveActionNeeded(undefined); }
    if (next !== "Issue") setEvidenceError("");
  }

  function submit() {
    setError(""); setEvidenceError(""); setDeploymentError("");
    if (!title.trim()) { setError("Add a short observation title."); return; }
    if (isEvidencePhotoRequired(type) && evidence.length === 0) {
      setEvidenceError("Photo evidence is required for an Issue. Take or upload a photo before saving.");
      evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const validTargetZoneIds = targetZoneIds.filter((id) => targetZones.some((item) => item.id === id));
    if (deploymentEnabled && validTargetZoneIds.length === 0) { setDeploymentError("Select at least one other target zone."); return; }
    const saved = saveGembaObservation(walkId, { type, title: title.trim(), description: description.trim() || title.trim(), location: location.trim() || zone, peopleInvolved: people, evidence, voiceNote, correctiveActionNeeded: type === "Positive" ? undefined : observation?.actionId ? true : correctiveActionNeeded, noActionReason: type !== "Positive" && correctiveActionNeeded === false && !observation?.actionId ? noActionReason.trim() || undefined : undefined, horizontalDeployment: { enabled: deploymentEnabled, targetZoneIds: validTargetZoneIds } }, currentUser, observation?.id);
    if (!saved) { setError("Unable to save this observation locally. Please try again."); return; }
    sessionStorageKeysRef.current.clear();
    removedOriginalBlobsRef.current.clear();
    onSaved(saved, createAction && type !== "Positive" && !saved.actionId);
  }

  const evidenceFull = evidence.length >= MAX_EVIDENCE_IMAGES;
  const header = mode === "choose"
    ? { title: "Add Observation", description: "Choose how you'd like to capture this observation." }
    : mode === "voice"
      ? { title: "Add Observation", description: "Tell us what you observed" }
      : { title: observation ? "Edit Observation" : "Add Observation", description: "Capture the essential detail now. Everything else is optional." };

  return <><Dialog open={open} onOpenChange={handleOpenChange}><DialogContent className="flex max-h-[94dvh] w-full flex-col gap-0 overflow-hidden p-5 sm:max-h-[90vh] sm:max-w-[94vw] sm:p-8 lg:max-w-[min(1024px,calc(100vw-64px))]">
    <DialogHeader className="shrink-0 pb-4 sm:pb-5"><DialogTitle>{header.title}</DialogTitle><DialogDescription>{header.description}</DialogDescription></DialogHeader>

    <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 sm:-mx-8 sm:px-8">
      {mode === "choose" && <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 py-2 sm:grid-cols-2">
        <button type="button" onClick={() => setMode("form")} className="group flex min-h-48 flex-col justify-between gap-4 rounded-xl border bg-background p-6 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring">
          <div>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground"><Pencil className="size-5" /></span>
            <p className="mt-4 text-base font-semibold">Enter manually</p>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">Fill in the observation details yourself.</p>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">Start manually<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></p>
        </button>
        <button type="button" onClick={() => setMode("voice")} className="group flex min-h-48 flex-col justify-between gap-4 rounded-xl border bg-background p-6 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring">
          <div>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary"><Mic className="size-5" /></span>
            <p className="mt-4 text-base font-semibold">Use voice</p>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">Describe what you see. AI will fill the form.</p>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">Start recording<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></p>
        </button>
      </div>}

      {mode === "voice" && <div className="mx-auto w-full max-w-sm py-2">
        <VoiceCaptureFlow
          selectedType={type}
          context={{ plant, zone, walkPurpose }}
          currentUserName={currentUser.name}
          onCancel={() => setMode("choose")}
          onComplete={(result) => {
            if (result.title) setTitle(result.title);
            if (result.description) setDescription(result.description);
            if (result.location) setLocation(result.location);
            if (result.type && !typeTouched) setType(result.type);
            if (result.voiceNote) setVoiceNote(result.voiceNote);
            if (result.notice) setFormNotice(result.notice);
            setMore(true);
            setMode("form");
          }}
        />
      </div>}

      {mode === "form" && <div className="grid gap-5 pb-1 sm:gap-6">
        {formNotice && <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-800 dark:text-amber-300"><AlertTriangle className="size-3.5 shrink-0" /><span>{formNotice}</span></div>}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {TYPES.map((item) => <button key={item.id} type="button" onClick={() => selectType(item.id)} className={cn("flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-24 sm:gap-1.5", type === item.id ? cn("border-current", OBSERVATION_TYPE_STYLE[item.id].soft) : "bg-background hover:bg-muted/30")}>
            <item.icon className={cn("size-5", type === item.id ? OBSERVATION_TYPE_STYLE[item.id].text : "text-muted-foreground")} />
            <span className="text-xs font-semibold sm:text-sm">{item.id}</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">{item.hint}</span>
          </button>)}
        </div>

        <Field label="Short Title *"><Input autoFocus className="h-11" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === "Positive" ? "What is working well?" : type === "Issue" ? "What needs attention?" : "What could be improved?"} /></Field>

        <div ref={evidenceRef} className="rounded-xl border p-3 sm:p-5">
          <p className="text-sm font-semibold">Evidence {isEvidencePhotoRequired(type) ? <span className="font-normal text-muted-foreground">· Photo required for issues</span> : <span className="font-normal text-muted-foreground">(optional)</span>}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Add a photo to support this observation.</p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
            <EvidenceActionCard icon={Camera} label="Take Photo" description="Use your camera" disabled={evidenceFull} onClick={() => cameraRef.current?.click()} />
            <EvidenceActionCard icon={ImagePlus} label="Upload Photo" description="Choose from device" disabled={evidenceFull} onClick={() => uploadRef.current?.click()} />
          </div>
          <input ref={uploadRef} hidden type="file" accept="image/*" multiple onChange={(event) => { void addEvidence(event.target.files); event.target.value = ""; }} />
          <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => { void addEvidence(event.target.files); event.target.value = ""; }} />
          <input ref={replaceRef} hidden type="file" accept="image/*" onChange={(event) => { const target = replaceTargetRef.current; const file = event.target.files?.[0]; if (target && file) void replaceEvidence(target, file); replaceTargetRef.current = null; event.target.value = ""; }} />

          {evidenceError && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-xs leading-5 text-red-700 dark:text-red-400">{evidenceError}</p>}

          {(evidence.length > 0 || voiceNote) && <div className="mt-4 grid gap-3 border-t pt-4">
            {evidence.length > 0 && <div>
              <p className="text-xs font-medium text-muted-foreground">Photo{evidence.length === 1 ? "" : "s"} · {evidence.length} attached</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {evidence.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border bg-muted">
                  <button type="button" onClick={() => setPreviewEvidence(item)} className="block aspect-[4/3] w-full overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`View ${item.name}`}><GembaEvidenceImage evidence={item} className="size-full object-cover" /></button>
                  <input value={item.note ?? ""} onChange={(event) => setEvidence((items) => items.map((candidate) => candidate.id === item.id ? { ...candidate, note: event.target.value } : candidate))} className="h-8 w-full border-0 border-t bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-inset focus:ring-ring" placeholder="Add note" aria-label={`Note for ${item.name}`} />
                  <div className="grid grid-cols-3 border-t bg-background">
                    <button type="button" onClick={() => setPreviewEvidence(item)} className="flex min-h-9 items-center justify-center gap-1 text-[11px] font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Eye className="size-3" />View</button>
                    <button type="button" onClick={() => beginReplace(item)} disabled={busy} className="flex min-h-9 items-center justify-center gap-1 border-x text-[11px] font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"><RefreshCw className="size-3" />Replace</button>
                    <button type="button" onClick={() => void removeEvidence(item)} disabled={busy} className="flex min-h-9 items-center justify-center gap-1 text-[11px] font-medium text-destructive hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"><Trash2 className="size-3" />Remove</button>
                  </div>
                </div>)}
              </div>
            </div>}
            {voiceNote && <VoiceNoteAttachment voiceNote={voiceNote} onRemove={() => setVoiceNote(undefined)} />}
          </div>}
        </div>

        {type !== "Positive" && <div className={cn("rounded-lg border p-3", type === "Issue" ? "border-red-500/25 bg-red-500/[0.045]" : "bg-muted/[0.12]")}><p className="text-sm font-medium">Corrective Action Needed?</p><p className="mt-0.5 text-[11px] text-muted-foreground">Choose whether this observation requires tracked follow-up in the shared Action Center.</p><div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" variant={correctiveActionNeeded === true ? "default" : "outline"} disabled={Boolean(observation?.actionId)} onClick={() => { setCorrectiveActionNeeded(true); setCreateAction(true); setNoActionReason(""); }}>Yes</Button><Button type="button" variant={correctiveActionNeeded === false ? "default" : "outline"} disabled={Boolean(observation?.actionId)} onClick={() => { setCorrectiveActionNeeded(false); setCreateAction(false); setMore(true); }}>No</Button></div>{observation?.actionId && <p className="mt-2 text-[11px] text-muted-foreground">Yes — Action {observation.actionId} is already linked and will not be removed.</p>}{correctiveActionNeeded === true && !observation?.actionId && <p className="mt-2 text-[11px] text-muted-foreground">The canonical Action form will open after this observation is saved.</p>}</div>}

        <div className="rounded-xl border bg-muted/[0.08] p-3 sm:p-4">
          <label className="flex cursor-pointer items-start gap-3"><Checkbox checked={deploymentEnabled} onCheckedChange={(checked) => { const enabled = checked === true; setDeploymentEnabled(enabled); if (!enabled) setTargetZoneIds([]); setDeploymentError(""); }} /><span><span className="block text-sm font-medium">Deployment Opportunity at other Zones</span><span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">Share this observation with selected zone leaders for review. No duplicate observation or follow-up record is created.</span></span></label>
          {deploymentEnabled && <div className="mt-4 border-t pt-4"><p className="text-xs font-semibold">Target Zones *</p>{targetZones.length > 0 ? <div className="mt-2 grid gap-1 rounded-lg border bg-background p-2 sm:grid-cols-2 lg:grid-cols-3">{targetZones.map((item) => <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted/40"><Checkbox checked={targetZoneIds.includes(item.id)} onCheckedChange={(checked) => { setTargetZoneIds((current) => checked === true ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id)); setDeploymentError(""); }} /><span className="font-medium">{formatGembaZoneLabel(item.name)}</span></label>)}</div> : <p className="mt-2 text-xs text-muted-foreground">No other active zones are available for this plant.</p>}{deploymentError && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">{deploymentError}</p>}</div>}
        </div>

        <button type="button" onClick={() => setMore((value) => !value)} className="flex min-h-10 items-center justify-between border-y py-2 text-sm font-medium"><span>Additional details <span className="font-normal text-muted-foreground">(optional)</span></span><ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} /></button>
        {more && <div className="grid gap-4">
          <p className="text-xs text-muted-foreground sm:-mt-2">Add location, description and other supporting information.</p>
          <Field label="Description"><Textarea className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context the team will need later..." /></Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Area / Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={`${zone} area or workstation`} /></Field>
            {type !== "Positive" && correctiveActionNeeded === false && !observation?.actionId && <Field label="Reason corrective action is not required (optional)"><Input value={noActionReason} onChange={(event) => setNoActionReason(event.target.value)} placeholder="e.g. Corrected immediately during the walk" /></Field>}
          </div>
          {participants.length > 0 && <Field label="People Involved"><div className="grid gap-1 rounded-lg border p-2 sm:grid-cols-2 lg:grid-cols-3">{participants.map((name) => <label key={name} className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted/40"><Checkbox checked={people.includes(name)} onCheckedChange={(checked) => setPeople((current) => checked === true ? [...current, name] : current.filter((item) => item !== name))} />{name}</label>)}</div></Field>}
        </div>}
        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>}
    </div>

    {mode !== "choose" && <DialogFooter className="shrink-0 sm:-mx-8 sm:-mb-8 sm:p-8">
      <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
      {mode === "form" && <Button onClick={submit} disabled={!title.trim() || busy}>{busy ? "Processing..." : observation ? "Save Changes" : "Save Observation"}</Button>}
    </DialogFooter>}
  </DialogContent></Dialog>
    <GembaEvidenceLightbox evidence={previewEvidence} onOpenChange={(nextOpen) => !nextOpen && setPreviewEvidence(null)} />
  </>;
}

function EvidenceActionCard({ icon: Icon, label, description, onClick, disabled }: { icon: LucideIcon; label: string; description: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-background px-2 py-3 text-center outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-20 sm:gap-1">
    <Icon className="size-5 text-muted-foreground" />
    <span className="text-xs font-semibold">{label}</span>
    <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">{description}</span>
  </button>;
}

function VoiceNoteAttachment({ voiceNote, onRemove }: { voiceNote: GembaVoiceNote; onRemove: () => void }) {
  return <div>
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Mic className="size-3.5" />Voice note · <Check className="size-3 text-emerald-600 dark:text-emerald-400" />{voiceNote.durationSeconds}s attached</p>
      <button type="button" onClick={onRemove} className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Remove voice note"><X className="size-3.5" /></button>
    </div>
    <div className="mt-2 rounded-lg border bg-muted/[0.18] p-3">
      {voiceNote.audioUrl ? <audio controls src={voiceNote.audioUrl} className="h-8 w-full"><track kind="captions" /></audio> : <p className="text-xs text-muted-foreground">Playback is unavailable in this session.</p>}
      {voiceNote.transcript && <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">&quot;{voiceNote.transcript}&quot;</p>}
    </div>
  </div>;
}

function toLinkedContext(walk: GembaWalk, observation: GembaObservation): LinkedActionContext {
  const evidence: MyActionEvidence[] = observation.evidence.map((item) => ({ id: item.id, evidenceType: "finding", name: item.name, type: "image", mimeType: item.mimeType, uploadedAt: item.uploadedAt, uploadedBy: item.uploadedBy, url: item.url?.startsWith("blob:") || item.url?.startsWith("data:") ? undefined : item.url }));
  return { source: "Gemba", sourceModule: "gemba", sourceId: walk.id, sourceObservationId: observation.id, sourceObservation: observation.title, title: observation.type === "Issue" ? `Resolve: ${observation.title}` : `Improve: ${observation.title}`, description: observation.description, plant: walk.plant, zone: walk.zone, location: observation.location, evidence, defaultPriority: observation.type === "Opportunity" ? "Low" : undefined, hidePriority: observation.type === "Opportunity" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-1.5 text-sm font-medium">{label}{children}</label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-medium">{value}</p></div>; }
function Count({ label, value, type }: { label: string; value: number; type?: GembaObservationType }) { return <div className="rounded-lg border bg-card p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-semibold tabular-nums", type && (type === "Positive" ? "text-emerald-600 dark:text-emerald-400" : type === "Issue" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"))}>{value}</p></div>; }
function formatDateTime(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not recorded"; }
