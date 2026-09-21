"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpsTabItem {
  id: string;
  label: string;
  count?: number;
  href?: string;
  icon?: LucideIcon;
}

export function OpsTabBar({ tabs, active, onChange, label }: {
  tabs: OpsTabItem[];
  active: string;
  onChange?: (id: string) => void;
  label: string;
}) {
  return <nav aria-label={label} className="flex min-w-0 gap-1 overflow-x-auto border-b pb-px" role="tablist">
    {tabs.map((tab) => {
      const selected = active === tab.id;
      const className = cn(
        "relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        selected && "text-foreground after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-primary",
      );
      const Icon = tab.icon;
      const content = <>{Icon && <Icon className={cn("size-3.5", selected && "text-primary")} />}{tab.label}{typeof tab.count === "number" && <span className={cn("rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", selected && "bg-primary/10 text-primary")}>{tab.count}</span>}</>;
      return tab.href
        ? <Link key={tab.id} href={tab.href} role="tab" aria-selected={selected} aria-current={selected ? "page" : undefined} className={className}>{content}</Link>
        : <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => onChange?.(tab.id)} className={className}>{content}</button>;
    })}
  </nav>;
}
