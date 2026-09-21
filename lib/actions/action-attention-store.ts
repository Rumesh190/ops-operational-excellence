"use client";

import { useSyncExternalStore } from "react";

import type { AdminUser } from "@/features/five-s/administration/types";
import type { MyAction, MyActionActivity } from "@/features/five-s/types/my-actions";
import { safeSetStorage } from "@/lib/browser-storage";
import { createNotification } from "@/lib/notifications/notification-store";
import { actionDueDays } from "@/lib/actions/action-config";
import { getActionById, updateAction, type ActionActor } from "@/lib/actions/action-store";
import { getActionConfiguration } from "@/lib/actions/action-configuration-store";

export type ActionReminderType = "Due Soon" | "Due Today" | "Overdue" | "Repeated Overdue";
export type ActionReminderStatus = "Generated" | "Acknowledged";
export type ActionEscalationStatus = "Open" | "Acknowledged" | "Resolved";
export type ActionEscalationLevel = 1 | 2 | 3;

export interface ActionReminder {
  id: string;
  actionId: string;
  type: ActionReminderType;
  recipientUserId: string;
  recipientRole?: string;
  scheduledFor: string;
  generatedAt?: string;
  acknowledgedAt?: string;
  status: ActionReminderStatus;
}

export interface ActionEscalation {
  id: string;
  actionId: string;
  level: ActionEscalationLevel;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  reason: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  status: ActionEscalationStatus;
}

const REMINDER_STORAGE_KEY = "ops-action-reminders-v1";
const ESCALATION_STORAGE_KEY = "ops-action-escalations-v1";
const listeners = new Set<() => void>();
const EMPTY_REMINDERS: ActionReminder[] = [];
const EMPTY_ESCALATIONS: ActionEscalation[] = [];
const SERVER_SNAPSHOT = { reminders: EMPTY_REMINDERS, escalations: EMPTY_ESCALATIONS };
let reminders: ActionReminder[] = [];
let escalations: ActionEscalation[] = [];
let snapshot = { reminders, escalations };
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const storedReminders = JSON.parse(window.localStorage.getItem(REMINDER_STORAGE_KEY) ?? "[]");
    const storedEscalations = JSON.parse(window.localStorage.getItem(ESCALATION_STORAGE_KEY) ?? "[]");
    reminders = Array.isArray(storedReminders) ? storedReminders : [];
    escalations = Array.isArray(storedEscalations) ? storedEscalations : [];
  } catch {
    reminders = [];
    escalations = [];
  }
  snapshot = { reminders, escalations };
}

function persist() {
  snapshot = { reminders, escalations };
  if (typeof window !== "undefined") {
    safeSetStorage(REMINDER_STORAGE_KEY, reminders);
    safeSetStorage(ESCALATION_STORAGE_KEY, escalations);
  }
  listeners.forEach((listener) => listener());
}

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function findUserId(users: readonly AdminUser[], id: string | undefined, name: string | undefined) {
  return id ?? users.find((user) => user.name === name)?.id;
}

function responsibleUserId(action: MyAction, users: readonly AdminUser[]) {
  return findUserId(users, action.responsiblePersonId, action.responsiblePersonName ?? action.assignedTo);
}

function reviewerUser(action: MyAction, users: readonly AdminUser[]) {
  const explicit = users.find((user) => user.id === action.reviewerId || user.name === action.reviewerName);
  if (explicit) return explicit;
  const sourceReviewer = users.find((user) => user.name === action.auditor);
  if (sourceReviewer) return sourceReviewer;
  const creator = users.find((user) => user.id === action.createdByUserId || user.name === action.createdByName);
  if (creator) return creator;
  return users.find((user) => user.status === "Active" && user.roles.includes("Admin") && user.permissions.includes("actions.review"));
}

function appendAttentionActivity(actionId: string, activity: MyActionActivity) {
  const action = getActionById(actionId);
  if (!action || action.activityHistory?.some((item) => item.id === activity.id)) return;
  updateAction(actionId, { activityHistory: [...(action.activityHistory ?? []), activity] });
}

function activity(id: string, type: MyActionActivity["type"], actorId: string, actorName: string, createdAt: string, remark: string): MyActionActivity {
  return { id: `ACTIVITY-${id}`, type, actorId, actorName, createdAt, remark };
}

function generateReminder(action: MyAction, type: ActionReminderType, recipientUserId: string, scheduledFor: string, now: Date, recipientRole?: string) {
  const id = `REM-${action.id}-${type.replaceAll(" ", "-").toUpperCase()}-${recipientUserId}-${scheduledFor}`;
  if (reminders.some((item) => item.id === id)) return;
  const generatedAt = now.toISOString();
  reminders = [{ id, actionId: action.id, type, recipientUserId, recipientRole, scheduledFor, generatedAt, status: "Generated" }, ...reminders];
  const title = type === "Due Soon" ? "Action due tomorrow" : type === "Due Today" ? "Action due today" : type === "Overdue" ? "Action overdue" : "Action still overdue";
  createNotification({ recipientUserId, title, message: `${action.title} · ${action.id}`, href: `/actions/${encodeURIComponent(action.id)}` });
  appendAttentionActivity(action.id, activity(id, "reminder_generated", recipientUserId, "OPS reminder service", generatedAt, type));
}

