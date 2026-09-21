"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage, type StorageResult } from "@/lib/browser-storage";

export type ProfileLandingPage = "/dashboard" | "/actions" | "/gemba" | "/visual-management";

export interface PersonalProfile {
  fullName: string;
  phone: string;
  jobTitle: string;
  photo?: string;
}

export interface PersonalPreferences {
  defaultLandingPage: ProfileLandingPage;
}

export interface PersonalNotificationPreferences {
  actionReminders: boolean;
  actionEscalations: boolean;
  reviewNotifications: boolean;
  auditNotifications: boolean;
  gembaNotifications: boolean;
  redFlagNotifications: boolean;
  continuousImprovementNotifications: boolean;
  visualManagementNotifications: boolean;
  systemAnnouncements: boolean;
}

export interface PersonalSettings {
  profile: PersonalProfile;
  preferences: PersonalPreferences;
  notifications: PersonalNotificationPreferences;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: PersonalNotificationPreferences = {
  actionReminders: true,
  actionEscalations: true,
  reviewNotifications: true,
  auditNotifications: true,
  gembaNotifications: true,
  redFlagNotifications: true,
  continuousImprovementNotifications: true,
  visualManagementNotifications: true,
  systemAnnouncements: true,
};

export const DEFAULT_PERSONAL_SETTINGS: PersonalSettings = {
  profile: { fullName: "", phone: "", jobTitle: "" },
  preferences: { defaultLandingPage: "/dashboard" },
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
};

const STORAGE_KEY = "ops-personal-profile-settings-v1";
type PersonalSettingsMap = Record<string, PersonalSettings>;

let settingsByUser: PersonalSettingsMap = {};
let loaded = false;
const listeners = new Set<() => void>();

function normalizeRecord(value: unknown): PersonalSettings {
  if (!value || typeof value !== "object") return DEFAULT_PERSONAL_SETTINGS;
  const stored = value as Partial<PersonalSettings>;
  return {
    profile: { ...DEFAULT_PERSONAL_SETTINGS.profile, ...(stored.profile ?? {}) },
    preferences: { ...DEFAULT_PERSONAL_SETTINGS.preferences, ...(stored.preferences ?? {}) },
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(stored.notifications ?? {}) },
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Record<string, unknown> | null;
    settingsByUser = parsed && typeof parsed === "object"
      ? Object.fromEntries(Object.entries(parsed).map(([userId, value]) => [userId, normalizeRecord(value)]))
      : {};
  } catch {
    settingsByUser = {};
  }
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  load();
  return settingsByUser;
}

function persist(userId: string, next: PersonalSettings): StorageResult {
  load();
  const previous = settingsByUser;
  settingsByUser = { ...settingsByUser, [userId]: next };
  const result = safeSetStorage(STORAGE_KEY, settingsByUser);
  if (!result.success) {
    settingsByUser = previous;
    return result;
  }
  listeners.forEach((listener) => listener());
  return result;
}

export function usePersonalSettings(userId: string) {
  const map = useSyncExternalStore<PersonalSettingsMap>(subscribe, snapshot, () => ({}));
  return map[userId] ?? DEFAULT_PERSONAL_SETTINGS;
}

export function getPersonalSettings(userId: string) {
  load();
  return settingsByUser[userId] ?? DEFAULT_PERSONAL_SETTINGS;
}

export function savePersonalProfile(userId: string, profile: PersonalProfile) {
  const current = getPersonalSettings(userId);
  return persist(userId, { ...current, profile: { ...profile, fullName: profile.fullName.trim(), phone: profile.phone.trim(), jobTitle: profile.jobTitle.trim() } });
}

export function savePersonalPreferences(userId: string, preferences: PersonalPreferences) {
  const current = getPersonalSettings(userId);
  return persist(userId, { ...current, preferences });
}

export function savePersonalNotifications(userId: string, notifications: PersonalNotificationPreferences) {
  const current = getPersonalSettings(userId);
  return persist(userId, { ...current, notifications });
}

export function validateProfilePhoto(file: Pick<File, "size" | "type">) {
  const accepted = ["image/jpeg", "image/png", "image/webp"];
  if (!accepted.includes(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > 2 * 1024 * 1024) return "Photo must be 2 MB or smaller.";
  return "";
}
