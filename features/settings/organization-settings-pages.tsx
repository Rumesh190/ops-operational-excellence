"use client";

import { useMemo, useState } from "react";
import { Building2, Edit3, Plus } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsFeedback } from "@/components/ops/ops-feedback";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { assignZoneLeader, renameUserPlantAssignments, setUserZoneMembership, useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";
import {
  type OrganizationPlant,
  type OrganizationZone,
  saveOrganizationPlant,
  saveOrganizationZone,
  useOrganizationConfiguration,
} from "@/lib/organization-store";

type Feedback = { tone: "success" | "error"; message: string } | null;

export function PlantSettingsPage() {
  const access = useSettingsAccess();
  const organization = useOrganizationConfiguration();
  const users = useAdminUsers();
  const currentUser = useCurrentUser();
  const [editing, setEditing] = useState<OrganizationPlant | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  if (!access.canManageConfiguration) return <Protected title="Plant" description="Manage manufacturing site information." />;

  return <PageContainer className="max-w-5xl">
    <FiveSPageHeader eyebrow="" title="Plant" description="Manage manufacturing site information." />
    {feedback && <OpsFeedback tone={feedback.tone} message={feedback.message} />}
    <div className="grid gap-4">
      {organization.plants.map((plant) => {
        const zoneCount = organization.zones.filter((zone) => zone.plantId === plant.id).length;
        const userCount = users.filter((user) => user.plant === plant.name && user.status === "Active").length;
        return <Card key={plant.id} className="overflow-hidden"><CardContent className="p-0">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary"><Building2 className="size-5" /></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold">{plant.name}</h2><Badge variant={plant.status === "Active" ? "success" : "muted"}>{plant.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{plant.description || "Manufacturing site"}</p></div>
            <Button variant="outline" size="sm" onClick={() => setEditing(plant)}><Edit3 className="size-4" />Edit Plant</Button>
          </div>
          <dl className="grid border-t bg-muted/[0.12] sm:grid-cols-2 lg:grid-cols-5">
            <Meta label="Plant Code" value={plant.code} mono />
            <Meta label="Location / City" value={plant.location || "—"} />
            <Meta label="Plant Manager" value={users.find((user) => user.id === plant.managerId)?.name ?? plant.managerName ?? "—"} />
            <Meta label="Zones" value={String(zoneCount)} />
            <Meta label="Active Users" value={String(userCount)} />
          </dl>
        </CardContent></Card>;
      })}
    </div>
    <PlantEditor key={editing?.id ?? "closed"} plant={editing} users={users.filter((user) => user.status === "Active" && !user.id.includes("SUPER-ADMIN"))} actorId={currentUser.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setFeedback({ tone: "success", message: "Plant updated successfully." }); }} onError={(message) => setFeedback({ tone: "error", message })} />
  </PageContainer>;
}

export function ZoneSettingsPage() {
  const access = useSettingsAccess();
  const organization = useOrganizationConfiguration();
  const users = useAdminUsers();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const [editing, setEditing] = useState<OrganizationZone | "new" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  if (!access.canManageConfiguration) return <Protected title="Zones" description="Manage plant zones, ownership, and members." />;

  return <PageContainer>
    <FiveSPageHeader eyebrow="" title="Zones" description="Manage plant zones, ownership, and members." actions={<Button onClick={() => setEditing("new")}><Plus className="size-4" />Add Zone</Button>} />
    {feedback && <OpsFeedback tone={feedback.tone} message={feedback.message} />}
    <Card className="overflow-hidden"><CardContent className="p-0">
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wide text-muted-foreground">{["Zone","Plant","Zone Leader","Members","Open Actions","Status","Actions"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{organization.zones.map((zone) => { const plant = organization.plants.find((item) => item.id === zone.plantId); const leader = users.find((user) => user.id === zone.leaderId)?.name ?? zone.leaderName; const members = users.filter((user) => user.zoneMemberships.some((membership) => membership.zone === zone.name && membership.responsibility !== "Leader")); const open = actions.filter((action) => action.area === zone.name && action.status !== "Completed").length; return <tr key={zone.id} className="border-b last:border-0"><td className="px-4 py-3"><p className="font-semibold">{zone.name}</p><p className="font-mono text-xs text-muted-foreground">{zone.code}</p></td><td className="px-4 py-3">{plant?.name ?? "—"}</td><td className="px-4 py-3">{leader}</td><td className="px-4 py-3">{members.length}</td><td className="px-4 py-3">{open}</td><td className="px-4 py-3"><Badge variant={zone.status === "Active" ? "success" : "muted"}>{zone.status}</Badge></td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setEditing(zone)}><Edit3 className="size-4" />Edit</Button></td></tr>; })}</tbody></table></div>
      <div className="grid gap-3 p-3 md:hidden">{organization.zones.map((zone) => { const plant = organization.plants.find((item) => item.id === zone.plantId); const leader = users.find((user) => user.id === zone.leaderId)?.name ?? zone.leaderName; const members = users.filter((user) => user.zoneMemberships.some((membership) => membership.zone === zone.name && membership.responsibility !== "Leader")); const open = actions.filter((action) => action.area === zone.name && action.status !== "Completed").length; return <div key={zone.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{zone.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{plant?.name} · {zone.code}</p></div><Badge variant={zone.status === "Active" ? "success" : "muted"}>{zone.status}</Badge></div><dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-3"><MiniMeta label="Leader" value={leader} /><MiniMeta label="Members" value={String(members.length)} /><MiniMeta label="Open Actions" value={String(open)} /></dl><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => setEditing(zone)}><Edit3 className="size-4" />Edit Zone</Button></div>; })}</div>
    </CardContent></Card>
    <ZoneEditor key={typeof editing === "string" ? editing : editing?.id ?? "closed"} zone={editing} plants={organization.plants} zones={organization.zones} users={users} actorId={currentUser.id} onClose={() => setEditing(null)} onSaved={(leaderChanged) => { setEditing(null); setFeedback({ tone: "success", message: leaderChanged ? "Zone Leader changed. New assignments and escalations now use the updated leader." : "Zone updated." }); }} onError={(message) => setFeedback({ tone: "error", message })} />
  </PageContainer>;
}

function PlantEditor({ plant, users, actorId, onClose, onSaved, onError }: { plant: OrganizationPlant | null; users: ReturnType<typeof useAdminUsers>; actorId: string; onClose: () => void; onSaved: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState<OrganizationPlant | null>(plant);
  if (!form) return null;
  const currentForm = form;
  function save() { try { const manager = users.find((user) => user.id === currentForm.managerId); const saved = saveOrganizationPlant({ ...currentForm, managerName: manager?.name ?? currentForm.managerName }); if (!saved) throw new Error("Could not save organization changes."); if (!renameUserPlantAssignments(plant?.name ?? saved.name, saved.name, actorId)) throw new Error("Plant was saved, but user assignments could not be updated."); onSaved(); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not save organization changes."); } }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Plant</DialogTitle><DialogDescription>Changes affect current and future configuration. Historical Audit IDs remain unchanged.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Plant Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Plant Code"><Input value={form.code} disabled={form.codeLocked} onChange={(event) => setForm({ ...form, code: event.target.value })} /><Help>{form.codeLocked ? "Locked because this code is used by historical Audit IDs." : "Required for generated identifiers."}</Help></Field><Field label="Location / City"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field><Field label="Plant Manager"><Select value={form.managerId} onValueChange={(value) => setForm({ ...form, managerId: value ?? "" })}><SelectTrigger className="w-full"><SelectValue placeholder="Select manager" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: (value ?? "Active") as OrganizationPlant["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></Field><Field label="Description" className="sm:col-span-2"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save Changes</Button></DialogFooter></DialogContent></Dialog>;
}

function ZoneEditor({ zone, plants, zones, users, actorId, onClose, onSaved, onError }: { zone: OrganizationZone | "new" | null; plants: OrganizationPlant[]; zones: OrganizationZone[]; users: ReturnType<typeof useAdminUsers>; actorId: string; onClose: () => void; onSaved: (leaderChanged: boolean) => void; onError: (message: string) => void }) {
  const initial = useMemo<OrganizationZone | null>(() => zone === "new" ? { id: `ZONE-${crypto.randomUUID()}`, name: "", code: "", plantId: plants[0]?.id ?? "", leaderId: "", leaderName: "", department: "Production", status: "Active", description: "" } : zone, [plants, zone]);
  const [form, setForm] = useState(initial);
  const [memberIds, setMemberIds] = useState<string[]>(() => zone && zone !== "new" ? users.filter((user) => user.zoneMemberships.some((membership) => membership.zone === zone.name)).map((user) => user.id) : []);
  const [confirmLeader, setConfirmLeader] = useState(false);
  const activeUsers = users.filter((user) => user.status === "Active" && !user.id.includes("SUPER-ADMIN") && !zones.some((item) => item.id !== (zone === "new" ? "" : zone?.id) && item.leaderId === user.id));
  if (!form) return null;
  const currentForm = form;
  const leaderChanged = zone !== "new" && zone?.leaderId !== currentForm.leaderId;
  function requestSave() { if (!currentForm.name.trim()) { onError("Zone must have a name."); return; } if (!currentForm.leaderId || !activeUsers.some((user) => user.id === currentForm.leaderId)) { onError("Zone Leader must be an active user."); return; } if (leaderChanged) setConfirmLeader(true); else commit(); }
  function commit() { try { const leader = activeUsers.find((user) => user.id === currentForm.leaderId)!; if (zone && zone !== "new" && leaderChanged && !assignZoneLeader(zone.id, leader.id, actorId)) throw new Error("Could not update Zone Leader."); const saved = saveOrganizationZone({ ...currentForm, leaderName: leader.name }); if (!saved) throw new Error("Could not save organization changes."); if (!assignZoneLeader(saved.id, leader.id, actorId)) throw new Error("Could not update Zone Leader."); const desired = new Set([...memberIds, leader.id]); const previousName = zone && zone !== "new" ? zone.name : saved.name; for (const user of users) { const belongs = user.zoneMemberships.some((membership) => membership.zone === saved.name || membership.zone === previousName); const belongsToSavedName = user.zoneMemberships.some((membership) => membership.zone === saved.name); if (user.id !== leader.id && desired.has(user.id) && !belongsToSavedName) setUserZoneMembership(user.id, saved.name, actorId); if (user.id !== leader.id && !desired.has(user.id) && belongs) setUserZoneMembership(user.id, undefined, actorId); } onSaved(leaderChanged); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not save organization changes."); } finally { setConfirmLeader(false); } }
  return <><Dialog open={Boolean(zone)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[calc(100dvh-1rem)] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{zone === "new" ? "Add Zone" : `Edit ${zone?.name}`}</DialogTitle><DialogDescription>Manage ownership and current membership. Historical records keep their original names and owners.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Zone Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Zone Code"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field><Field label="Plant"><Select value={form.plantId} onValueChange={(value) => setForm({ ...form, plantId: value ?? "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{plants.filter((plant) => plant.status === "Active").map((plant) => <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Zone Leader"><Select value={form.leaderId} onValueChange={(value) => setForm({ ...form, leaderId: value ?? "" })}><SelectTrigger><SelectValue placeholder="Select an active user" /></SelectTrigger><SelectContent>{activeUsers.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: (value ?? "Active") as OrganizationZone["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></Field><Field label="Description / Area"><Input value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div><div><Label>Members</Label><p className="mt-1 text-xs text-muted-foreground">Selecting a member here moves them from their previous Zone. Removing them does not delete their account.</p><div className="mt-3 grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">{activeUsers.filter((user) => user.id !== form.leaderId).map((user) => <label key={user.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/40"><Checkbox checked={memberIds.includes(user.id)} onCheckedChange={(checked) => setMemberIds((current) => checked ? [...new Set([...current, user.id])] : current.filter((id) => id !== user.id))} /><span className="truncate">{user.name}</span></label>)}</div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={requestSave}>Save Zone</Button></DialogFooter></DialogContent></Dialog><AlertDialog open={confirmLeader} onOpenChange={setConfirmLeader}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Change Zone Leader?</AlertDialogTitle><AlertDialogDescription>This may affect new assignments and escalations for this Zone. Existing historical records will remain unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={commit}>Confirm Change</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

function Protected({ title, description }: { title: string; description: string }) { return <PageContainer><FiveSPageHeader eyebrow="" title={title} description={description} /><SettingsAccessDenied area="organization configuration" /></PageContainer>; }
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`grid min-w-0 gap-1.5 text-sm font-medium ${className}`}>{label}{children}</label>; }
function Help({ children }: { children: React.ReactNode }) { return <span className="text-[11px] font-normal leading-4 text-muted-foreground">{children}</span>; }
function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd></div>; }
function MiniMeta({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 truncate text-xs font-semibold">{value}</dd></div>; }