function generateEscalation(action: MyAction, level: ActionEscalationLevel, toUser: AdminUser, fromUserId: string, overdueDays: number, now: Date) {
  const id = `ESC-${action.id}-L${level}`;
  if (escalations.some((item) => item.id === id)) return;
  const createdAt = now.toISOString();
  const reason = `Action remains unresolved ${overdueDays} days after its due date.`;
  escalations = [{ id, actionId: action.id, level, fromUserId, toUserId: toUser.id, toUserName: toUser.name, reason, createdAt, status: "Open" }, ...escalations];
  createNotification({ recipientUserId: toUser.id, title: `Action escalated · Level ${level}`, message: `${action.title} · ${action.id} · ${reason}`, href: `/actions/${encodeURIComponent(action.id)}` });
  appendAttentionActivity(action.id, activity(id, "escalated", fromUserId, "OPS escalation service", createdAt, `Level ${level} escalated to ${toUser.name}. ${reason}`));
}

export function evaluateActionAttention(actions: readonly MyAction[], users: readonly AdminUser[], now = new Date()) {
  load();
  const configuration = getActionConfiguration();
  const reminderConfig = configuration.reminders;
  const escalationRules = configuration.escalations.filter((rule) => rule.enabled).sort((a, b) => a.level - b.level);
  const today = localDate(now);
  actions.forEach((action) => {
    if (action.status === "Completed") {
      escalations = escalations.map((item) => item.actionId === action.id && item.status !== "Resolved" ? { ...item, status: "Resolved", resolvedAt: action.closedAt ?? action.completedAt ?? now.toISOString() } : item);
      return;
    }
    if (["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status)) return;
    const recipientUserId = responsibleUserId(action, users);
    if (!recipientUserId) return;
    const days = actionDueDays(action, now);
    const reminderRecipients = [{ id: recipientUserId, role: "Action Owner" }];
    const zoneLeader = users.find((user) => user.id === action.zoneLeaderId || user.name === action.zoneLeaderName);
    if (reminderConfig.includeZoneLeader && zoneLeader && zoneLeader.id !== recipientUserId) reminderRecipients.push({ id: zoneLeader.id, role: "Zone Leader" });
    if (reminderConfig.dueSoon.enabled && days === reminderConfig.dueSoon.daysBeforeDue) reminderRecipients.forEach((recipient) => generateReminder(action, "Due Soon", recipient.id, action.dueDate, now, recipient.role));
    if (reminderConfig.dueToday.enabled && days === 0) reminderRecipients.forEach((recipient) => generateReminder(action, "Due Today", recipient.id, action.dueDate, now, recipient.role));
    const overdueDays = Math.max(0, -days);
    if (reminderConfig.overdue.enabled && overdueDays === reminderConfig.overdue.daysAfterDue) reminderRecipients.forEach((recipient) => generateReminder(action, "Overdue", recipient.id, today, now, recipient.role));
    const repeatStart = reminderConfig.overdue.daysAfterDue + reminderConfig.repeatOverdue.repeatEveryDays;
    if (reminderConfig.repeatOverdue.enabled && overdueDays >= repeatStart && (overdueDays - repeatStart) % reminderConfig.repeatOverdue.repeatEveryDays === 0) reminderRecipients.forEach((recipient) => generateReminder(action, "Repeated Overdue", recipient.id, today, now, recipient.role));

    const reviewer = reviewerUser(action, users);
    escalationRules.forEach((rule) => {
      const recipient = rule.recipientRole === "zoneLeader" ? zoneLeader : reviewer;
      if (overdueDays >= rule.daysOverdue && recipient) generateEscalation(action, rule.level, recipient, rule.level === 1 ? recipientUserId : zoneLeader?.id ?? recipientUserId, overdueDays, now);
    });
  });
  persist();
  return { reminders: [...reminders], escalations: [...escalations] };
}

export function acknowledgeActionEscalation(escalationId: string, actor: ActionActor) {
  load();
  const escalation = escalations.find((item) => item.id === escalationId);
  if (!escalation || escalation.status !== "Open" || escalation.toUserId !== actor.id) return undefined;
  const acknowledgedAt = new Date().toISOString();
  const updated = { ...escalation, status: "Acknowledged" as const, acknowledgedAt };
  escalations = escalations.map((item) => item.id === escalationId ? updated : item);
  appendAttentionActivity(escalation.actionId, activity(escalation.id, "escalation_acknowledged", actor.id, actor.name, acknowledgedAt, `Level ${escalation.level} escalation acknowledged.`));
  persist();
  return updated;
}

export function getActionReminders(actionId: string) {
  load();
  return reminders.filter((item) => item.actionId === actionId);
}

export function getActionEscalations(actionId: string) {
  load();
  return escalations.filter((item) => item.actionId === actionId);
}

export function useActionAttention(actionId: string) {
  load();
  const current = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
  return {
    reminders: current.reminders.filter((item) => item.actionId === actionId),
    escalations: current.escalations.filter((item) => item.actionId === actionId),
  };
}

export function getActionAttentionMetrics(actions: readonly MyAction[], now = new Date()) {
  load();
  const reminderConfig = getActionConfiguration().reminders;
  const active = actions.filter((action) => action.status !== "Completed");
  const overdueAges = active.map((action) => Math.max(0, -actionDueDays(action, now))).filter((days) => days > 0);
  return {
    dueSoon: reminderConfig.dueSoon.enabled ? active.filter((action) => actionDueDays(action, now) === reminderConfig.dueSoon.daysBeforeDue).length : 0,
    overdue: overdueAges.length,
    escalated: new Set(escalations.filter((item) => item.status !== "Resolved").map((item) => item.actionId)).size,
    averageOverdueAge: overdueAges.length ? overdueAges.reduce((sum, days) => sum + days, 0) / overdueAges.length : 0,
  };
}

export function resetActionAttentionState() {
  reminders = [];
  escalations = [];
  loaded = true;
  persist();
}
