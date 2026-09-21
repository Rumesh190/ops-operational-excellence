"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Footprints, Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { linkTopicFollowUp } from "@/features/visual-management/visual-management-store";
import { useCurrentUser } from "@/lib/current-user";
import { toLocalInputDate, useFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { cn } from "@/lib/utils";
import { formatGembaZoneLabel } from "./gemba-zone-labels";
import { createGembaWalk } from "./gemba-store";
import type { GembaParticipant } from "./types";

type CaptureMode = "now" | "schedule";

export default function GembaNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const zoneConfiguration = useFiveSZoneConfiguration();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const currentPlant = adminUser?.plant ?? currentUser.plant;
  const allowed = !currentUser.isSuperAdmin && Boolean(adminUser?.roles.some((role) => role === "Admin" || role === "Auditor"));
  const meetingReference = searchParams.get("meetingId");
  const initialZone = zoneConfiguration.find((zone) => zone.name === searchParams.get("zone")) ?? zoneConfiguration.find((zone) => zone.name === currentUser.primaryZone) ?? zoneConfiguration[0];
  const [zoneName, setZoneName] = useState(initialZone?.name ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [outsideParticipants, setOutsideParticipants] = useState<GembaParticipant[]>([]);
  const [outsidePickerOpen, setOutsidePickerOpen] = useState(false);
  const [outsideSearch, setOutsideSearch] = useState("");
  const [mode, setMode] = useState<CaptureMode>("now");
  const [scheduledDate, setScheduledDate] = useState(toLocalInputDate(new Date()));
  const [scheduledTime, setScheduledTime] = useState("");
  const [purpose, setPurpose] = useState(searchParams.get("title") ? `Follow up: ${searchParams.get("title")}` : "");
  const [notes, setNotes] = useState(() => { const value = searchParams.get("description") ?? ""; return meetingReference ? `${value}\n\nRequested by Visual Management meeting ${meetingReference}.` : value; });
  const [error, setError] = useState("");
  const zone = useMemo(() => zoneConfiguration.find((item) => item.name === zoneName) ?? initialZone, [initialZone, zoneConfiguration, zoneName]);

  const outsideCandidates = useMemo(() => {
    const query = outsideSearch.trim().toLowerCase();
    return adminUsers.filter((user) =>
      user.status === "Active"
      && user.id !== currentUser.id
      && !zone?.members.some((member) => member.id === user.id)
      && !outsideParticipants.some((person) => person.id === user.id)
      && (!query || user.name.toLowerCase().includes(query))
    );
  }, [adminUsers, currentUser.id, outsideParticipants, outsideSearch, zone]);

  function changeZone(value: string) {
    setZoneName(value);
    setParticipantIds([]);
    // Outside-zone participants are intentionally kept — switching the walk's
    // own zone must not silently drop people already added from elsewhere.
  }
  function toggleParticipant(id: string, checked: boolean) { setParticipantIds((current) => checked ? [...current, id] : current.filter((item) => item !== id)); }

  function addOutsideParticipant(userId: string) {
    const user = adminUsers.find((item) => item.id === userId);
    if (!user) return;
    const homeZone = user.zoneMemberships[0]?.zone;
    setOutsideParticipants((current) => current.some((person) => person.id === user.id) ? current : [...current, { id: user.id, name: user.name, role: user.roles[0] ?? "Zone Member", homeZone }]);
    setOutsideSearch("");
  }
  function removeOutsideParticipant(id: string) { setOutsideParticipants((current) => current.filter((person) => person.id !== id)); }

  function submit() {
    setError("");
    if (!allowed) { setError("Your current role cannot start a Gemba walk."); return; }
    if (!purpose.trim()) { setError("Add a clear purpose or focus for this walk."); return; }
    if (!zone) { setError("Select an active Zone."); return; }
    if (mode === "schedule") {
      if (!scheduledDate || !scheduledTime) { setError("Add a schedule date and time to schedule this walk."); return; }
      if (new Date(`${scheduledDate}T${scheduledTime}`).getTime() <= Date.now()) { setError("Scheduled date and time must be in the future."); return; }
    }
    const zoneParticipants: GembaParticipant[] = zone.members.filter((member) => participantIds.includes(member.id)).map((member) => ({ id: member.id, name: member.name, role: member.role }));
    const participants = [...zoneParticipants, ...outsideParticipants];
    const startNow = mode === "now";
    const walk = createGembaWalk({ plant: currentPlant, zone: zone.name, leadId: currentUser.id, leadName: currentUser.name, participants, purpose: purpose.trim(), notes: notes.trim() || undefined, scheduledDate: startNow ? toLocalInputDate(new Date()) : scheduledDate, scheduledTime: startNow ? undefined : scheduledTime }, currentUser, startNow);
    if (!walk) { setError("The walk could not be saved. Browser storage may be full."); return; }
    const sourceTopicId = searchParams.get("topicId");
    if (meetingReference && sourceTopicId) linkTopicFollowUp(sourceTopicId, "Gemba", walk.id);
    router.push(startNow ? `/gemba/${walk.id}/walk` : `/gemba/${walk.id}`);
  }

  return <PageContainer className="max-w-5xl">
    <FiveSPageHeader eyebrow={meetingReference ? `Visual Management / ${meetingReference}` : "Gemba"} title="Start a Gemba Walk" description={meetingReference ? "Meeting context has been carried into the Gemba follow-up." : "Set the area and focus, invite the people closest to the work, then begin observing."} leading={<Button size="icon-sm" variant="ghost" onClick={() => router.push(meetingReference ? `/visual-management/meetings/${meetingReference}` : "/gemba")} aria-label="Back to Gemba"><ArrowLeft className="size-4" /></Button>} />
    {!allowed ? <Card><CardContent className="grid min-h-60 place-items-center p-6 text-center"><div><p className="text-sm font-semibold">Conduct access required</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Admins and authorized auditors can start walks. Zone users can participate and view walks for their area.</p><Button className="mt-4" variant="outline" onClick={() => router.push("/gemba")}>Return to Gemba</Button></div></CardContent></Card> : <Card className="gap-0 overflow-hidden">
      <CardHeader className="border-b bg-muted/[0.16] pb-4"><CardTitle className="text-base">Walk setup</CardTitle><p className="text-xs text-muted-foreground">This setup stays intentionally short for use on the floor.</p></CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plant"><Input value={currentPlant} disabled /></Field>
          <Field label="Zone *"><Select value={zoneName} onValueChange={(value) => changeZone(value ?? initialZone?.name ?? "")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{zoneConfiguration.map((item) => <SelectItem key={item.name} value={item.name}>{formatGembaZoneLabel(item.name)}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Walk Lead"><Input value={`${currentUser.name} · Logged in user`} disabled /></Field>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">When *</p>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            <button type="button" onClick={() => setMode("now")} className={cn("min-h-11 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", mode === "now" ? "border-primary bg-primary/[0.08] text-primary" : "bg-background hover:bg-muted/30")}>Start now</button>
            <button type="button" onClick={() => setMode("schedule")} className={cn("min-h-11 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", mode === "schedule" ? "border-primary bg-primary/[0.08] text-primary" : "bg-background hover:bg-muted/30")}>Schedule</button>
          </div>
          {mode === "schedule" && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date *"><Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></Field>
            <Field label="Time *"><Input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} /></Field>
          </div>}
        </div>

        <Field label="Purpose / Focus *"><Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="e.g. Observe material flow and operator motion" /></Field>

        <div className="grid gap-2">
          <div className="flex items-center justify-between"><p className="text-sm font-medium">Participants</p><Button type="button" size="sm" variant="outline" onClick={() => setOutsidePickerOpen(true)}><Plus className="size-3.5" />Add other member</Button></div>
          <div className="grid gap-2 rounded-lg border bg-muted/[0.12] p-3 sm:grid-cols-2 lg:grid-cols-3">
            {zone?.members.map((member) => <label key={member.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted/50"><Checkbox checked={participantIds.includes(member.id)} onCheckedChange={(checked) => toggleParticipant(member.id, checked === true)} /><span className="min-w-0"><span className="block truncate font-medium">{member.name}</span><span className="block text-[11px] text-muted-foreground">{member.role}</span></span></label>)}
          </div>
          {outsideParticipants.length > 0 && <div className="grid gap-1.5 rounded-lg border border-dashed p-3">
            <p className="text-[11px] font-medium text-muted-foreground">From other zones</p>
            {outsideParticipants.map((person) => <div key={person.id} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-sm"><span className="min-w-0 truncate">{person.name}{person.homeZone && <span className="ml-1.5 text-[11px] text-muted-foreground">· {person.homeZone}</span>}</span><button type="button" onClick={() => removeOutsideParticipant(person.id)} className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`Remove ${person.name}`}><X className="size-3.5" /></button></div>)}
          </div>}
          <span className="text-[11px] font-normal text-muted-foreground">{participantIds.length + outsideParticipants.length ? `${participantIds.length + outsideParticipants.length} participant${participantIds.length + outsideParticipants.length === 1 ? "" : "s"} selected` : "Participants can also be added when the team joins the walk."}</span>
        </div>

        <Field label="Optional Notes"><Textarea className="min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Shift, process context, or anything the team should know..." /></Field>
        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">{mode === "schedule" ? <Button onClick={submit}><Save className="size-4" />Schedule Walk</Button> : <Button onClick={submit}><Footprints className="size-4" />Start Walk</Button>}</div>
      </CardContent>
    </Card>}

    <Dialog open={outsidePickerOpen} onOpenChange={setOutsidePickerOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add other member</DialogTitle><DialogDescription>Search registered OPS users from other zones to add them to this walk.</DialogDescription></DialogHeader>
      <Input autoFocus value={outsideSearch} onChange={(event) => setOutsideSearch(event.target.value)} placeholder="Search by name..." />
      <div className="grid max-h-64 gap-1 overflow-y-auto">
        {outsideCandidates.map((user) => <button key={user.id} type="button" onClick={() => addOutsideParticipant(user.id)} className="flex min-h-11 items-center justify-between gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0 truncate font-medium">{user.name}</span><span className="shrink-0 text-[11px] text-muted-foreground">{user.zoneMemberships[0]?.zone ?? "—"}</span></button>)}
        {outsideCandidates.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No matching users outside this zone.</p>}
      </div>
      <div className="flex justify-end"><Button variant="outline" onClick={() => setOutsidePickerOpen(false)}>Done</Button></div>
    </DialogContent></Dialog>
  </PageContainer>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium">{label}{children}</label>;
}
