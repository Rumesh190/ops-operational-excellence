"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Footprints, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { linkTopicFollowUp } from "@/features/visual-management/visual-management-store";
import { useCurrentUser } from "@/lib/current-user";
import { toLocalInputDate, useFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { createGembaWalk } from "./gemba-store";

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
  const [scheduledDate, setScheduledDate] = useState(toLocalInputDate(new Date()));
  const [purpose, setPurpose] = useState(searchParams.get("title") ? `Follow up: ${searchParams.get("title")}` : "");
  const [notes, setNotes] = useState(() => { const value = searchParams.get("description") ?? ""; return meetingReference ? `${value}\n\nRequested by Visual Management meeting ${meetingReference}.` : value; });
  const [error, setError] = useState("");
  const zone = useMemo(() => zoneConfiguration.find((item) => item.name === zoneName) ?? initialZone, [initialZone, zoneConfiguration, zoneName]);

  function changeZone(value: string) { setZoneName(value); setParticipantIds([]); }
  function toggleParticipant(id: string, checked: boolean) { setParticipantIds((current) => checked ? [...current, id] : current.filter((item) => item !== id)); }

  function submit(startNow: boolean) {
    setError("");
    if (!allowed) { setError("Your current role cannot start a Gemba walk."); return; }
    if (!purpose.trim()) { setError("Add a clear purpose or focus for this walk."); return; }
    if (!zone) { setError("Select an active Zone."); return; }
    const participants = zone.members.filter((member) => participantIds.includes(member.id));
    const walk = createGembaWalk({ plant: currentPlant, zone: zone.name, leadId: currentUser.id, leadName: currentUser.name, participants, purpose: purpose.trim(), notes: notes.trim() || undefined, scheduledDate }, currentUser, startNow);
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
          <Field label="Zone *"><Select value={zoneName} onValueChange={(value) => changeZone(value ?? initialZone?.name ?? "")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{zoneConfiguration.map((item) => <SelectItem key={item.name} value={item.name}>{item.name} · {item.department}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Walk Lead"><Input value={`${currentUser.name} · Logged in user`} disabled /></Field>
          <Field label="Date *"><Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></Field>
        </div>
        <Field label="Purpose / Focus *"><Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="e.g. Observe material flow and operator motion" /></Field>
        <Field label="Participants"><div className="grid gap-2 rounded-lg border bg-muted/[0.12] p-3 sm:grid-cols-2 lg:grid-cols-3">{zone?.members.map((member) => <label key={member.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted/50"><Checkbox checked={participantIds.includes(member.id)} onCheckedChange={(checked) => toggleParticipant(member.id, checked === true)} /><span className="min-w-0"><span className="block truncate font-medium">{member.name}</span><span className="block text-[11px] text-muted-foreground">{member.role}</span></span></label>)}</div><span className="text-[11px] font-normal text-muted-foreground">{participantIds.length ? `${participantIds.length} participant${participantIds.length === 1 ? "" : "s"} selected` : "Participants can also be added when the team joins the walk."}</span></Field>
        <Field label="Optional Notes"><Textarea className="min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Shift, process context, or anything the team should know..." /></Field>
        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => submit(false)}><Save className="size-4" />Save Draft</Button><Button onClick={() => submit(true)}><Footprints className="size-4" />Start Walk</Button></div>
      </CardContent>
    </Card>}
  </PageContainer>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium">{label}{children}</label>;
}
