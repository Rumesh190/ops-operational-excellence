"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/features/five-s/administration/permissions";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useCurrentUser } from "@/lib/current-user";

export function useCanManageAuditConfiguration() {
  const currentUser = useCurrentUser();
  const user = useAdminUsers().find((item) => item.id === currentUser.id);
  return currentUser.isSuperAdmin || Boolean(user?.status === "Active" && hasPermission(user, "administration.manage_configuration"));
}

export function useSettingsAccess() {
  const currentUser = useCurrentUser();
  const user = useAdminUsers().find((item) => item.id === currentUser.id);
  return {
    isSuperAdmin: currentUser.isSuperAdmin,
    canViewUsers: currentUser.isSuperAdmin || Boolean(user?.status === "Active" && hasPermission(user, "administration.view")),
    canManageUsers: currentUser.isSuperAdmin || Boolean(user?.status === "Active" && hasPermission(user, "administration.manage_users")),
    canManageRoles: currentUser.isSuperAdmin || Boolean(user?.status === "Active" && hasPermission(user, "administration.manage_roles")),
    canManageConfiguration: currentUser.isSuperAdmin || Boolean(user?.status === "Active" && hasPermission(user, "administration.manage_configuration")),
  };
}

export function AuditConfigurationAccessDenied() {
  return <div className="grid min-h-[360px] place-items-center rounded-xl border bg-card p-8 text-center">
    <div><LockKeyhole className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Configuration access required</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Only organization administrators with configuration permission can manage custom audit questions.</p><Button nativeButton={false} render={<Link href="/settings" />} variant="outline" className="mt-5">Back to Settings</Button></div>
  </div>;
}

export function SettingsAccessDenied({ area = "this Settings area" }: { area?: string }) {
  return <div className="grid min-h-[320px] place-items-center rounded-xl border bg-card p-8 text-center"><div><LockKeyhole className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Settings access required</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your current role does not have permission to manage {area}.</p><Button nativeButton={false} render={<Link href="/settings" />} variant="outline" className="mt-5">Back to Settings</Button></div></div>;
}
