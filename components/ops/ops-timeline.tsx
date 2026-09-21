import { Clock3 } from "lucide-react";
import { formatOpsDateTime } from "@/lib/ops-formatters";

export interface OpsTimelineItem {
  id: string;
  title: string;
  actor: string;
  timestamp: string;
  remark?: string;
  linkedRecord?: React.ReactNode;
  icon?: typeof Clock3;
}

export function OpsTimeline({ items }: { items: OpsTimelineItem[] }) {
  return <ol className="grid gap-0">{items.map((item, index) => {
    const Icon = item.icon ?? Clock3;
    return <li key={item.id} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3"><div className="relative flex justify-center"><span className="z-10 grid size-8 place-items-center rounded-full border bg-card text-muted-foreground"><Icon className="size-3.5" /></span>{index < items.length - 1 && <span className="absolute bottom-0 top-8 w-px bg-border" />}</div><div className="min-w-0 pb-5"><div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="text-sm font-medium">{item.title}</p><time className="text-[11px] text-muted-foreground" dateTime={item.timestamp}>{formatOpsDateTime(item.timestamp)}</time></div><p className="mt-0.5 text-xs text-muted-foreground">{item.actor}</p>{item.remark && <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">{item.remark}</p>}{item.linkedRecord && <div className="mt-2 text-xs">{item.linkedRecord}</div>}</div></li>;
  })}</ol>;
}
