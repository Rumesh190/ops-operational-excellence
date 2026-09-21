import { hasPermission } from "@/features/five-s/administration/permissions";
import type { AdminUser } from "@/features/five-s/administration/types";

export function canCreateRedTag(user: AdminUser | undefined) {
  return user?.status === "Active" && hasPermission(user, "red_tag.create");
}
