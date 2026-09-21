import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OpsFeedback({ tone, message, retry, className }: { tone: "success" | "error"; message: string; retry?: () => void; className?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", tone === "success" ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300" : "border-destructive/20 bg-destructive/[0.06] text-destructive", className)}><Icon className="size-4 shrink-0" /><span className="min-w-0 flex-1">{message}</span>{retry && <Button size="sm" variant="ghost" onClick={retry}>Try again</Button>}</div>;
}
