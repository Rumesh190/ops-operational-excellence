import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageFormActionBarProps {
  primaryLabel: string;
  submittingLabel?: string;
  primaryAction?: () => void;
  primaryType?: "button" | "submit";
  secondaryLabel: string;
  secondaryAction: () => void;
  isSubmitting?: boolean;
  primaryDisabled?: boolean;
  validationSummary?: string;
  className?: string;
}

export function PageFormActionBar({ primaryLabel, submittingLabel, primaryAction, primaryType = "button", secondaryLabel, secondaryAction, isSubmitting = false, primaryDisabled = false, validationSummary, className }: PageFormActionBarProps) {
  return <div className={cn("mobile-safe-bottom sticky bottom-3 z-40 mt-8 rounded-xl border bg-card/95 p-3 shadow-[0_-10px_30px_-20px_rgb(15_23_42/0.35)] backdrop-blur supports-[backdrop-filter]:bg-card/90", className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      {validationSummary && <p role="status" className="text-sm font-medium text-destructive sm:mr-auto">{validationSummary}</p>}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={secondaryAction}>{secondaryLabel}</Button>
        <Button type={primaryType} disabled={isSubmitting || primaryDisabled} onClick={primaryAction} className="w-full sm:w-auto">{isSubmitting ? submittingLabel ?? primaryLabel : primaryLabel}</Button>
      </div>
    </div>
  </div>;
}
