"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Languages, LogOut, Palette, Settings, ShieldCheck, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PreferencesDialog } from "@/components/preferences/preferences-dialog"
import { DEMO_USERS, setDemoRole, useCurrentUser } from "@/lib/current-user"
import { LANGUAGE_OPTIONS } from "@/lib/i18n"
import { useI18n } from "@/components/preferences/use-i18n"
import { useAuth } from "@/components/auth/auth-provider"

/** Avatar dropdown: My Profile, Settings, Logout — per the Component Library spec. */
function UserMenu() {
  const [preferencesOpen, setPreferencesOpen] = React.useState(false)
  const currentUser = useCurrentUser()
  const { language, setLanguage, t } = useI18n()
  const { logout } = useAuth()

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Account menu"
          />
        }
      >
        <Avatar>
          {currentUser.photo && <AvatarImage src={currentUser.photo} alt="" />}
          <AvatarFallback>{currentUser.initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Informational header, not an interactive group — plain markup,
            not DropdownMenuLabel (Base UI's Menu.GroupLabel requires a
            Menu.Group ancestor). */}
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-sm font-medium text-foreground">
            {currentUser.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentUser.role}
          </span>
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("account.demoRole")}
        </div>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setDemoRole("auditor")}>
            <Users />
            <span className="min-w-0 flex-1">
              <span className="block">{DEMO_USERS.auditor.name}</span>
              <span className="block truncate text-xs text-muted-foreground">Auditor</span>
            </span>
            {currentUser.id === DEMO_USERS.auditor.id && <Check className="text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDemoRole("leader")}>
            <Users />
            <span className="min-w-0 flex-1"><span className="block">{DEMO_USERS.leader.name}</span><span className="block truncate text-xs text-muted-foreground">Zone B Leader</span></span>
            {currentUser.id === DEMO_USERS.leader.id && <Check className="text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDemoRole("responsible")}>
            <Users />
            <span className="min-w-0 flex-1">
              <span className="block">{DEMO_USERS.responsible.name}</span>
              <span className="block truncate text-xs text-muted-foreground">Zone B Member</span>
            </span>
            {currentUser.id === DEMO_USERS.responsible.id && <Check className="text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDemoRole("superAdmin")}>
            <ShieldCheck />
            <span className="min-w-0 flex-1"><span className="block">{DEMO_USERS.superAdmin.name}</span><span className="block truncate text-xs text-muted-foreground">Platform Administrator</span></span>
            {currentUser.id === DEMO_USERS.superAdmin.id && <Check className="text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <Users />
            {t("account.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />}><Settings />Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
            <Palette />
            {t("account.appearance")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2 px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Languages className="size-3.5" />{t("language")}</div>
        <DropdownMenuGroup>
          {LANGUAGE_OPTIONS.map((option) => <DropdownMenuItem key={option.code} onClick={() => setLanguage(option.code)}><span lang={option.code} className="min-w-0 flex-1">{option.name}</span>{language === option.code && <Check className="text-primary" />}</DropdownMenuItem>)}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut />
          {t("account.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </>
  )
}

export { UserMenu }
