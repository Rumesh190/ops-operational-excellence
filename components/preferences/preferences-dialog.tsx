"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useUiPreferences,
} from "@/components/preferences/ui-preferences-provider"
import type { AccentColor } from "@/lib/ui-preferences"
import { LANGUAGE_OPTIONS } from "@/lib/i18n"
import { useI18n } from "@/components/preferences/use-i18n"

const ACCENTS: Array<{ value: AccentColor; label: string; color: string }> = [
  { value: "indigo", label: "Indigo", color: "oklch(0.55 0.22 272)" },
  { value: "blue", label: "Blue", color: "oklch(0.56 0.20 255)" },
  { value: "teal", label: "Teal", color: "oklch(0.57 0.15 190)" },
  { value: "emerald", label: "Emerald", color: "oklch(0.56 0.17 150)" },
  { value: "orange", label: "Orange", color: "oklch(0.65 0.18 55)" },
  { value: "rose", label: "Rose", color: "oklch(0.58 0.21 15)" },
]

function PreferencesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { accentColor, setAccentColor } = useUiPreferences()
  const { language, setLanguage, t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-5 sm:max-w-md sm:gap-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Appearance</DialogTitle>
          <DialogDescription>Personalize how the OPS workspace looks on this device.</DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("language")}</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("language")}>
            {LANGUAGE_OPTIONS.map((option) => <button key={option.code} type="button" role="radio" aria-checked={language === option.code} onClick={() => setLanguage(option.code)} lang={option.code} className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", language === option.code ? "border-primary bg-primary/7" : "border-border/80")}>{option.name}{language === option.code && <Check className="size-4 text-primary" />}</button>)}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Accent color</legend>
          <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3" role="radiogroup" aria-label="Product accent color">
            {ACCENTS.map((accent) => {
              const selected = accentColor === accent.value
              return (
                <button
                  key={accent.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${accent.label} accent`}
                  onClick={() => setAccentColor(accent.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-primary bg-primary/7" : "border-border/80"
                  )}
                >
                  <span className="size-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: accent.color }} />
                  <span>{accent.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  )
}

export { PreferencesDialog }
