"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { ACCESS_CAPABILITIES, type AccessCapabilityId } from "@/lib/modules";
import { DEMO_ORGANIZATION, ORGANIZATIONS, saveOrganizationAccess, type OrganizationAccess, useOrganizationAccess } from "@/lib/module-entitlements";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";

const SECTIONS = [
  { title: "Operational Excellence", ids: ["gemba", "redFlag", "continuousImprovement", "audit"] },
  { title: "Execution", ids: ["actions"] },
  { title: "Visualize", ids: ["visualManagement"] },
  { title: "Analytics", ids: ["reports"] },
] as const;

export default function SettingsModuleAccessPage() {
  const access = useSettingsAccess();
  const [organizationId, setOrganizationId] = useState(DEMO_ORGANIZATION.id);
  if (!access.isSuperAdmin) return <PageContainer><FiveSPageHeader eyebrow="" title="Module Access" description="Control which OPS capabilities are available to each organization." /><SettingsAccessDenied area="platform module access" /></PageContainer>;
  return <ModuleAccessEditor key={organizationId} organizationId={organizationId} onOrganizationChange={setOrganizationId} />;
}

function ModuleAccessEditor({ organizationId, onOrganizationChange }: { organizationId: string; onOrganizationChange: (id: string) => void }) {
  const organization = ORGANIZATIONS.find((item) => item.id === organizationId) ?? DEMO_ORGANIZATION;
  const persisted = useOrganizationAccess(organizationId);
  const [changes, setChanges] = useState<Partial<OrganizationAccess>>({});
  const [pendingDisable, setPendingDisable] = useState<AccessCapabilityId | null>(null);
  const [success, setSuccess] = useState(false);
  const draft = { ...persisted, ...changes };
  const changedIds = ACCESS_CAPABILITIES.filter((capability) => draft[capability.id] !== persisted[capability.id]).map((capability) => capability.id);
  const pending = ACCESS_CAPABILITIES.find((capability) => capability.id === pendingDisable);
  function requestChange(id: AccessCapabilityId, enabled: boolean) { setSuccess(false); if (!enabled && persisted[id]) setPendingDisable(id); else setChanges((current) => ({ ...current, [id]: enabled })); }
  function save() { if (saveOrganizationAccess(organizationId, draft)) { setChanges({}); setSuccess(true); } }
  return <PageContainer className="pb-20"><FiveSPageHeader eyebrow="" title="Module Access" description="Control which OPS capabilities are available to each organization." />
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-semibold">Organization</p><p className="text-xs text-muted-foreground">Changes apply only to the selected organization.</p></div><Select value={organizationId} onValueChange={(value) => { if (value) onOrganizationChange(value); }}><SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{ORGANIZATIONS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
    {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Module access updated successfully.</div>}
    {SECTIONS.map((section) => <section key={section.title}><h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section.title}</h2><div className="grid gap-3 md:grid-cols-2">{section.ids.map((id) => { const capability = ACCESS_CAPABILITIES.find((item) => item.id === id)!; return <Card key={id} className="shadow-none"><CardContent className="flex items-start gap-3 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary"><capability.icon className="size-[17px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{capability.label}</h3><Badge size="sm" variant={draft[id] ? "success" : "muted"}>{draft[id] ? "Enabled" : "Disabled"}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{capability.description}</p></div><Switch checked={draft[id]} onCheckedChange={(checked) => requestChange(id, checked)} aria-label={`Enable ${capability.label}`} /></CardContent></Card>; })}</div></section>)}
    {changedIds.length > 0 && <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className="flex-1 text-sm font-medium">{changedIds.length} unsaved {changedIds.length === 1 ? "change" : "changes"}</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setChanges({})}>Cancel</Button><Button onClick={save}>Save Changes</Button></div></div>}
    <AlertDialog open={Boolean(pendingDisable)} onOpenChange={(open) => { if (!open) setPendingDisable(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Disable {pending?.label}?</AlertDialogTitle><AlertDialogDescription>Users in {organization.name} will no longer be able to access {pending?.label}. Existing records will remain preserved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDisable) setChanges((current) => ({ ...current, [pendingDisable]: false })); setPendingDisable(null); }}>Disable Module</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </PageContainer>;
}
