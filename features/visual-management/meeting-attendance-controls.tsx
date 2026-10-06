"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/features/five-s/administration/store";
import type { VisualManagementParticipant, VisualManagementPerson } from "./types";

export function MeetingAttendanceControls({
  attendees,
  onAddUser,
  onAddGuest,
  onRemove,
}: {
  attendees: VisualManagementParticipant[];
  onAddUser: (person: VisualManagementPerson) => void;
  onAddGuest: (name: string, companyOrRole?: string) => void;
  onRemove?: (id: string) => void;
}) {
  const users = useAdminUsers();
  const [userOpen, setUserOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [companyOrRole, setCompanyOrRole] = useState("");
  const [error, setError] = useState("");
  const available = users.filter((user) =>
    user.status === "Active" &&
    !attendees.some((person) => person.id === user.id) &&
    user.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = available.find((user) => user.id === selectedId);

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { setSearch(""); setSelectedId(""); setUserOpen(true); }}><Plus className="size-3.5" />Add Attendee</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setGuestName(""); setCompanyOrRole(""); setError(""); setGuestOpen(true); }}><Plus className="size-3.5" />Add Guest</Button>
      </div>
      {onRemove && attendees.some((person) => person.manuallyAdded || person.guest) ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attendees.filter((person) => person.manuallyAdded || person.guest).map((person) => (
            <Button key={person.id} size="sm" variant="ghost" onClick={() => onRemove(person.id)} aria-label={`Remove ${person.name}`}>
              {person.name}{person.guest ? " · Guest" : ""}<X className="size-3.5" />
            </Button>
          ))}
        </div>
      ) : null}
      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Attendee</DialogTitle><DialogDescription>Select an existing OPS user for this meeting.</DialogDescription></DialogHeader>
          <Input autoFocus value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(""); }} placeholder="Search by name..." aria-label="Search people" />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {available.map((user) => <button key={user.id} type="button" onClick={() => setSelectedId(user.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${selectedId === user.id ? "bg-primary/10" : ""}`}><span aria-hidden="true">{selectedId === user.id ? "●" : "○"}</span>{user.name}</button>)}
            {!available.length ? <p className="py-4 text-center text-sm text-muted-foreground">No available people found.</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUserOpen(false)}>Cancel</Button><Button disabled={!selected} onClick={() => { if (!selected) return; onAddUser({ id: selected.id, name: selected.name }); setUserOpen(false); }}>Add Attendee</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Guest</DialogTitle><DialogDescription>Add someone without an OPS account.</DialogDescription></DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">Name *<Input autoFocus value={guestName} onChange={(event) => { setGuestName(event.target.value); setError(""); }} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Company / Role<Input value={companyOrRole} onChange={(event) => setCompanyOrRole(event.target.value)} /></label>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter><Button variant="outline" onClick={() => setGuestOpen(false)}>Cancel</Button><Button onClick={() => { if (!guestName.trim()) { setError("Enter a guest name."); return; } onAddGuest(guestName.trim(), companyOrRole.trim() || undefined); setGuestOpen(false); }}>Add Guest</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
