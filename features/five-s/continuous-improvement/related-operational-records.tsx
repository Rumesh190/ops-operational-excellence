"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Link2, Plus, Search, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { hasPermission } from "@/features/five-s/administration/permissions";
import { useRedTags } from "@/features/five-s/red-tag/store";
import { canViewGembaWalk, visibleGembaWalks } from "@/features/gemba/gemba-access";
import { useGembaStore } from "@/features/gemba/gemba-store";
import { useCurrentUser } from "@/lib/current-user";
import { useFiveSAuditStore } from "@/lib/five-s/audit-store";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { useRelationships } from "@/lib/relationships/relationship-store";
import { getModuleDisplayName, resolveRecordRoute } from "@/lib/relationships/route-resolver";
import type { OpsRecordRef, OpsRelationship } from "@/lib/relationships/types";
import { areRecordRefsEqual, getRecordRefKey } from "@/lib/relationships/utils";
import { cn } from "@/lib/utils";
import {
  canRemoveImprovementOperationalRelationship,
  connectImprovementOperationalRecord,
  getImprovementOperationalRelationships,
  getImprovementRef,
  getOtherRelationshipRecord,
  removeImprovementOperationalConnection,
} from "./relationships";

type PickerModule = "gemba" | "redTag" | "audit";

export interface OperationalRecordOption {
  ref: OpsRecordRef;
  title: string;
  context: string;
  status?: string;
}

interface RelatedOperationalRecordsProps {
  improvementId?: string;
  pendingRecords?: OpsRecordRef[];
  onPendingRecordsChange?: (records: OpsRecordRef[]) => void;
  editable?: boolean;
  compact?: boolean;
}

export function RelatedOperationalRecords({ improvementId, pendingRecords = [], onPendingRecordsChange, editable = false, compact = false }: RelatedOperationalRecordsProps) {
  useRelationships();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const options = useOperationalRecordOptions();
  const relationships = improvementId ? getImprovementOperationalRelationships(improvementId) : [];
  const records: Array<{ ref: OpsRecordRef; relationship?: OpsRelationship }> = improvementId
    ? relationships.map((relationship) => ({ relationship, ref: getOtherRelationshipRecord(relationship, getImprovementRef(improvementId)) }))
    : pendingRecords.map((ref) => ({ ref }));

  function connect(ref: OpsRecordRef) {
    setNotice("");
    if (!improvementId) {
      if (!pendingRecords.some((item) => areRecordRefsEqual(item, ref))) onPendingRecordsChange?.([...pendingRecords, ref]);
      setPickerOpen(false);
      return;
    }
    try {
      const before = getImprovementOperationalRelationships(improvementId).length;
      const relationship = connectImprovementOperationalRecord(improvementId, ref);
      const after = getImprovementOperationalRelationships(improvementId).length;
      setNotice(!relationship ? "Unable to connect this record." : after === before ? "This record is already connected." : "Operational record connected.");
      setPickerOpen(false);
    } catch {
      setNotice("The improvement was preserved, but the connection could not be saved.");
    }
  }

  function remove(ref: OpsRecordRef, relationship?: OpsRelationship) {
    setNotice("");
    if (!improvementId) {
      onPendingRecordsChange?.(pendingRecords.filter((item) => !areRecordRefsEqual(item, ref)));
      return;
    }
    if (relationship && removeImprovementOperationalConnection(relationship, improvementId)) setNotice("Connection removed. Both operational records remain unchanged.");
  }

  return <section className={cn("min-w-0", !compact && "rounded-xl border bg-card")} aria-labelledby={`related-operational-records-${improvementId ?? "new"}`}>
    <div className={cn("flex flex-wrap items-start justify-between gap-3", compact ? "pb-3" : "border-b px-4 py-4 sm:px-5")}>
      <div><h2 id={`related-operational-records-${improvementId ?? "new"}`} className="text-sm font-semibold">Related Operational Records</h2><p className="mt-1 text-xs text-muted-foreground">Optional traceability to existing Gemba observations, Red Tags, or Audits.</p></div>
      {editable && <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}><Plus className="size-3.5" />Connect Record</Button>}
    </div>
    {notice && <p role="status" className={cn("text-xs", compact ? "pb-3" : "border-b px-4 py-2 sm:px-5", notice.includes("could not") || notice.includes("Unable") ? "text-destructive" : "text-muted-foreground")}>{notice}</p>}
    <div className={cn(compact ? "grid gap-2" : "divide-y")}>
      {records.length ? records.map(({ ref, relationship }) => {
        const option = options.find((item) => areRecordRefsEqual(item.ref, ref));
        const route = resolveRecordRoute(ref);
        const removable = !improvementId || Boolean(relationship && canRemoveImprovementOperationalRelationship(relationship, improvementId));
        return <div key={relationship?.id ?? getRecordRefKey(ref)} className={cn("flex min-w-0 items-center gap-3", compact ? "rounded-lg border p-3" : "px-4 py-3 sm:px-5")}>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" size="sm">{getModuleDisplayName(ref.module)}</Badge><span className="break-all font-mono text-[11px] font-semibold text-primary">{ref.childId ?? ref.recordId}</span>{option?.status && <Badge variant="outline" size="sm">{option.status}</Badge>}</div><p className="mt-1 truncate text-sm font-medium">{option?.title ?? ref.label ?? "Linked record unavailable"}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{option?.context ?? "The linked record is currently unavailable."}</p></div>
          <div className="flex shrink-0 items-center gap-1">{route && <Button nativeButton={false} render={<Link href={route} />} variant="ghost" size="sm">View<ExternalLink className="size-3.5" /></Button>}{editable && removable && <Button type="button" variant="ghost" size="sm" onClick={() => remove(ref, relationship)} aria-label={`Remove connection to ${ref.childId ?? ref.recordId}`}><Unlink className="size-4" /><span className="hidden sm:inline">Remove connection</span></Button>}</div>
        </div>;
      }) : <div className={cn("text-center", compact ? "rounded-lg border border-dashed p-4" : "px-4 py-8 sm:px-5")}><Link2 className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No related operational records</p><p className="mt-1 text-xs text-muted-foreground">This improvement remains valid without a connection.</p></div>}
    </div>
    <ConnectRecordDialog open={pickerOpen} onOpenChange={setPickerOpen} options={options} connected={records.map((item) => item.ref)} onConnect={connect} />
  </section>;
}

