"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeetingAttendanceControls } from "./meeting-attendance-controls";
import { changeMeetingSchedule, createMeetingSchedule, defaultMeetingRepeat, type MeetingOccurrence, type MeetingRecurrence, type MeetingRepeat, type MeetingSchedule } from "./meeting-schedule-store";
import type { VisualManagementBoard, VisualManagementParticipant } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const weekday = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  board,
  actorId,
  schedule,
  occurrence,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: VisualManagementBoard;
  actorId: string;
  schedule?: MeetingSchedule;
  occurrence?: MeetingOccurrence;
}) {
  const initialDate = occurrence?.date ?? schedule?.date ?? today();
  const recurrence = schedule?.recurrence;
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(occurrence?.time ?? schedule?.time ?? "09:30");
  const [durationMinutes, setDurationMinutes] = useState(occurrence?.durationMinutes ?? schedule?.durationMinutes ?? 30);
  const [repeat, setRepeat] = useState<MeetingRepeat>(recurrence?.type ?? defaultMeetingRepeat(board.meetingFrequency));
  const [interval, setInterval] = useState(recurrence?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(recurrence?.weekdays ?? [weekday(initialDate)]);
  const [endType, setEndType] = useState<MeetingRecurrence["end"]["type"]>(recurrence?.end.type ?? "never");
  const [endDate, setEndDate] = useState(recurrence?.end.type === "date" ? recurrence.end.date : "");
  const [endCount, setEndCount] = useState(recurrence?.end.type === "count" ? recurrence.end.count : 12);
  const [attendees, setAttendees] = useState<VisualManagementParticipant[]>(() => (occurrence?.attendees ?? schedule?.attendees ?? board.members.map((person) => ({ ...person, attendance: "Absent" as const, expected: true }))).map((person) => ({ ...person })));
  const [scope, setScope] = useState<"single" | "future" | "series">("single");
  const [error, setError] = useState("");

  function save() {
    const recurrence: MeetingRecurrence = {
      type: repeat,
      interval,
      weekdays: repeat === "weekly" ? weekdays : undefined,
      end: endType === "date" ? { type: "date", date: endDate } : endType === "count" ? { type: "count", count: endCount } : { type: "never" },
    };
    if (!date || !time) return setError("Choose a date and time.");
    if (repeat === "weekly" && !weekdays.length) return setError("Select at least one weekday.");
    if (endType === "date" && (!endDate || endDate < date)) return setError("Choose an end date after the first meeting.");
    if (endType === "count" && endCount < 1) return setError("Enter a valid number of meetings.");
    if (!attendees.length) return setError("Add at least one expected attendee.");
    if (schedule && occurrence) {
      const changed = changeMeetingSchedule(schedule.id, occurrence.occurrenceDate, scope, {
        date,
        time,
        durationMinutes,
        attendees,
        ...(scope === "single" ? {} : { recurrence }),
      });
      if (!changed) return setError("The meeting could not be updated.");
    } else {
      const result = createMeetingSchedule({ boardId: board.id, date, time, durationMinutes, recurrence, attendees, createdByUserId: actorId });
      if (!result.success) return setError(result.error);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{schedule ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle><DialogDescription>{board.name} · {board.zone ?? board.plant}</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">Date *<Input type="date" value={date} onChange={(event) => { const next = event.target.value; setDate(next); if (next && weekdays.length <= 1) setWeekdays([weekday(next)]); }} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Time *<Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Duration<Select value={String(durationMinutes)} onValueChange={(value) => setDurationMinutes(Number(value))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{[15, 30, 45, 60, 90].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>)}</SelectContent></Select></label>
          {(!schedule || scope !== "single") ? <label className="grid gap-1.5 text-sm font-medium">Repeat<Select value={repeat} onValueChange={(value) => setRepeat(value as MeetingRepeat)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Does not repeat</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></label> : null}
          {repeat !== "none" ? <div className="grid gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium">Every<Input className="w-20" type="number" min={1} value={interval} onChange={(event) => setInterval(Number(event.target.value))} />{repeat === "daily" || repeat === "custom" ? "day(s)" : repeat === "weekly" ? "week(s)" : "month(s)"}</label>
            {repeat === "weekly" ? <fieldset><legend className="mb-2 text-sm font-medium">Repeat on</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map((day, index) => <Button key={day} type="button" size="sm" variant={weekdays.includes(index) ? "default" : "outline"} aria-pressed={weekdays.includes(index)} onClick={() => setWeekdays((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort())}>{day}</Button>)}</div></fieldset> : null}
            {repeat === "monthly" ? <p className="text-sm text-muted-foreground">Repeats on day {Number(date.slice(8))} of the month (or the last day in shorter months).</p> : null}
            <fieldset><legend className="mb-2 text-sm font-medium">Ends</legend><div className="grid gap-2 sm:grid-cols-3">{(["never", "date", "count"] as const).map((type) => <Button key={type} type="button" variant={endType === type ? "default" : "outline"} onClick={() => setEndType(type)}>{type === "never" ? "Never" : type === "date" ? "On date" : "After meetings"}</Button>)}</div></fieldset>
            {endType === "date" ? <label className="grid gap-1 text-sm">End date<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label> : null}
            {endType === "count" ? <label className="grid gap-1 text-sm">Number of meetings<Input className="w-28" type="number" min={1} value={endCount} onChange={(event) => setEndCount(Number(event.target.value))} /></label> : null}
          </div> : null}
          <div className="sm:col-span-2"><p className="text-sm font-medium">Expected attendees</p><div className="mt-2 flex flex-wrap gap-2">{attendees.map((person) => <Button key={person.id} type="button" size="sm" variant="outline" onClick={() => setAttendees((current) => current.filter((item) => item.id !== person.id))}>{person.name}{person.guest ? " · Guest" : ""} ×</Button>)}</div><MeetingAttendanceControls attendees={attendees} onAddUser={(person) => setAttendees((current) => current.some((item) => item.id === person.id) ? current : [...current, { ...person, attendance: "Absent", expected: true, manuallyAdded: true }])} onAddGuest={(name, companyOrRole) => setAttendees((current) => [...current, { id: `GUEST-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, name, companyOrRole, guest: true, attendance: "Absent", expected: true, manuallyAdded: true }])} /></div>
          {schedule?.recurrence.type !== "none" && occurrence ? <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Apply changes to<Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">This meeting</SelectItem><SelectItem value="future">This and future meetings</SelectItem><SelectItem value="series">Entire series</SelectItem></SelectContent></Select></label> : null}
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>{schedule ? "Save Changes" : "Schedule Meeting"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
