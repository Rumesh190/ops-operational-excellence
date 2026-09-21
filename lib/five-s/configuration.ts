"use client";

import { useMemo } from "react";

import { getAdminUser, getAdminUsers, useAdminUsers } from "@/features/five-s/administration/store";
import {
  getOrganizationZone,
  getOrganizationZones,
  ORGANIZATION_MEMBER_SEEDS,
  ORGANIZATION_ZONE_SEEDS,
  useOrganizationConfiguration,
} from "@/lib/organization-store";
import { getPriorityDueDate } from "@/lib/actions/action-configuration-store";

export interface FiveSZoneMember { id: string; name: string; role: string }
export interface FiveSZoneConfiguration { name: string; code: string; leader: string; leaderId: string; department: string; members: FiveSZoneMember[] }

const seedMembers = (zoneId: string): FiveSZoneMember[] => ORGANIZATION_MEMBER_SEEDS
  .filter((member) => member.zoneId === zoneId)
  .map((member) => ({ id: member.id, name: member.name, role: "Zone Member" }));

/** Server-safe seed snapshot retained for existing reports and fixture code. Interactive selectors use the live helpers/hooks below. */
export const FIVE_S_ZONE_CONFIGURATION: FiveSZoneConfiguration[] = ORGANIZATION_ZONE_SEEDS.map((zone) => ({
  name: zone.name,
  code: zone.code,
  leader: zone.leaderName,
  leaderId: zone.leaderId,
  department: zone.department,
  members: seedMembers(zone.id),
}));

function composeZones(zones = getOrganizationZones(), users = getAdminUsers()): FiveSZoneConfiguration[] {
  return zones.filter((zone) => zone.status === "Active").map((zone) => {
    const leader = users.find((user) => user.id === zone.leaderId && user.status === "Active");
    const members = users
      .filter((user) => user.status === "Active" && user.zoneMemberships.some((membership) => membership.zone === zone.name && membership.responsibility !== "Leader"))
      .map((user) => ({ id: user.id, name: user.name, role: user.roles[0] ?? "Zone Member" }));
    return {
      name: zone.name,
      code: zone.code,
      leader: leader?.name ?? zone.leaderName,
      leaderId: leader?.id ?? zone.leaderId,
      department: zone.department,
      members,
    };
  });
}

export function useFiveSZoneConfiguration() {
  const organization = useOrganizationConfiguration();
  const users = useAdminUsers();
  return useMemo(() => composeZones(organization.zones, users), [organization.zones, users]);
}

export const FIVE_S_CORRECTIVE_ACTION_CATEGORIES = [
  "Add / Revise Process", "Checkpoints / Review", "Communication", "Correction of Documentation",
  "Create / Revise Procedure", "Design / Equipment Modification", "Education / Training", "Other",
  "Provide / Change Resources",
] as const;

export type FiveSActionPriority = "Low" | "Medium" | "High" | "Critical";
export function toLocalInputDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export { getPriorityDueDate };
export function getFiveSZoneConfiguration(zoneName: string) {
  const zone = getOrganizationZone(zoneName);
  if (!zone || zone.status !== "Active") return undefined;
  const leader = getAdminUser(zone.leaderId);
  const members = getAdminUsers().filter((user) => user.status === "Active" && user.zoneMemberships.some((membership) => membership.zone === zone.name && membership.responsibility !== "Leader"));
  return { name: zone.name, code: zone.code, leader: leader?.status === "Active" ? leader.name : zone.leaderName, leaderId: leader?.status === "Active" ? leader.id : zone.leaderId, department: zone.department, members: members.map((member) => ({ id: member.id, name: member.name, role: member.roles[0] ?? "Zone Member" })) } satisfies FiveSZoneConfiguration;
}
export function getMembersForZone(zoneName: string): FiveSZoneMember[] { return getFiveSZoneConfiguration(zoneName)?.members ?? []; }
export function canAuditZone(user: { primaryZone: string }, zoneName: string) { return Boolean(zoneName && user.primaryZone !== zoneName); }
