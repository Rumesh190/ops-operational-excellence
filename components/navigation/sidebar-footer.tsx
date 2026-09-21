"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

export function SidebarFooter({ collapsed = false, onNavigate, context = "ops" }: { collapsed?: boolean; onNavigate?: () => void; context?: "ops" | "super-admin" }) {
  const user = useCurrentUser();
  const helpLink = <Link href={context === "super-admin" ? "/super-admin/settings?section=support" : "/settings?section=support"} onClick={onNavigate} className={cn("flex h-10 items-center rounded-lg text-[13px] font-medium text-slate-400 outline-none transition-colors hover:bg-white/[0.055] hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]", collapsed ? "justify-center" : "gap-3 px-3")}><CircleHelp className="size-4 shrink-0" />{!collapsed && <span>Help &amp; Support</span>}<span className="sr-only">{collapsed ? "Help & Support" : ""}</span></Link>;
  const profileLink = <Link href="/profile" onClick={onNavigate} className={cn("flex min-w-0 items-center rounded-lg outline-none transition-colors hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]", collapsed ? "justify-center p-1" : "gap-3 p-2")}><Avatar className="after:border-white/10">{user.photo && <AvatarImage src={user.photo} alt="" />}<AvatarFallback className="bg-white/10 text-xs font-semibold text-white">{user.initials}</AvatarFallback></Avatar>{!collapsed && <span className="min-w-0 leading-tight"><span className="block truncate text-sm font-medium text-white">{user.name}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{user.role}</span></span>}<span className="sr-only">{collapsed ? `${user.name}, ${user.role}` : ""}</span></Link>;
  return <div className={cn("border-t border-white/[0.07]", collapsed ? "p-2" : "p-3")}>
    {collapsed ? <Tooltip><TooltipTrigger render={helpLink} /><TooltipContent side="right">Help &amp; Support</TooltipContent></Tooltip> : helpLink}
    <div className="my-2 h-px bg-white/[0.07]" />
    {collapsed ? <Tooltip><TooltipTrigger render={profileLink} /><TooltipContent side="right"><span className="font-medium">{user.name}</span><br /><span className="text-xs">{user.role}</span></TooltipContent></Tooltip> : profileLink}
  </div>;
}
