import type { AdminUser } from "@/features/five-s/administration/types";
import { getAdminUser } from "@/features/five-s/administration/store";
import type { ContinuousImprovement } from "./types";

export function selectableImprovementOwners(users: readonly AdminUser[], plant: string, zone: string) {
  return users
    .filter((user) => user.status === "Active" && user.plant === plant && user.permissions.includes("ci.implement") && (user.roles.includes("Admin") || user.zoneMemberships.some((membership) => membership.zone === zone)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function improvementOwnerDisplayName(item: Pick<ContinuousImprovement, "ownerId" | "ownerName">) {
  const canonical = item.ownerId ? getAdminUser(item.ownerId) : undefined;
  return canonical?.name ?? (item.ownerName?.trim() || "Owner unavailable");
}