function useOperationalRecordOptions() {
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const access = useModuleEntitlements();
  const gemba = useGembaStore();
  const redTags = useRedTags();
  const audits = useFiveSAuditStore();
  return useMemo(() => {
    const result: OperationalRecordOption[] = [];
    if (access.gemba) {
      const walks = visibleGembaWalks(gemba.walks, currentUser, adminUser?.roles);
      const walkIds = new Set(walks.map((walk) => walk.id));
      for (const observation of gemba.observations.filter((item) => walkIds.has(item.gembaId))) {
        const walk = walks.find((item) => item.id === observation.gembaId);
        if (!walk || !canViewGembaWalk(walk, currentUser, adminUser?.roles)) continue;
        result.push({ ref: { module: "gemba", recordId: observation.gembaId, childId: observation.id }, title: observation.title, context: `${observation.location} · ${walk.zone}`, status: observation.type });
      }
    }
    if (access.redTag && hasPermission(adminUser, "red_tag.view")) for (const tag of redTags) result.push({ ref: { module: "redTag", recordId: tag.id }, title: tag.itemName, context: `${tag.zone} · ${tag.section}`, status: tag.status });
    if (access.audit && hasPermission(adminUser, "audits.view")) for (const audit of audits) result.push({ ref: { module: "audit", recordId: audit.id }, title: audit.title, context: `${audit.area} · ${audit.plant}`, status: audit.status });
    return result;
  }, [access.audit, access.gemba, access.redTag, adminUser, audits, currentUser, gemba.observations, gemba.walks, redTags]);
}

function ConnectRecordDialog({ open, onOpenChange, options, connected, onConnect }: { open: boolean; onOpenChange: (open: boolean) => void; options: OperationalRecordOption[]; connected: OpsRecordRef[]; onConnect: (ref: OpsRecordRef) => void }) {
  const [module, setModule] = useState<PickerModule>("gemba");
  const [search, setSearch] = useState("");
  const visible = options.filter((item) => item.ref.module === module && !connected.some((ref) => areRecordRefsEqual(ref, item.ref)) && `${item.ref.recordId} ${item.ref.childId ?? ""} ${item.title} ${item.context}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Connect Operational Record</DialogTitle><DialogDescription>Select an existing record. This adds traceability only and does not change either workflow.</DialogDescription></DialogHeader><div className="grid gap-3"><div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Operational record module">{(["gemba", "redTag", "audit"] as PickerModule[]).map((value) => <Button key={value} type="button" variant={module === value ? "secondary" : "outline"} aria-pressed={module === value} onClick={() => { setModule(value); setSearch(""); }}>{getModuleDisplayName(value)}</Button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder={`Search ${getModuleDisplayName(module)} records...`} /></div><div className="grid max-h-[45vh] gap-2 overflow-y-auto">{visible.map((item) => <button key={getRecordRefKey(item.ref)} type="button" onClick={() => onConnect(item.ref)} className="min-w-0 rounded-lg border p-3 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center justify-between gap-2"><span className="break-all font-mono text-xs font-semibold text-primary">{item.ref.childId ?? item.ref.recordId}</span>{item.status && <Badge variant="secondary" size="sm">{item.status}</Badge>}</div><p className="mt-1 truncate text-sm font-medium">{item.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.context}</p></button>)}{!visible.length && <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No available {getModuleDisplayName(module)} records match this search.</div>}</div></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></DialogFooter></DialogContent></Dialog>;
}
