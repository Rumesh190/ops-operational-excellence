"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorageString, type StorageResult } from "@/lib/browser-storage";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "5s-theme";
const listeners = new Set<() => void>();
let loaded = false;
let theme: ThemePreference = "light";

function isTheme(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function resolvedDark(value: ThemePreference) {
  return value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function apply(value: ThemePreference) {
  document.documentElement.classList.toggle("dark", resolvedDark(value));
  document.documentElement.dataset.theme = value;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  theme = isTheme(stored) ? stored : "light";
  apply(theme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (theme === "system") apply(theme);
  });
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  load();
  return theme;
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, snapshot, () => "light" as ThemePreference);
}

export function setThemePreference(next: ThemePreference): StorageResult {
  load();
  const result = safeSetStorageString(THEME_STORAGE_KEY, next);
  if (!result.success) return result;
  theme = next;
  apply(next);
  listeners.forEach((listener) => listener());
  return result;
}
