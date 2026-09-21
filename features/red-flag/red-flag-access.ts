import type { AdminUser } from "@/features/five-s/administration/types";
import { hasPermission } from "@/features/five-s/administration/permissions";
import type { DemoUser } from "@/lib/current-user";
import type { RedFlag } from "./types";

function hasRole(user: AdminUser | undefined, roles: AdminUser["roles"]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

export function canRaiseRedFlag(user: AdminUser | undefined, currentUser: DemoUser) {
  if (currentUser.isSuperAdmin) return false;
  return hasRole(user, ["Admin", "Auditor"]) || hasPermission(user, "red_tag.create");
}

export function canManageRedFlag(user: AdminUser | undefined, currentUser: DemoUser, flag?: RedFlag) {
  if (currentUser.isSuperAdmin) return false;
  const allowed = hasRole(user, ["Admin", "Auditor", "Zone Leader"]) || hasPermission(user, "red_tag.manage");
  if (!allowed || !flag) return allowed;
  return hasRole(user, ["Admin", "Auditor"]) || flag.zone === currentUser.primaryZone || flag.raisedById === currentUser.id;
}

export function canCloseRedFlag(user: AdminUser | undefined, currentUser: DemoUser, flag?: RedFlag) {
  if (currentUser.isSuperAdmin) return false;
  const allowed = hasRole(user, ["Admin", "Auditor"]) || (hasPermission(user, "actions.review") && hasPermission(user, "actions.close"));
  if (!allowed || !flag) return allowed;
  return hasRole(user, ["Admin", "Auditor"]) || flag.zone === currentUser.primaryZone;
}

export function visibleRedFlags(flags: RedFlag[], user: AdminUser | undefined, currentUser: DemoUser) {
  if (currentUser.isSuperAdmin || hasRole(user, ["Admin", "Auditor"])) return flags;
  return flags.filter((flag) => flag.zone === currentUser.primaryZone || flag.raisedById === currentUser.id);
}
