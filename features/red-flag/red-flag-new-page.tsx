"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, ChevronDown, Link2, MapPin, Save, ShieldAlert } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreateLinkedActionDialog, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { linkTopicFollowUp } from "@/features/visual-management/visual-management-store";
import { useFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { useOrganizationConfiguration } from "@/lib/organization-store";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import { canRaiseRedFlag } from "./red-flag-access";
import { EvidencePicker, RED_FLAG_SEVERITY_CONFIG } from "./red-flag-components";
import { createRedFlag, linkRedFlagAction } from "./red-flag-store";
import { ACTIVE_RED_FLAG_SEVERITIES, type ActiveRedFlagSeverity, type RedFlag, type RedFlagEvidence } from "./types";

export default function RedFlagNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const zoneConfiguration = useFiveSZoneConfiguration();
  const organization = useOrganizationConfiguration();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const meetingReference = searchParams.get("meetingId");
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState(() => { const descriptionValue = searchParams.get("description") ?? ""; return meetingReference ? `${descriptionValue}\n\nRaised from Visual Management meeting ${meetingReference}.` : descriptionValue; });
  const [plant, setPlant] = useState(searchParams.get("plant") ?? (currentUser.plant === "All organizations" ? organization.plants[0]?.name ?? "" : adminUser?.plant ?? currentUser.plant));
  const [zone, setZone] = useState(searchParams.get("zone") ?? (currentUser.primaryZone.startsWith("Zone ") ? currentUser.primaryZone : "Zone A"));
  const [location, setLocation] = useState(searchParams.get("section") ? `${searchParams.get("section")} KPI review` : "");
  const [machineAsset, setMachineAsset] = useState("");
  const [severity, setSeverity] = useState<ActiveRedFlagSeverity | "">("");
  const [evidence, setEvidence] = useState<RedFlagEvidence[]>([]);
  const [immediateActionTaken, setImmediateActionTaken] = useState(false);
  const [containmentNote, setContainmentNote] = useState("");
  const [createActionWanted, setCreateActionWanted] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(meetingReference));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdFlag, setCreatedFlag] = useState<RedFlag | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const mayRaise = canRaiseRedFlag(adminUser, currentUser);

  const context: LinkedActionContext | null = createdFlag ? {
    source: "Red Flag", sourceModule: "redFlag", sourceId: createdFlag.id, sourceObservation: createdFlag.title,
    title: createdFlag.title, description: createdFlag.description || createdFlag.title, plant: createdFlag.plant, zone: createdFlag.zone, location: createdFlag.location || "Operational area",
    defaultPriority: createdFlag.severity,
    evidence: createdFlag.evidence.map((item) => ({ id: item.id, name: item.name, type: "image", mimeType: item.mimeType, uploadedAt: item.uploadedAt, uploadedBy: item.uploadedBy, url: item.url, evidenceType: "finding" })),
  } : null;

  function submit() {
    if (!mayRaise || busy) return;
    if (!title.trim()) { setError("Enter a short issue title."); return; }
    if (!severity) { setError("Select the severity."); return; }
    if (!plant || !zone) { setError("Select a plant and zone."); return; }
    if (immediateActionTaken && !containmentNote.trim()) { setAdvancedOpen(true); setError("Describe the immediate containment that was taken."); return; }
    setBusy(true);
    setError("");
    const flag = createRedFlag({ title, description: description || title, plant, zone, location: location || zone, machineAsset, severity, immediateActionTaken, containmentNote, evidence }, currentUser);
    setBusy(false);
    if (!flag) { setError("The Red Flag could not be saved. Check browser storage and try again."); return; }
    const sourceTopicId = searchParams.get("topicId");
    if (meetingReference && sourceTopicId) linkTopicFollowUp(sourceTopicId, "Red Flag", flag.id);
    if (!createActionWanted) { router.push(`/red-flag/${encodeURIComponent(flag.id)}`); return; }
    setCreatedFlag(flag);
    setActionDialogOpen(true);
  }

  if (!mayRaise) return <PageContainer><FiveSPageHeader eyebrow="OPS Workspace" title="Raise Red Flag" description="Capture an urgent operational issue." /><Card><CardContent className="grid min-h-48 place-items-center p-6 text-center"><div><ShieldAlert className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">You do not have permission to raise a Red Flag.</p><Button className="mt-4" variant="outline" nativeButton={false} render={<Link href="/red-flag" />}>Back to Red Flag</Button></div></CardContent></Card></PageContainer>;

  return <PageContainer className="red-flag-quick-capture max-w-4xl pb-20 sm:pb-0">
    <FiveSPageHeader eyebrow={meetingReference ? `Visual Management / ${meetingReference}` : "OPS Workspace"} title="Raise Red Flag" description={meetingReference ? "Meeting context has been carried into the Red Flag workflow." : "Capture the essential facts now. Details and evidence can be added later."} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={meetingReference ? `/visual-management/meetings/${meetingReference}` : "/red-flag"} />} aria-label="Back to Red Flag"><ArrowLeft className="size-4" /></Button>} />

    <Card className="gap-0 overflow-hidden border-red-500/15 dark:border-red-400/15">
      <CardHeader className="border-b bg-red-500/[0.025] pb-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"><Camera className="size-4" /></span><div><CardTitle className="text-base">Quick capture</CardTitle><p className="mt-1 text-xs text-muted-foreground">Title, severity, and a photo are enough to raise the issue.</p></div></div></CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <Field label="Issue title *"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs immediate attention?" maxLength={120} /></Field>
        <div><p className="mb-2 text-sm font-medium">Severity *</p><div className="grid grid-cols-3 gap-2">{ACTIVE_RED_FLAG_SEVERITIES.map((item) => <button key={item} type="button" onClick={() => setSeverity(item)} className={cn("flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring", severity === item ? RED_FLAG_SEVERITY_CONFIG[item].soft + " border-current" : "bg-background")}><span className={cn("size-2 rounded-full", RED_FLAG_SEVERITY_CONFIG[item].dot)} />{item}</button>)}</div>{severity && <p className="mt-2 text-[11px] text-muted-foreground">Response target: {severity === "High" ? "24 hours" : severity === "Medium" ? "72 hours" : "7 days"}.</p>}</div>
        <div><p className="mb-2 text-sm font-medium">Initial evidence</p><EvidencePicker items={evidence} onChange={setEvidence} group="initial" uploadedBy={currentUser.name} title="Add photos" /></div>
      </CardContent>
    </Card>

    <Card className="gap-0 overflow-hidden">
      <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left outline-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><MapPin className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Location and containment details</span><span className="mt-0.5 block text-xs text-muted-foreground">Plant, zone, description, asset, and immediate action</span></span><ChevronDown className={cn("size-4 text-muted-foreground transition-transform", advancedOpen && "rotate-180")} /></button>
      {advancedOpen && <CardContent className="grid gap-4 border-t p-4 sm:grid-cols-2 sm:p-5"><Field label="Plant *"><Select value={plant} onValueChange={(value) => setPlant(value ?? organization.plants[0]?.name ?? "")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{organization.plants.filter((item) => item.status === "Active").map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Zone *"><Select value={zone} onValueChange={(value) => setZone(value ?? zoneConfiguration[0]?.name ?? "")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{zoneConfiguration.map((item) => <SelectItem value={item.name} key={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Specific location"><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Line, station, aisle, or room" /></Field><Field label="Machine / Asset"><Input value={machineAsset} onChange={(event) => setMachineAsset(event.target.value)} placeholder="Optional asset ID" /></Field><Field label="Description" className="sm:col-span-2"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the condition, risk, and who or what may be affected." rows={4} /></Field><div className="sm:col-span-2"><button type="button" onClick={() => setImmediateActionTaken((value) => !value)} className={cn("flex w-full items-start gap-3 rounded-lg border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring", immediateActionTaken && "border-emerald-500/30 bg-emerald-500/[0.05]")}><span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-xs", immediateActionTaken ? "border-emerald-500 bg-emerald-500 text-white" : "border-input")}>{immediateActionTaken ? "✓" : ""}</span><span><span className="block text-sm font-medium">Immediate action taken?</span><span className="mt-0.5 block text-xs text-muted-foreground">Record isolation, barricading, clean-up, or another containment.</span></span></button>{immediateActionTaken && <Textarea className="mt-2" value={containmentNote} onChange={(event) => setContainmentNote(event.target.value)} placeholder="What was done immediately? *" rows={3} />}</div></CardContent>}
    </Card>

    <button type="button" onClick={() => setCreateActionWanted((value) => !value)} className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", createActionWanted && "border-primary/30 bg-primary/[0.035]")}><span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-xs", createActionWanted ? "border-primary bg-primary text-primary-foreground" : "border-input")}>{createActionWanted ? "✓" : ""}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold">Create a linked Action{severity === "High" ? <Badge variant="warning">Recommended for {severity}</Badge> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">The Red Flag context and evidence will be carried into the shared Action Center. You will choose the owner and due date next.</span></span><Link2 className="size-4 shrink-0 text-muted-foreground" /></button>

    {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}
    <div className="hidden justify-end gap-2 sm:flex"><Button variant="outline" nativeButton={false} render={<Link href="/red-flag" />}>Cancel</Button><Button onClick={submit} disabled={busy} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"><Save className="size-4" />{busy ? "Saving..." : createActionWanted ? "Save & Create Action" : "Raise Red Flag"}</Button></div>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:hidden"><Button onClick={submit} disabled={busy} className="h-11 w-full bg-red-600 text-white hover:bg-red-700"><ShieldAlert className="size-4" />{createActionWanted ? "Save & Create Action" : "Raise Red Flag"}</Button></div>

    <CreateLinkedActionDialog key={createdFlag?.id ?? "new-red-flag-action"} open={actionDialogOpen} onOpenChange={(open) => { setActionDialogOpen(open); if (!open && createdFlag) router.push(`/red-flag/${encodeURIComponent(createdFlag.id)}`); }} context={context} onCreated={(action) => { if (!createdFlag) return; linkRedFlagAction(createdFlag.id, action.id, currentUser); router.push(`/red-flag/${encodeURIComponent(createdFlag.id)}`); }} />
  </PageContainer>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("grid min-w-0 gap-1.5 text-sm font-medium", className)}>{label}{children}</label>;
}
