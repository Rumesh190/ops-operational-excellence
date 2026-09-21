import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function OpsEmptyState({ title, description, action, icon: Icon = Inbox, compact = false, className }: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: typeof Inbox;
  compact?: boolean;
  className?: string;
}) {
  return <div className={cn("grid place-items-center px-5 py-8 text-center", compact ? "min-h-36" : "min-h-48", className)}>
    <div><span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/[0.08] text-primary"><Icon className="size-5" /></span><p className="mt-3 text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>
  </div>;
}
