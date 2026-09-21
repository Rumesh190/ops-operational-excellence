"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardCheck, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SidebarNav, SuperAdminSidebarNav } from "@/components/navigation/sidebar-nav"
import { SidebarFooter } from "@/components/navigation/sidebar-footer"
import { useCurrentUser } from "@/lib/current-user"

/** Slide-in navigation for viewports below `lg`, mirroring the desktop Sidebar. */
function MobileNavDrawer() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const currentUser = useCurrentUser()
  const superAdminContext = pathname.startsWith("/super-admin") && currentUser.isSuperAdmin

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="ops-sidebar flex w-[min(88vw,304px)] max-w-none flex-col border-white/[0.08] bg-[#0d1522] p-0 text-slate-100">
        <SheetHeader className="h-16 border-b border-white/[0.07] px-4 py-0">
          <SheetTitle>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] shadow-[0_4px_12px_var(--brand-accent-shadow)] ring-1 ring-white/20">
                <ClipboardCheck className="size-[18px]" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-[15px] font-semibold">OPS</span>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{superAdminContext ? "Platform Administration" : "Operational Excellence Platform"}</span>
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {superAdminContext ? <SuperAdminSidebarNav onNavigate={() => setOpen(false)} /> : <SidebarNav onNavigate={() => setOpen(false)} />}
        </div>
        <SidebarFooter context={superAdminContext ? "super-admin" : "ops"} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export { MobileNavDrawer }
