"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import { getVisualManagementState } from "./visual-management-store";
import type { VisualManagementParticipant } from "./types";

export type MeetingRepeat = "none" | "daily" | "weekly" | "monthly" | "custom";
export type MeetingEnd = { type: "never" } | { type: "date"; date: string } | { type: "count"; count: number };
export interface MeetingRecurrence { type: MeetingRepeat; interval: number; weekdays?: number[]; end: MeetingEnd }
export interface MeetingScheduleOverride {
  occurrenceDate: string;
  cancelled?: boolean;
  date?: string;
  time?: string;
  durationMinutes?: number;
  attendees?: VisualManagementParticipant[];
}
export interface MeetingSchedule {
  id: string;
  boardId: string;
  date: string;
  time: string;
  durationMinutes: number;
  recurrence: MeetingRecurrence;
  attendees: VisualManagementParticipant[];
  createdByUserId: string;
  createdAt: string;
  status: "Scheduled" | "Cancelled";
  overrides: MeetingScheduleOverride[];
}
export interface MeetingOccurrence {
  key: string;
  scheduleId: string;
  boardId: string;
  occurrenceDate: string;
  date: string;
  time: string;
  durationMinutes: number;
  attendees: VisualManagementParticipant[];
  status: "Scheduled" | "Cancelled";
}

