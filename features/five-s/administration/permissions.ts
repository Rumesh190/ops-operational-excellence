import type { AdminRole, AdminUser, PermissionCode } from "./types";
import { ADMIN_ROLES, PERMISSION_GROUPS } from "./types";

const all=Object.values(PERMISSION_GROUPS).flat() as PermissionCode[];
export const ROLE_PRESETS:Record<AdminRole,PermissionCode[]>={
  Admin:all,
  Auditor:["dashboard.view","audits.view","audits.create","audits.execute","audits.complete","actions.view","actions.create","actions.review","actions.close","reports.view","reports.export","ci.view","red_tag.view"],
  "Zone Leader":["dashboard.view","audits.view","actions.view","actions.assign","reports.view","ci.view","ci.review","red_tag.view","red_tag.manage","red_tag.print"],
  "Zone Member":["dashboard.view","audits.view","actions.view","actions.work","ci.view","ci.create","ci.implement","ci.complete","red_tag.view","red_tag.create"],
  Reviewer:["dashboard.view","audits.view","actions.view","actions.review","actions.close","reports.view","reports.export","ci.view","ci.review","red_tag.view"],
  Viewer:["dashboard.view","audits.view","actions.view","reports.view","ci.view","red_tag.view"],
};
export function permissionsForRoles(roles:AdminRole[]){return [...new Set(roles.flatMap(role=>ROLE_PRESETS[role]))] as PermissionCode[]}
export function hasPermission(user:Pick<AdminUser,"permissions">|undefined,permission:PermissionCode){return Boolean(user?.permissions.includes(permission))}

export type MvpRole = typeof ADMIN_ROLES[number];
export type RoleCapabilityAccess = "Yes" | "Scoped" | "—";
export const ROLE_DEFINITIONS: Record<MvpRole, { description: string; scope: string }> = {
  Admin: { description: "Manage organization configuration and broad operational access.", scope: "Organization" },
  Auditor: { description: "Conduct Audits and verify relevant corrective Actions.", scope: "Plant / assigned audits" },
  "Zone Leader": { description: "Manage Zone operations, reviews, assignments, and escalations.", scope: "Zone" },
  "Zone Member": { description: "Perform assigned operational work and create permitted records.", scope: "Zone / own records" },
  Reviewer: { description: "Review and verify configured workflows.", scope: "Assigned reviews" },
};
const capability = (name:string,admin:RoleCapabilityAccess,auditor:RoleCapabilityAccess,leader:RoleCapabilityAccess,member:RoleCapabilityAccess,reviewer:RoleCapabilityAccess) => ({ capability:name, access:{Admin:admin,Auditor:auditor,"Zone Leader":leader,"Zone Member":member,Reviewer:reviewer} satisfies Record<MvpRole,RoleCapabilityAccess> });
export const ROLE_CAPABILITY_MATRIX = [
  capability("Manage Users","Yes","—","—","—","—"), capability("Manage Settings","Yes","—","—","—","—"), capability("Manage Custom Questions","Yes","—","—","—","—"),
  capability("Start Audit","Yes","Yes","—","—","—"), capability("Start Gemba","Yes","Yes","—","—","—"), capability("Raise Red Flag","Yes","Yes","Scoped","Scoped","—"),
  capability("Create CI","Yes","—","—","Scoped","—"), capability("Review CI","Yes","—","Scoped","—","Scoped"), capability("Assign Actions","Yes","—","Scoped","—","—"),
  capability("Verify Actions","Yes","Yes","—","—","Scoped"), capability("Run Visual Management Meeting","Yes","Scoped","Scoped","Scoped","—"),
] as const;
