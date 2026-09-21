"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { SidebarNav, SuperAdminSidebarNav } from "@/components/navigation/sidebar-nav";
import { SidebarFooter } from "@/components/navigation/sidebar-footer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  context?: "ops" | "super-admin";
}

/**
 * Persistent, collapsible desktop navigation rail.
 * Hidden below `lg`.
 */
function Sidebar({
  collapsed,
  onToggleCollapsed,
  context = "ops",
}: SidebarProps) {
  return (
    <TooltipProvider>
      <aside
        className={cn(
          "ops-sidebar app-left-nav fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.08] bg-[#0d1522] text-slate-100 transition-[width] duration-[220ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none lg:flex",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3",
            collapsed && "justify-center gap-0.5 px-1"
          )}
        >
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger render={<Link href="/dashboard" className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] shadow-[0_4px_12px_var(--brand-accent-shadow)] ring-1 ring-white/20" aria-label="OPS home" />}>
                  <ClipboardCheck className="size-[17px]" />
                </TooltipTrigger>
                <TooltipContent side="right">OPS workspace</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="size-6 text-slate-400 hover:bg-white/[0.07] hover:text-white" onClick={onToggleCollapsed} aria-label="Expand sidebar" />}>
                  <PanelLeftOpen className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] shadow-[0_4px_12px_var(--brand-accent-shadow)] ring-1 ring-white/20">
                  <ClipboardCheck className="size-[18px]" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-heading text-[15px] font-semibold">OPS</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[10.5px] font-medium text-slate-400">
                    {context === "super-admin" ? "Platform Administration" : "Operational Excellence Platform"}
                  </span>
                </span>
              </Link>

              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-slate-400 hover:bg-white/[0.07] hover:text-white"
                onClick={onToggleCollapsed}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-[17px]" />
              </Button>
            </>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 py-3">
          {context === "super-admin" ? <SuperAdminSidebarNav collapsed={collapsed} /> : <SidebarNav collapsed={collapsed} />}
        </ScrollArea>

        <SidebarFooter collapsed={collapsed} context={context} />
      </aside>
    </TooltipProvider>
  );
}

export { Sidebar };