const KEY = "ops-visual-management-meeting-schedules-v1";
const EMPTY: MeetingSchedule[] = [];
let schedules: MeetingSchedule[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
const pad = (value: number) => String(value).padStart(2, "0");
const parse = (date: string) => new Date(`${date}T12:00:00Z`);
const keyOf = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
function addDays(date: string, count: number) { const value = parse(date); value.setUTCDate(value.getUTCDate() + count); return keyOf(value); }
function monthDay(start: string, months: number) {
  const source = parse(start);
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1, 12));
  const max = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(source.getUTCDate(), max));
  return keyOf(target);
}
function weekday(date: string) { return (parse(date).getUTCDay() + 6) % 7; }
function daysBetween(a: string, b: string) { return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000); }
function seed(): MeetingSchedule {
  const now = new Date();
  const date = keyOf(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)));
  const board = getVisualManagementState().boards.find((item) => item.id === "VM-ZA-T1");
  return {
    id: "VMS-DEMO-ZONE-A-WEEKDAYS",
    boardId: "VM-ZA-T1",
    date,
    time: "09:30",
    durationMinutes: 30,
    recurrence: { type: "weekly", interval: 1, weekdays: [0, 1, 2, 3, 4], end: { type: "never" } },
    attendees: (board?.members ?? []).map((person) => ({ ...person, attendance: "Absent" as const, expected: true })),
    createdByUserId: board?.owner.id ?? "USR-LAKSHMAN",
    createdAt: now.toISOString(),
    status: "Scheduled",
    overrides: [],
  };
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.localStorage.getItem(KEY);
    const parsed = JSON.parse(stored ?? "null");
    schedules = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string" && Array.isArray(item.attendees)) : [];
    if (!schedules.some((item) => item.id === "VMS-DEMO-ZONE-A-WEEKDAYS") && getVisualManagementState().boards.some((item) => item.id === "VM-ZA-T1")) schedules = [...schedules, seed()];
    if (stored === null || schedules.length !== parsed?.length) safeSetStorage(KEY, schedules);
  } catch {
    schedules = getVisualManagementState().boards.some((item) => item.id === "VM-ZA-T1") ? [seed()] : [];
    safeSetStorage(KEY, schedules);
  }
}
function snapshot() { load(); return schedules; }
function persist(next: MeetingSchedule[]) {
  const previous = schedules;
  schedules = next;
  if (typeof window !== "undefined" && !safeSetStorage(KEY, schedules).success) { schedules = previous; return false; }
  listeners.forEach((listener) => listener());
  return true;
}
export function useMeetingSchedules() { return useSyncExternalStore((listener) => { load(); listeners.add(listener); return () => listeners.delete(listener); }, snapshot, () => EMPTY); }
export function getMeetingSchedules() { return snapshot(); }
export function defaultMeetingRepeat(frequency: string): MeetingRepeat {
  const name = frequency.split(" · ")[0].toLowerCase();
  return name === "daily" || name === "weekly" || name === "monthly" ? name : "none";
}
export function validateMeetingSchedule(input: Pick<MeetingSchedule, "date" | "time" | "durationMinutes" | "recurrence" | "attendees">) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(parse(input.date).getTime()) || keyOf(parse(input.date)) !== input.date) return "Choose a valid date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Choose a valid time.";
  if (![15, 30, 45, 60, 90].includes(input.durationMinutes)) return "Choose a duration.";
  if (!Number.isInteger(input.recurrence.interval) || input.recurrence.interval < 1) return "Repeat interval must be at least 1.";
  if (input.recurrence.type === "weekly" && !input.recurrence.weekdays?.length) return "Select at least one weekday.";
  if (input.recurrence.end.type === "date" && input.recurrence.end.date < input.date) return "End date must be after the first meeting.";
  if (input.recurrence.end.type === "count" && (!Number.isInteger(input.recurrence.end.count) || input.recurrence.end.count < 1)) return "Number of meetings must be at least 1.";
  if (!input.attendees.length) return "Add at least one expected attendee.";
  return "";
}
export function createMeetingSchedule(input: Omit<MeetingSchedule, "id" | "createdAt" | "status" | "overrides">) {
  const error = validateMeetingSchedule(input);
  if (error || !getVisualManagementState().boards.some((board) => board.id === input.boardId && board.status === "Active")) return { success: false as const, error: error || "Board is unavailable." };
  const schedule: MeetingSchedule = { ...input, id: `VMS-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, attendees: input.attendees.map((person) => ({ ...person, attendance: "Absent", expected: true })), createdAt: new Date().toISOString(), status: "Scheduled", overrides: [] };
  return persist([...snapshot(), schedule]) ? { success: true as const, schedule } : { success: false as const, error: "Schedule could not be saved." };
}

/** Expand only the requested window; no future instance records are persisted. */
export function occurrencesInRange(schedule: MeetingSchedule, from: string, through: string): MeetingOccurrence[] {
  if (schedule.status === "Cancelled" || through < from) return [];
  const result: MeetingOccurrence[] = [];
  const end = schedule.recurrence.end;
  const movedIntoWindow = schedule.overrides.filter((item) => item.date && item.date >= from && item.date <= through).map((item) => item.occurrenceDate);
  const scanThrough = [through, ...movedIntoWindow].sort().at(-1)!;
  const limit = end.type === "date" && end.date < scanThrough ? end.date : scanThrough;
  const append = (occurrenceDate: string) => {
    if (occurrenceDate < schedule.date || occurrenceDate > limit) return;
    const override = schedule.overrides.find((item) => item.occurrenceDate === occurrenceDate);
    const date = override?.date ?? occurrenceDate;
    if (date >= from && date <= through) result.push({ key: `${schedule.id}:${occurrenceDate}`, scheduleId: schedule.id, boardId: schedule.boardId, occurrenceDate, date, time: override?.time ?? schedule.time, durationMinutes: override?.durationMinutes ?? schedule.durationMinutes, attendees: override?.attendees ?? schedule.attendees, status: override?.cancelled ? "Cancelled" : "Scheduled" });
  };
  if (schedule.recurrence.type === "none") { append(schedule.date); return result; }
  let emitted = 0;
  const countLimit = end.type === "count" ? end.count : Number.POSITIVE_INFINITY;
  if (schedule.recurrence.type === "monthly") {
    for (let month = 0; emitted < countLimit; month += schedule.recurrence.interval) {
      const date = monthDay(schedule.date, month);
      if (date > limit) break;
      append(date);
      emitted++;
    }
    return result;
  }
  const weekdays = schedule.recurrence.weekdays?.length ? schedule.recurrence.weekdays : [weekday(schedule.date)];
  for (let date = schedule.date; date <= limit && emitted < countLimit; date = addDays(date, 1)) {
    const elapsed = daysBetween(schedule.date, date);
    const matches = schedule.recurrence.type === "daily"
      || schedule.recurrence.type === "custom" ? elapsed % schedule.recurrence.interval === 0
      : Math.floor((elapsed + weekday(schedule.date)) / 7) % schedule.recurrence.interval === 0 && weekdays.includes(weekday(date));
    if (matches) { append(date); emitted++; }
  }
  return result;
}
export function listMeetingOccurrences(from: string, through: string) { return snapshot().flatMap((item) => occurrencesInRange(item, from, through)).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)); }
function protectedOccurrence(id: string, occurrenceDate: string) { return getVisualManagementState().meetings.some((meeting) => meeting.scheduleId === id && meeting.occurrenceDate === occurrenceDate); }
export function changeMeetingSchedule(id: string, occurrenceDate: string, scope: "single" | "future" | "series", patch: Partial<Pick<MeetingSchedule, "date" | "time" | "durationMinutes" | "recurrence" | "attendees">>, cancel = false) {
  const current = snapshot();
  const schedule = current.find((item) => item.id === id);
  if (!schedule || protectedOccurrence(id, occurrenceDate)) return false;
  if (scope === "single") {
    if (!cancel && validateMeetingSchedule({ ...schedule, ...patch, recurrence: schedule.recurrence })) return false;
    const override = { ...(schedule.overrides.find((item) => item.occurrenceDate === occurrenceDate) ?? { occurrenceDate }), ...(patch.date ? { date: patch.date } : {}), ...(patch.time ? { time: patch.time } : {}), ...(patch.durationMinutes ? { durationMinutes: patch.durationMinutes } : {}), ...(patch.attendees ? { attendees: patch.attendees } : {}), cancelled: cancel };
    return persist(current.map((item) => item.id === id ? { ...item, overrides: [...item.overrides.filter((entry) => entry.occurrenceDate !== occurrenceDate), override] } : item));
  }
  if (scope === "future") {
    if (occurrenceDate <= schedule.date) return changeMeetingSchedule(id, occurrenceDate, "series", patch, cancel);
    const previousEnd = { type: "date" as const, date: addDays(occurrenceDate, -1) };
    const truncated = { ...schedule, recurrence: { ...schedule.recurrence, end: previousEnd }, overrides: schedule.overrides.filter((item) => item.occurrenceDate < occurrenceDate) };
    if (cancel) return persist(current.map((item) => item.id === id ? truncated : item));
    const completedBeforeSplit = occurrencesInRange(schedule, schedule.date, previousEnd.date).length;
    const remainingEnd = schedule.recurrence.end.type === "count"
      ? { type: "count" as const, count: Math.max(1, schedule.recurrence.end.count - completedBeforeSplit) }
      : schedule.recurrence.end;
    const requestedRecurrence = patch.recurrence ?? schedule.recurrence;
    const successorRecurrence = requestedRecurrence.end.type === "count" && schedule.recurrence.end.type === "count" && requestedRecurrence.end.count === schedule.recurrence.end.count
      ? { ...requestedRecurrence, end: remainingEnd } : requestedRecurrence;
    const successor: MeetingSchedule = { ...schedule, ...patch, id: `VMS-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, date: patch.date ?? occurrenceDate, createdAt: new Date().toISOString(), recurrence: successorRecurrence, overrides: schedule.overrides.filter((item) => item.occurrenceDate >= occurrenceDate) };
    if (validateMeetingSchedule(successor)) return false;
    return persist([...current.map((item) => item.id === id ? truncated : item), successor]);
  }
  if (cancel) return persist(current.map((item) => item.id === id ? { ...item, status: "Cancelled" } : item));
  const updated = { ...schedule, ...patch };
  if (validateMeetingSchedule(updated)) return false;
  return persist(current.map((item) => item.id === id ? updated : item));
}
export function setMeetingSchedulesForTests(next: MeetingSchedule[]) { schedules = next; loaded = true; listeners.forEach((listener) => listener()); }
