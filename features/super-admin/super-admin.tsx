"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Settings2 } from "lucide-react";
import {
  ORGANIZATIONS,
  saveOrganizationAccess,
  useOrganizationAccess,
  type Organization,
  type OrganizationAccess,
} from "@/lib/module-entitlements";
import { ACCESS_CAPABILITIES, OPERATIONAL_MODULES, SHARED_CAPABILITIES, type AccessCapabilityId } from "@/lib/modules";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function organizationById(id: string) { return ORGANIZATIONS.find((organization) => organization.id === id); }

function OrganizationMissing() {
  return <PageContainer><FiveSPageHeader eyebrow="Super Admin" title="Organization not found" description="The requested organization is not available." /><Button nativeButton={false} render={<Link href="/super-admin/organizations" />} variant="outline">Back to Organizations</Button></PageContainer>;
}

function OrganizationTabs({ organization, active }: { organization: Organization; active: "overview" | "modules" }) {
  const items = [
    { label: "Overview", href: `/super-admin/organizations/${organization.id}`, id: "overview" },
    { label: "Modules", href: `/super-admin/organizations/${organization.id}/modules`, id: "modules" },
    { label: "Users" },
    { label: "Configuration" },
  ] as const;
  return <nav aria-label="Organization sections" className="flex gap-1 overflow-x-auto border-b border-border/70">
    {items.map((item) => "href" in item ? <Link key={item.label} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`relative shrink-0 px-3 py-2.5 text-sm font-medium ${active === item.id ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</Link> : <span key={item.label} aria-disabled className="shrink-0 cursor-default px-3 py-2.5 text-sm font-medium text-muted-foreground/60">{item.label}</span>)}
  </nav>;
}

export function OrganizationsPage() {
  return <PageContainer>
    <FiveSPageHeader eyebrow="Super Admin" title="Organizations" description="Manage OPS access and configuration across organizations." />
    <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Industry</TableHead><TableHead>Plants</TableHead><TableHead>Users</TableHead><TableHead>Enabled Modules</TableHead><TableHead>Status</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{ORGANIZATIONS.map((organization) => <OrganizationRow key={organization.id} organization={organization} />)}</TableBody></Table></Card>
  </PageContainer>;
}

function OrganizationRow({ organization }: { organization: Organization }) {
  const access = useOrganizationAccess(organization.id);
  const enabledModules = OPERATIONAL_MODULES.filter((moduleConfig) => access[moduleConfig.id]).length;
  return <TableRow><TableCell><Link href={`/super-admin/organizations/${organization.id}`} className="font-medium hover:text-primary hover:underline">{organization.name}</Link></TableCell><TableCell>{organization.industry}</TableCell><TableCell>{organization.plants} Plants</TableCell><TableCell>{organization.users} Users</TableCell><TableCell>{enabledModules} Modules</TableCell><TableCell><Badge variant={organization.status === "Active" ? "success" : "muted"}>{organization.status}</Badge></TableCell><TableCell>{organization.lastUpdated}</TableCell><TableCell className="text-right"><Link href={`/super-admin/organizations/${organization.id}`} className="inline-flex items-center gap-1.5 font-medium text-primary">Manage <ArrowRight className="size-3.5" /></Link></TableCell></TableRow>;
}

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const organization = organizationById(organizationId);
  if (!organization) return <OrganizationMissing />;
  return <PageContainer><FiveSPageHeader eyebrow="Super Admin / Organizations" title={organization.name} description="Operational Excellence Platform Configuration" /><OrganizationTabs organization={organization} active="overview" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Industry" value={organization.industry} /><Summary label="Plants" value={String(organization.plants)} /><Summary label="Users" value={String(organization.users)} /><Summary label="Status" value={organization.status} /></div><Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-5" /></span><div className="flex-1"><h2 className="font-semibold">Module Access</h2><p className="mt-1 text-sm text-muted-foreground">Control which OPS modules are available to this organization.</p></div><Button nativeButton={false} render={<Link href={`/super-admin/organizations/${organization.id}/modules`} />}>Configure Modules</Button></CardContent></Card></PageContainer>;
}

function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></CardContent></Card>; }

export function OrganizationModulesPage({ organizationId }: { organizationId: string }) {
  const organization = organizationById(organizationId);
  const persisted = useOrganizationAccess(organizationId);
  const [changes, setChanges] = React.useState<Partial<OrganizationAccess>>({});
  const [pendingDisable, setPendingDisable] = React.useState<AccessCapabilityId | null>(null);
  const [success, setSuccess] = React.useState(false);
  if (!organization) return <OrganizationMissing />;

  const draft: OrganizationAccess = { ...persisted, ...changes };
  const changedIds = ACCESS_CAPABILITIES.filter((capability) => draft[capability.id] !== persisted[capability.id]).map((capability) => capability.id);
  const pendingCapability = pendingDisable ? ACCESS_CAPABILITIES.find((capability) => capability.id === pendingDisable) : undefined;
  function requestChange(id: AccessCapabilityId, enabled: boolean) {
    setSuccess(false);
    if (!enabled && persisted[id]) { setPendingDisable(id); return; }
    setChanges((current) => ({ ...current, [id]: enabled }));
  }
  function confirmDisable() {
    if (pendingDisable) setChanges((current) => ({ ...current, [pendingDisable]: false }));
    setPendingDisable(null);
  }
  function save() {
    if (saveOrganizationAccess(organizationId, draft)) { setChanges({}); setSuccess(true); }
  }

  return <PageContainer className="pb-20"><FiveSPageHeader eyebrow="Super Admin / Organizations" title={organization.name} description="Module Access — Control which OPS modules are available to this organization." /><OrganizationTabs organization={organization} active="modules" />
    {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" />Module access updated successfully.</div>}
    <AccessSection title="Operational Excellence Modules" capabilities={OPERATIONAL_MODULES} access={draft} onChange={requestChange} />
    <AccessSection title="Shared Platform Capabilities" capabilities={SHARED_CAPABILITIES} access={draft} onChange={requestChange} />
    {changedIds.length > 0 && <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg shadow-black/10 backdrop-blur sm:flex-row sm:items-center"><p className="flex-1 text-sm font-medium">{changedIds.length} unsaved {changedIds.length === 1 ? "change" : "changes"}</p><div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="outline" onClick={() => { setChanges({}); setSuccess(false); }}>Cancel</Button><Button onClick={save}>Save Changes</Button></div></div>}
    <AlertDialog open={Boolean(pendingDisable)} onOpenChange={(open) => { if (!open) setPendingDisable(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Disable {pendingCapability?.label}?</AlertDialogTitle><AlertDialogDescription>Users in {organization.name} will no longer be able to access {pendingCapability?.label}. Existing records will remain preserved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDisable}>Disable Module</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </PageContainer>;
}

function AccessSection({ title, capabilities, access, onChange }: { title: string; capabilities: typeof OPERATIONAL_MODULES | typeof SHARED_CAPABILITIES; access: OrganizationAccess; onChange: (id: AccessCapabilityId, enabled: boolean) => void }) {
  return <section><h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2><div className="grid gap-3 md:grid-cols-2">{capabilities.map((capability) => <Card key={capability.id} className="shadow-none"><CardContent className="p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary"><capability.icon className="size-[17px]" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{capability.label}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{capability.description}</p></div><Switch checked={access[capability.id]} onCheckedChange={(checked) => onChange(capability.id, checked)} aria-label={`Enable ${capability.label}`} /></div><div className="mt-3 border-t border-border/60 pt-3"><Badge variant={access[capability.id] ? "success" : "muted"} size="sm">{access[capability.id] ? "Enabled" : "Disabled"}</Badge></div></CardContent></Card>)}</div></section>;
}
