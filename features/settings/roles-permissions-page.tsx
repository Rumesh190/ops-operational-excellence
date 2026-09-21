"use client";

import { Check, Minus, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { ADMIN_ROLES } from "@/features/five-s/administration/types";
import { ROLE_CAPABILITY_MATRIX, ROLE_DEFINITIONS, type RoleCapabilityAccess } from "@/features/five-s/administration/permissions";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";

const roles = ADMIN_ROLES;

export default function RolesPermissionsPage() {
  const access = useSettingsAccess();
  if (!access.canManageRoles) return <PageContainer><FiveSPageHeader eyebrow="" title="Roles & Permissions" description="Understand role capabilities and operational scope." /><SettingsAccessDenied area="roles and permissions" /></PageContainer>;
  return <PageContainer>
    <FiveSPageHeader eyebrow="" title="Roles & Permissions" description="Understand the current fixed OPS role capabilities and scope rules." />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <Card key={role} className="shadow-none"><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{role}</h2><Badge variant="outline">{ROLE_DEFINITIONS[role].scope}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{ROLE_DEFINITIONS[role].description}</p></CardContent></Card>)}<Card className="border-primary/20 bg-primary/[0.025] shadow-none"><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Super Admin</h2><Badge variant="secondary">Platform</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Platform-level organization and module administration. This role is not assignable by an organization Admin.</p></CardContent></Card></div>
    <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>Permissions are read-only for the MVP and reflect the current fixed role logic. <strong className="text-foreground">Scoped</strong> means access is limited by Zone, assignment, or record ownership.</p></div>
    <Card className="overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b bg-muted/20"><th className="px-4 py-3 text-left">Capability</th>{roles.map((role) => <th key={role} className="px-3 py-3 text-center"><Badge variant="outline">{role}</Badge></th>)}</tr></thead><tbody>{ROLE_CAPABILITY_MATRIX.map((item) => <tr key={item.capability} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{item.capability}</td>{roles.map((role) => <td key={role} className="px-3 py-3 text-center"><AccessCell value={item.access[role]} /></td>)}</tr>)}</tbody></table></div></CardContent></Card>
  </PageContainer>;
}

function AccessCell({ value }: { value: RoleCapabilityAccess }) { if (value === "—") return <><Minus className="mx-auto size-4 text-muted-foreground/50" /><span className="sr-only">No access</span></>; if (value === "Scoped") return <Badge variant="secondary">Scoped</Badge>; return <><Check className="mx-auto size-4 text-emerald-600" /><span className="sr-only">Allowed</span></>; }
