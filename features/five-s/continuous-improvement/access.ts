import type { AdminUser } from "@/features/five-s/administration/types";
import { hasPermission } from "@/features/five-s/administration/permissions";
import type { DemoUser } from "@/lib/current-user";
import type { ContinuousImprovement } from "./types";

function hasRole(user: AdminUser | undefined, roles: AdminUser["roles"]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

export function canViewImprovement(user: AdminUser | undefined, currentUser: DemoUser, item?: ContinuousImprovement) {
  if (currentUser.isSuperAdmin || !user || user.status !== "Active" || !hasPermission(user, "ci.view")) return false;
  if (!item || hasRole(user, ["Admin", "Auditor", "Reviewer", "Viewer"])) return true;
  return item.zoneLeaderId === currentUser.id || item.zone === currentUser.primaryZone || item.proposedById === currentUser.id || item.ownerId === currentUser.id || item.memberIds.includes(currentUser.id);
}

export function canCreateImprovement(user: AdminUser | undefined, currentUser: DemoUser) {
  return !currentUser.isSuperAdmin && Boolean(user?.status === "Active" && hasPermission(user, "ci.create"));
}

export function canEditProposal(user: AdminUser | undefined, currentUser: DemoUser, item: ContinuousImprovement) {
  if (currentUser.isSuperAdmin || !user || user.status !== "Active" || !["draft", "submitted"].includes(item.status)) return false;
  return hasRole(user, ["Admin"]) || item.proposedById === currentUser.id;
}

export function canReviewProposal(user: AdminUser | undefined, currentUser: DemoUser, item: ContinuousImprovement) {
  if (currentUser.isSuperAdmin || !user || user.status !== "Active" || !hasPermission(user, "ci.review")) return false;
  return hasRole(user, ["Admin"]) || item.zone === currentUser.primaryZone;
}

export function canImplementImprovement(user: AdminUser | undefined, currentUser: DemoUser, item: ContinuousImprovement) {
  if (currentUser.isSuperAdmin || !user || user.status !== "Active" || !hasPermission(user, "ci.implement")) return false;
  return hasRole(user, ["Admin"]) || item.ownerId === currentUser.id || item.memberIds.includes(currentUser.id);
}

export function canCompleteReview(user: AdminUser | undefined, currentUser: DemoUser, item: ContinuousImprovement) {
  if (currentUser.isSuperAdmin || !user || user.status !== "Active") return false;
  return hasPermission(user, "ci.review") && (hasRole(user, ["Admin"]) || item.zone === currentUser.primaryZone);
}

export function canCreateImprovementAction(user: AdminUser | undefined, currentUser: DemoUser, item: ContinuousImprovement) {
  return !currentUser.isSuperAdmin && Boolean(user?.status === "Active" && hasPermission(user, "actions.create") && (hasRole(user, ["Admin"]) || item.zone === currentUser.primaryZone));
}
