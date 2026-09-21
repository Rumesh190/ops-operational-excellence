import type { GembaWalk } from "./types";

export interface GembaAccessUser {
  id: string;
  primaryZone: string;
  isSuperAdmin: boolean;
}

export function canConductGembaWalk(roles: readonly string[] | undefined, user?: GembaAccessUser) {
  return !user?.isSuperAdmin && Boolean(roles?.some((role) => role === "Admin" || role === "Auditor"));
}

export function canViewGembaWalk(walk: GembaWalk, user: GembaAccessUser, roles: readonly string[] | undefined) {
  return user.isSuperAdmin
    || Boolean(roles?.some((role) => role === "Admin" || role === "Auditor"))
    || walk.zone === user.primaryZone
    || walk.leadId === user.id
    || walk.participants.some((person) => person.id === user.id);
}

export function visibleGembaWalks(walks: GembaWalk[], user: GembaAccessUser, roles: readonly string[] | undefined) {
  return walks.filter((walk) => canViewGembaWalk(walk, user, roles));
}
