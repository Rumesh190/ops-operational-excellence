"use client"

import * as React from "react"

import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_STORAGE_KEY,
  type AccentColor,
  type AppLanguage,
  type NavigationPosition,
  type UiPreferences,
} from "@/lib/ui-preferences"

interface UiPreferencesContextValue extends UiPreferences {
  setNavigationPosition: (position: NavigationPosition) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setAccentColor: (color: AccentColor) => void
  setLanguage: (language: AppLanguage) => void
}

const UiPreferencesContext = React.createContext<UiPreferencesContextValue | null>(null)

function applyPreferences(preferences: UiPreferences) {
  document.documentElement.dataset.navigation = preferences.navigationPosition
  document.documentElement.dataset.sidebar = preferences.sidebarCollapsed ? "collapsed" : "expanded"
  document.documentElement.dataset.accent = preferences.accentColor
  document.documentElement.lang = preferences.language
  document.documentElement.dataset.language = preferences.language
}

function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<UiPreferences>(() => {
    if (typeof document === "undefined") return DEFAULT_UI_PREFERENCES

    const root = document.documentElement
    const navigationPosition = root.dataset.navigation as NavigationPosition | undefined
    const accentColor = root.dataset.accent as AccentColor | undefined
    const language = root.dataset.language as AppLanguage | undefined
    const sidebarCollapsed = root.dataset.sidebar === "collapsed"

    return {
      navigationPosition: navigationPosition ?? DEFAULT_UI_PREFERENCES.navigationPosition,
      sidebarCollapsed,
      accentColor: accentColor ?? DEFAULT_UI_PREFERENCES.accentColor,
      language: language ?? DEFAULT_UI_PREFERENCES.language,
    }
  })

  function updatePreferences(next: UiPreferences) {
    setPreferences(next)
    applyPreferences(next)
    window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  }

  const value = React.useMemo<UiPreferencesContextValue>(() => ({
    ...preferences,
    setNavigationPosition: (navigationPosition) =>
      updatePreferences({ ...preferences, navigationPosition }),
    setSidebarCollapsed: (sidebarCollapsed) =>
      updatePreferences({ ...preferences, sidebarCollapsed }),
    setAccentColor: (accentColor) =>
      updatePreferences({ ...preferences, accentColor }),
    setLanguage: (language) =>
      updatePreferences({ ...preferences, language }),
  }), [preferences])

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  )
}

function useUiPreferences() {
  const context = React.useContext(UiPreferencesContext)
  if (!context) throw new Error("useUiPreferences must be used within UiPreferencesProvider")
  return context
}

export {
  UiPreferencesProvider,
  useUiPreferences,
}
