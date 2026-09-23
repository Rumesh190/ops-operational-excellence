"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, Check, CheckCircle2, Circle, ExternalLink, Eye, Flag, Footprints, Image as ImageIcon, Link2, LockKeyhole, Package, Plus, Printer, QrCode as QrCodeIcon, Search, Trash2, Upload, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { CreateLinkedActionDialog, type LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
import { hasPermission } from "@/features/five-s/administration/permissions";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { FIVE_S_ZONE_CONFIGURATION, toLocalInputDate } from "@/lib/five-s/configuration";
import { useCurrentUser } from "@/lib/current-user";
import { ACTION_STATUS_CONFIG, getActionDueLabel } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { addRedTagAfterEvidence, closeRedTag, closeRedTagAfterRemoval, completeRedTagDisposition, confirmRedTagKeep, createRedTagV2, linkRedTagAction, markTagPrinted, reconcileRedTagActions, recordRedTagDecision, startRedTagDisposition, submitRedTagForReview, updateFurtherEvaluationDecision, useRedTags, verifyRedTag, verifyRedTagDisposition } from "./store";
import { getRedTagLifecycleStageIndex, RED_TAG_CATEGORIES, RED_TAG_DECISION_LABELS, RED_TAG_DECISIONS, RED_TAG_DISPOSITIONS, RED_TAG_LIFECYCLE_STAGES, RED_TAG_REASONS, RED_TAG_SECTIONS, type RedTag, type RedTagCategory, type RedTagDecision, type RedTagDisposition, type RedTagEvidence, type RedTagReason, type RedTagStatus } from "./types";
import { useI18n } from "@/components/preferences/use-i18n";
import { optimizeEvidenceImage } from "@/lib/evidence-images";
import { getIncomingRelationships } from "@/lib/relationships/relationship-store";
import { canCreateRedTag } from "./access";
import { RedTagNav } from "./red-tag-nav";
import { getRedTagQrTarget, getRedTagRecordPath } from "./qr";

const STATUS_TONE: Record<RedTagStatus, "danger" | "warning" | "success" | "secondary"> = {
  Open: "danger", "Under Review": "warning", "Decision Made": "warning", "Disposition In Progress": "warning", "In Progress": "warning", "Awaiting Verification": "success", Closed: "secondary",
};

function displayDate(value: string, time = false) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(value));
}

function Summary({ tags }: { tags: RedTag[] }) {
  const items = [
    { label: "Total Tags", value: tags.length },
    { label: "Open", value: tags.filter((tag) => tag.status === "Open").length },
    { label: "In Progress", value: tags.filter((tag) => ["Under Review", "Decision Made", "Disposition In Progress", "In Progress"].includes(tag.status)).length },
    { label: "Awaiting Verification", value: tags.filter((tag) => tag.status === "Awaiting Verification").length },
  ];
  return <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-4">
    {items.map((item) => <div key={item.label} className="border-b p-4 last:border-0 even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0">
      <p className="text-xs font-medium text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{item.value}</p>
    </div>)}
  </div>;
}

export function RedTagListPage() {
  const router = useRouter();
  const { t } = useI18n();
  const tags = useRedTags();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((item) => item.id === currentUser.id);
  const mayCreate = canCreateRedTag(adminUser);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("All"); const [section, setSection] = useState("All");
  const [reason, setReason] = useState("All"); const [person, setPerson] = useState("All"); const [date, setDate] = useState("");
  const people = [...new Set(tags.map((tag) => tag.responsiblePersonName).filter((value): value is string => Boolean(value)))];
  const filtered = tags.filter((tag) => {
    const term = search.toLowerCase();
    return (!term || `${tag.tagNumber} ${tag.itemName} ${tag.remarks}`.toLowerCase().includes(term)) &&
      (status === "All" || tag.status === status) && (section === "All" || tag.section === section) &&
      (reason === "All" || tag.reason === reason) && (person === "All" || tag.responsiblePersonName === person) &&
      (!date || tag.createdAt.slice(0, 10) === date);
  });
  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="5S Workplace Organization" title="5S Red Tags" description="Identify, label, and track items that should be removed or dispositioned from the workplace."
      actions={mayCreate ? <Button onClick={() => router.push("/5s/red/create")}><Plus className="size-4" /> {t("redTag.create")}</Button> : undefined} />
    <RedTagNav />
    <Summary tags={tags} />
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-2 border-b bg-muted/15 p-3 md:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(130px,1fr))]">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search tags or items..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Filter value={status} onChange={setStatus} label="All statuses" options={["Open", "Under Review", "Decision Made", "Disposition In Progress", "Awaiting Verification", "Closed", "In Progress"]} />
        <Filter value={section} onChange={setSection} label="All sections" options={[...RED_TAG_SECTIONS]} />
        <Filter value={reason} onChange={setReason} label="All reasons" options={[...RED_TAG_REASONS]} />
        <Filter value={person} onChange={setPerson} label="All responsible" options={people} />
        <Input type="date" aria-label="Created date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid gap-3 p-3 md:hidden">{filtered.map((tag) => <button key={tag.id} onClick={() => router.push(`/5s/red/${tag.id}`)} className="min-w-0 rounded-xl border bg-background p-4 text-left active:bg-muted/40"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-bold text-red-700 dark:text-red-400">{tag.tagNumber}</p><h2 className="mt-1 break-words font-semibold">{tag.itemName}</h2></div><Badge variant={STATUS_TONE[tag.status]}>{tag.status}</Badge></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm"><div><dt className="text-xs text-muted-foreground">Section</dt><dd className="mt-1 break-words font-medium">{tag.section}</dd></div><div><dt className="text-xs text-muted-foreground">Reason</dt><dd className="mt-1 break-words font-medium">{tag.reason}</dd></div><div><dt className="text-xs text-muted-foreground">Responsible</dt><dd className="mt-1 break-words font-medium">{tag.responsiblePersonName ?? "Not assigned"}</dd></div><div><dt className="text-xs text-muted-foreground">Target</dt><dd className="mt-1 font-medium">{tag.targetDate ? displayDate(tag.targetDate) : "Not set"}</dd></div></dl></button>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1180px] text-sm"><thead className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr>
        {["Tag ID", "Item / Issue", "Location", "Responsible Person", "Target Date", "Status", "Linked Action", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
      </tr></thead><tbody>{filtered.map((tag) => <tr key={tag.id} className="border-b last:border-0 hover:bg-muted/20">
        <td className="px-4 py-3 font-mono text-xs font-semibold text-red-700 dark:text-red-400">{tag.tagNumber}</td><td className="px-4 py-3 font-medium">{tag.itemName}</td>
        <td className="px-4 py-3">{tag.zone} · {tag.section}</td><td className="px-4 py-3">{tag.responsiblePersonName ?? "Not assigned"}</td>
        <td className="px-4 py-3 whitespace-nowrap">{tag.targetDate ? displayDate(tag.targetDate) : "Not set"}</td><td className="px-4 py-3"><Badge variant={STATUS_TONE[tag.status]}>{tag.status}</Badge></td>
        <td className="px-4 py-3 font-mono text-xs">{tag.actionId ?? "—"}</td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => router.push(`/5s/red/${tag.id}`)}><Eye className="size-4" /> View</Button></td>
      </tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="py-14 text-center text-sm text-muted-foreground">No Red Tags match the selected filters.</div>}
    </section>
  </PageContainer>;
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[] }) {
  return <Select value={value} onValueChange={(v) => onChange(v ?? "All")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">{label}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>;
}

export function RedTagCreatePage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((item) => item.id === currentUser.id);
  if (!canCreateRedTag(adminUser)) {
    return <PageContainer><div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed"><div className="max-w-md text-center"><LockKeyhole className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-3 font-semibold">Red Tag creation unavailable</h1><p className="mt-2 text-sm text-muted-foreground">You do not have permission to create Red Tags.</p><Button className="mt-4" variant="outline" onClick={() => router.push("/5s/red")}>Back to Red Tags</Button></div></div></PageContainer>;
  }
  return <RedTagCreateForm />;
}

function RedTagCreateForm() {
  const router = useRouter(); const user = useCurrentUser();
  const { t } = useI18n();
  const today = useMemo(() => toLocalInputDate(new Date()), []);
  const [zone, setZone] = useState(user.primaryZone); const [location, setLocation] = useState(""); const [item, setItem] = useState(""); const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<RedTagReason | "">(""); const [customReason, setCustomReason] = useState(""); const [remarks, setRemarks] = useState("");
  const [category, setCategory] = useState<RedTagCategory | "">(""); const [estimatedValue, setEstimatedValue] = useState(""); const [imageUrl, setImageUrl] = useState<string>(); const [preview, setPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null); const zoneConfig = FIVE_S_ZONE_CONFIGURATION.find((z) => z.name === zone);
  const parsedValue = estimatedValue.trim() ? Number(estimatedValue) : undefined;
  const valid = Boolean(item.trim() && remarks.trim() && Number(quantity) >= 1 && location.trim() && zoneConfig?.department && reason && (reason !== "Others" || customReason.trim()) && category && imageUrl && (parsedValue === undefined || (Number.isFinite(parsedValue) && parsedValue >= 0)));
  async function imageChanged(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (!file) return; try { const { dataUrl } = await optimizeEvidenceImage(file); setImageUrl(dataUrl); } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to process this image."); } e.target.value = ""; }
  function submit() { if (!valid || !reason || !category || !zoneConfig || !imageUrl || creating) return; setCreating(true); window.setTimeout(() => { try { const tag = createRedTagV2({ plant: user.plant, zone, section: location.trim(), department: zoneConfig.department, category, estimatedValue: parsedValue, itemName: item.trim(), quantity: Number(quantity), reason, customReason: customReason.trim() || undefined, remarks: remarks.trim(), createdById: user.id, createdByName: user.name, imageUrl }, user); if (!tag) { setCreating(false); return; } router.push(`/5s/red/${tag.id}`); } catch { setCreating(false); } }, 240); }
  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="Red Tags / Create" title="Create Red Tag" description="Identify a physical item and capture the context needed for review."
      leading={<Button variant="ghost" size="icon-sm" onClick={() => router.push("/5s/red")}><ArrowLeft className="size-4" /></Button>}
      actions={<><Button variant="ghost" onClick={() => router.push("/5s/red")} disabled={creating}>{t("common.cancel")}</Button><Button disabled={!valid || creating} onClick={submit}><Plus className="size-4" /> {creating ? "Creating Tag..." : t("redTag.create")}</Button></>} />
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-5">
      <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <ReadOnly label="Plant" value={user.plant} /><Field label="Zone"><Select value={zone} onValueChange={(v) => setZone(v ?? user.primaryZone)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIVE_S_ZONE_CONFIGURATION.map((z) => <SelectItem key={z.name} value={z.name}>{z.name}</SelectItem>)}</SelectContent></Select></Field>
        <ReadOnly label="Department" value={zoneConfig?.department ?? "—"} /><ReadOnly label="Tag ID" value={`RT-EGM-${zoneConfig?.code ?? "ZA"}-###`} /><ReadOnly label="Date Identified" value={today} /><ReadOnly label="Identified By" value={user.name} />
      </CardContent></Card>
      <Card><CardContent className="grid gap-5 p-5">
        <div><h2 className="font-semibold">Physical Item</h2><p className="mt-1 text-xs text-muted-foreground">Record what was tagged and where it was found.</p></div>
        <div className="grid gap-4 md:grid-cols-[2fr_140px_1fr]"><Field label="Item Name"><Input required value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Obsolete welding fixture" /></Field><Field label="Quantity"><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field><Field label="Category"><Select value={category} onValueChange={(value) => setCategory((value ?? "") as RedTagCategory | "")}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{RED_TAG_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Location"><Input required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Area, bay, rack, or workstation" /></Field><Field label="Estimated Value (optional)"><Input type="number" min="0" step="0.01" value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} placeholder="0.00" /></Field></div>
        <Field label="Item Description"><Textarea required value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Describe the item and its current condition." /></Field>
      </CardContent></Card>
      <Card><CardContent className="grid gap-5 p-5">
        <div><h2 className="font-semibold">Tagging Reason</h2><p className="mt-1 text-xs text-muted-foreground">Explain why this physical item needs review.</p></div>
        <Field label="Reason"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{RED_TAG_REASONS.map((option) => <button key={option} type="button" onClick={() => setReason(option)} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${reason === option ? "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500/30 dark:bg-red-950/35 dark:text-red-200" : "bg-background hover:border-red-300 hover:bg-red-50/40 dark:hover:bg-red-950/15"}`}>{reason === option && <CheckCircle2 className="mr-2 inline size-4" />}{option}</button>)}</div></Field>
        {reason === "Others" && <Field label="Specify Reason"><Input required value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Enter the reason" /></Field>}
      </CardContent></Card>
      <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Item Photo</h2><p className="mt-1 text-xs text-muted-foreground">At least one photo is required for a physical Red Tag.</p></div>
        <Field label="Photo *"><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}><Upload className="size-4" /> Upload Photo</Button><Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}><Camera className="size-4" /> Take Photo</Button><input ref={uploadRef} hidden type="file" accept="image/*" onChange={imageChanged} /><input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={imageChanged} />{imageUrl && <div className="flex items-center gap-2 rounded-lg border p-1.5"><button type="button" onClick={() => setPreview(true)}><img src={imageUrl} alt="Item preview" className="size-16 rounded object-cover" /></button><Button type="button" size="icon-sm" variant="ghost" onClick={() => setImageUrl(undefined)} aria-label="Remove item photo"><Trash2 className="size-4" /></Button></div>}</div></Field>
      </CardContent></Card>
      <div className="flex justify-end sm:hidden"><Button className="w-full" disabled={!valid || creating} type="submit"><Plus className="size-4" /> {creating ? "Creating Tag..." : "Create Red Tag"}</Button></div>
    </form>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Issue Photo</DialogTitle></DialogHeader>{imageUrl && <img src={imageUrl} alt="Issue full-screen preview" className="max-h-[75vh] w-full object-contain" />}</DialogContent></Dialog>
  </PageContainer>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid content-start gap-2"><Label>{label}</Label>{children}</div>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <Field label={label}><div className="flex h-10 items-center rounded-md border bg-muted/35 px-3 text-sm font-medium">{value}</div></Field>; }

function useRedTagQrTarget(tagId: string) {
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "");
  return getRedTagQrTarget(tagId, origin);
}

export function RedTagDetailPage({ tagId }: { tagId: string }) {
  const router = useRouter();
  const tags = useRedTags();
  const actions = useActionStore();
  const user = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((item) => item.id === user.id);
  const tag = tags.find((item) => item.id === tagId);
  const action = tag?.actionId ? actions.find((item) => item.id === tag.actionId) : undefined;
  const mayManage = hasPermission(adminUser, "red_tag.manage") || hasPermission(adminUser, "actions.review");
  const [actionOpen, setActionOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrTarget = useRedTagQrTarget(tagId);
  
  // Query Phase 4 relationships to find Gemba source
  const gembaSource = useMemo(() => {
    if (!tag) return null;
    const incoming = getIncomingRelationships({
      module: "redTag",
      recordId: tag.id,
    });
    const gembaRel = incoming.find((rel) => 
      rel.from.module === "gemba" && rel.relationshipType === "red-tag"
    );
    return gembaRel ? {
      walkId: gembaRel.from.recordId,
      observationId: gembaRel.from.childId,
      title: gembaRel.metadata?.title as string | undefined,
    } : null;
  }, [tag]);
  
  useEffect(() => { reconcileRedTagActions(actions); }, [actions]);
  if (!tag) return <Missing onBack={() => router.push("/5s/red")} />;
  const actionContext: LinkedActionContext = {
    source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceObservation: tag.decisionRecord ? `Decision · ${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]}` : tag.remarks || tag.reason,
    title: `Execute ${tag.tagNumber}: ${tag.itemName}`, description: tag.decisionRecord ? `${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} · ${tag.remarks}` : tag.requiredAction ?? tag.remarks,
    plant: tag.plant, zone: tag.zone, location: tag.section,
    evidence: [],
    defaultResponsibleId: tag.dispositionDetails?.responsiblePersonId ?? tag.responsiblePersonId, defaultDueDate: tag.dispositionDetails?.targetDate ?? tag.targetDate,
  };
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Red Tags / Details" title={tag.tagNumber} description={`${tag.itemName} · ${tag.section}`}
    leading={<Button variant="ghost" size="icon-sm" onClick={() => router.push("/5s/red")}><ArrowLeft className="size-4" /></Button>}
    actions={<><Button variant="outline" onClick={() => setQrOpen(true)}><QrCodeIcon className="size-4" /> View QR</Button><Button variant="outline" onClick={() => router.push(`/5s/red/${tag.id}/print`)}><Printer className="size-4" /> Print Red Tag</Button></>} />
    <RedTagLifecycleIndicator status={tag.status} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.7fr)]"><div className="grid gap-5">
      <Card><CardContent className="grid gap-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Item Details</h2><Badge variant={STATUS_TONE[tag.status]}>{tag.status}</Badge></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Meta icon={Package} label="Item / Equipment" value={tag.itemName} /><Meta label="Red Tag ID" value={tag.tagNumber} /><Meta label="Quantity" value={String(tag.quantity)} /><Meta label="Category" value={tag.category ?? "Not recorded"} /><Meta label="Location" value={`${tag.plant} · ${tag.zone} · ${tag.section}`} /><Meta label="Department" value={tag.department ?? "Not recorded"} /><Meta label="Reason" value={tag.reason === "Others" ? tag.customReason ?? tag.reason : tag.reason} />{tag.estimatedValue !== undefined && <Meta label="Estimated Value" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tag.estimatedValue)} />}<Meta icon={CalendarDays} label="Identified Date" value={displayDate(tag.createdAt, true)} /><Meta icon={UserRound} label="Identified By" value={tag.createdByName} /></div><div className="border-t pt-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item Description</p><p className="mt-2 text-sm leading-6">{tag.remarks || "No description added."}</p></div></CardContent></Card>
      {gembaSource && <Card><CardContent className="p-5"><div className="flex items-center gap-2"><Footprints className="size-5 text-primary" /><h2 className="font-semibold">Source: Gemba Observation</h2></div><p className="mt-2 text-sm text-muted-foreground">This Red Tag was created from a Gemba walk observation.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Meta label="Gemba Walk" value={gembaSource.walkId} /><Meta label="Observation" value={gembaSource.observationId ?? "Not recorded"} />{gembaSource.title && <Meta label="Observation Title" value={gembaSource.title} />}</div><Button className="mt-4" variant="outline" size="sm" nativeButton={false} render={<Link href={`/gemba/${gembaSource.walkId}`} />}><ExternalLink className="size-3.5" />View Gemba Walk</Button></CardContent></Card>}
      <Card><CardContent className="p-5"><h2 className="font-semibold">Original Item Photo</h2>{tag.imageUrl ? <img src={tag.imageUrl} alt={tag.itemName} className="mt-4 max-h-[520px] w-full rounded-lg border object-contain" /> : <div className="mt-4 grid h-40 place-items-center rounded-lg border border-dashed text-muted-foreground"><ImageIcon className="size-8" /></div>}</CardContent></Card>
      <RedTagReviewDecisionSection tag={tag} mayManage={mayManage} user={user} />
      <RedTagDispositionSection tag={tag} action={action} mayManage={mayManage} user={user} users={adminUsers} />
      <LinkedActionSection action={action} mayCreate={mayManage && ["Decision Made", "Disposition In Progress"].includes(tag.status) && Boolean(tag.decisionRecord && !["keep", "further_evaluation"].includes(tag.decisionRecord.type))} onCreate={() => setActionOpen(true)} />
      {(tag.status === "Awaiting Verification" || tag.status === "Closed") && <RedTagVerificationSection tag={tag} action={action} mayManage={mayManage} user={user} />}
    </div><aside className="grid content-start gap-5"><Card><CardContent className="grid justify-items-center p-5"><QrCode value={qrTarget} size={176} /><p className="mt-3 font-mono text-sm font-bold">{tag.tagNumber}</p><p className="mt-1 text-xs text-muted-foreground">Scan to view Red Tag</p><Button className="mt-4" variant="outline" onClick={() => setQrOpen(true)}><QrCodeIcon className="size-4" />View QR</Button></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Tag History</h2><div className="mt-5 grid gap-0">{tag.history.map((event, i) => <div key={event.id} className="relative grid grid-cols-[18px_1fr] gap-3 pb-5 last:pb-0"><div className="relative"><span className="absolute left-[5px] top-1 size-2.5 rounded-full bg-red-600" />{i < tag.history.length - 1 && <span className="absolute left-[9px] top-4 h-full w-px bg-border" />}</div><div><p className="text-sm font-semibold">{event.label}</p><p className="mt-1 text-xs text-muted-foreground">{displayDate(event.at, true)} · by {event.actor}</p></div></div>)}</div></CardContent></Card></aside></div>
    <CreateLinkedActionDialog key={tag.id} open={actionOpen} onOpenChange={setActionOpen} context={tag.actionId ? null : actionContext} onCreated={(created) => { const linked = linkRedTagAction(tag.id, created.id, user); if (!linked) return false; setActionOpen(false); return true; }} />
    <Dialog open={qrOpen} onOpenChange={setQrOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Red Tag QR</DialogTitle></DialogHeader><div className="grid justify-items-center gap-3 py-3 text-center"><p className="font-mono text-lg font-bold">{tag.tagNumber}</p><p className="text-sm font-semibold">{tag.itemName}</p><QrCode value={qrTarget} size={240} /><p className="text-sm font-medium">Scan to view Red Tag</p><p className="text-xs text-muted-foreground">{tag.zone} · {tag.section}</p></div></DialogContent></Dialog>
  </PageContainer>;
}

function RedTagLifecycleIndicator({ status }: { status: RedTagStatus }) {
  const active = getRedTagLifecycleStageIndex(status);
  return <Card><CardContent className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">{RED_TAG_LIFECYCLE_STAGES.map((stage, index) => {
    const complete = index < active; const current = index === active;
    return <div key={stage} aria-current={current ? "step" : undefined} className="flex min-w-0 items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full border ${complete ? "border-emerald-600 bg-emerald-600 text-white" : current ? "border-red-600 bg-red-600 text-white" : "bg-background text-muted-foreground"}`}>{complete ? <Check className="size-4" /> : <Circle className="size-3 fill-current" />}</span><span className={`truncate text-xs font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}>{stage}</span></div>;
  })}</CardContent></Card>;
}

function RedTagReviewDecisionSection({ tag, mayManage, user }: { tag: RedTag; mayManage: boolean; user: ReturnType<typeof useCurrentUser> }) {
  const [decision, setDecision] = useState<RedTagDecision | "">(tag.decisionRecord?.type ?? "");
  const [comments, setComments] = useState(tag.review?.comments ?? "");
  const [error, setError] = useState("");
  const assignedToCurrentUser = tag.review?.reviewerId === user.id;

  function submitForReview() {
    if (!submitRedTagForReview(tag.id, { reviewerId: user.id, reviewerName: user.name }, user)) setError("Unable to submit this Red Tag for review.");
    else setError("");
  }
  function saveDecision() {
    if (!decision) { setError("Select a decision before completing the review."); return; }
    if (!recordRedTagDecision(tag.id, { decision, comments }, user)) setError("Unable to record this decision. Only the assigned reviewer can complete the review.");
    else setError("");
  }

  return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Review and Decision</h2><p className="mt-1 text-xs text-muted-foreground">Review the original item context and photo before recording a decision.</p></div>
    {tag.status === "Open" ? <div className="rounded-lg border border-dashed p-4"><p className="text-sm text-muted-foreground">This Red Tag is ready to enter review.</p>{mayManage ? <Button className="mt-3" onClick={submitForReview}><CheckCircle2 className="size-4" />Submit for Review</Button> : <p className="mt-2 text-xs text-muted-foreground">A user with Red Tag management permission must submit it.</p>}</div> : tag.status === "Under Review" ? <div className="grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><Meta icon={UserRound} label="Reviewer" value={tag.review?.reviewerName ?? "Not assigned"} /><Meta icon={CalendarDays} label="Review Date" value={tag.review?.submittedAt ? displayDate(tag.review.submittedAt, true) : "Not recorded"} /></div>{assignedToCurrentUser && mayManage ? <><Field label="Decision"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{RED_TAG_DECISIONS.map((item) => <button key={item} type="button" onClick={() => setDecision(item)} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${decision === item ? "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500/30 dark:bg-red-950/35 dark:text-red-200" : "bg-background hover:border-red-300"}`}>{RED_TAG_DECISION_LABELS[item]}</button>)}</div></Field><Field label="Review Comments"><Textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Add the reasoning or conditions for this decision." /></Field><Button className="w-fit" onClick={saveDecision} disabled={!decision}><CheckCircle2 className="size-4" />Record Decision</Button></> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Waiting for {tag.review?.reviewerName ?? "the assigned reviewer"} to record a decision.</p>}</div> : tag.decisionRecord ? <div className="grid gap-4 sm:grid-cols-2"><Meta label="Decision" value={RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} /><Meta label="Decided By" value={tag.decisionRecord.decidedByName} /><Meta label="Decision Date" value={displayDate(tag.decisionRecord.decidedAt, true)} />{tag.decisionRecord.comments && <Meta label="Comments" value={tag.decisionRecord.comments} />}</div> : <p className="text-sm text-muted-foreground">This legacy Red Tag does not have a V2 decision record.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent></Card>;
}

function RedTagDispositionSection({ tag, action, mayManage, user, users }: { tag: RedTag; action?: ReturnType<typeof useActionStore>[number]; mayManage: boolean; user: ReturnType<typeof useCurrentUser>; users: ReturnType<typeof useAdminUsers> }) {
  const [responsibleId, setResponsibleId] = useState(tag.dispositionDetails?.responsiblePersonId ?? "");
  const [targetDate, setTargetDate] = useState(tag.dispositionDetails?.targetDate ?? "");
  const [executionNotes, setExecutionNotes] = useState(tag.dispositionDetails?.executionNotes ?? "");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [completionNotes, setCompletionNotes] = useState(tag.dispositionDetails?.completionNotes ?? "");
  const [responsibleConfirmed, setResponsibleConfirmed] = useState(false);
  const [evidence, setEvidence] = useState<RedTagEvidence[]>([]);
  const [keepJustification, setKeepJustification] = useState(tag.keepConfirmation?.justification ?? "");
  const [replacement, setReplacement] = useState<Exclude<RedTagDecision, "further_evaluation"> | "">("");
  const [replacementComments, setReplacementComments] = useState("");
  const [error, setError] = useState("");
  const decision = tag.decisionRecord?.type;
  const eligibleUsers = users.filter((item) => item.status === "Active");

  function start() {
    const responsible = eligibleUsers.find((item) => item.id === responsibleId);
    if (!responsible || !targetDate || !executionNotes.trim()) { setError("Select a responsible person, target date, and enter execution notes."); return; }
    if (!startRedTagDisposition(tag.id, { responsiblePersonId: responsible.id, responsiblePersonName: responsible.name, targetDate, executionNotes, approval: approvalConfirmed ? { approved: true, approvedAt: new Date().toISOString(), approvedByUserId: user.id, approvedByName: user.name, comment: approvalComment.trim() || undefined } : undefined }, user)) setError("Unable to start disposition.");
    else setError("");
  }
  function complete() {
    if (!completionNotes.trim() || !responsibleConfirmed || !evidence.length) { setError("Completion notes, responsible-person confirmation, and at least one evidence photo are required."); return; }
    if (tag.actionId && action?.status !== "Completed") { setError(`Complete Action ${tag.actionId} before completing disposition.`); return; }
    if (!completeRedTagDisposition(tag.id, { evidence, completionNotes, responsibleConfirmed }, user)) setError("Unable to complete disposition.");
    else { setEvidence([]); setError(""); }
  }
  function confirmKeep() {
    if (!confirmRedTagKeep(tag.id, keepJustification, user)) setError("Enter a Keep justification before continuing to verification.");
    else setError("");
  }
  function replaceDecision() {
    if (!replacement || !updateFurtherEvaluationDecision(tag.id, replacement, replacementComments, user)) setError("Select a final decision before continuing.");
    else setError("");
  }

  if (!tag.decisionRecord) return <Card><CardContent className="p-5"><h2 className="font-semibold">Disposition</h2><p className="mt-2 text-sm text-muted-foreground">Pending a recorded decision.</p></CardContent></Card>;
  if (decision === "further_evaluation") return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Further Evaluation</h2><p className="mt-1 text-sm text-muted-foreground">A final decision is required before disposition, verification, or closure.</p></div>{mayManage && tag.status === "Decision Made" ? <><Field label="Final Decision"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{RED_TAG_DECISIONS.filter((item) => item !== "further_evaluation").map((item) => <button type="button" key={item} onClick={() => setReplacement(item)} className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${replacement === item ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/35 dark:text-red-200" : "bg-background"}`}>{RED_TAG_DECISION_LABELS[item]}</button>)}</div></Field><Field label="Evaluation Comments"><Textarea value={replacementComments} onChange={(event) => setReplacementComments(event.target.value)} /></Field><Button className="w-fit" disabled={!replacement} onClick={replaceDecision}>Update Decision</Button></> : <p className="text-sm text-muted-foreground">Waiting for an authorized user to update the decision.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
  if (decision === "keep") return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Keep Confirmation</h2><p className="mt-1 text-sm text-muted-foreground">Confirm why the item should remain. No disposition or Action is required.</p></div>{tag.keepConfirmation ? <div className="grid gap-4 sm:grid-cols-2"><Meta label="Justification" value={tag.keepConfirmation.justification} /><Meta label="Confirmed By" value={`${tag.keepConfirmation.confirmedByName} · ${displayDate(tag.keepConfirmation.confirmedAt, true)}`} /></div> : mayManage && tag.status === "Decision Made" ? <><Field label="Keep Justification"><Textarea value={keepJustification} onChange={(event) => setKeepJustification(event.target.value)} placeholder="Explain why retaining this item is appropriate." /></Field><Button className="w-fit" disabled={!keepJustification.trim()} onClick={confirmKeep}>Confirm Keep & Continue</Button></> : <p className="text-sm text-muted-foreground">Waiting for an authorized Keep confirmation.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;

  return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Disposition</h2><p className="mt-1 text-sm text-muted-foreground">Execute the recorded {RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} decision. A linked Action is optional.</p></div>{tag.status === "Decision Made" ? mayManage ? <><div className="grid gap-4 sm:grid-cols-2"><Field label="Responsible Person"><Select value={responsibleId} onValueChange={(value) => setResponsibleId(value ?? "")}><SelectTrigger><SelectValue placeholder="Select responsible person" /></SelectTrigger><SelectContent>{eligibleUsers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Target Date"><Input type="date" min={toLocalInputDate(new Date())} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></Field></div><Field label="Execution Notes"><Textarea value={executionNotes} onChange={(event) => setExecutionNotes(event.target.value)} placeholder="Describe how this disposition will be executed." /></Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} /><span>Record approval for this disposition, if required.</span></label>{approvalConfirmed && <Field label="Approval Comment (optional)"><Input value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} /></Field>}<Button className="w-fit" onClick={start}>Start Disposition</Button></> : <p className="text-sm text-muted-foreground">An authorized user must start disposition.</p> : tag.dispositionDetails ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Decision" value={RED_TAG_DECISION_LABELS[tag.dispositionDetails.decision]} /><Meta label="Responsible" value={tag.dispositionDetails.responsiblePersonName} /><Meta label="Target Date" value={displayDate(tag.dispositionDetails.targetDate)} />{tag.dispositionDetails.executionNotes && <Meta label="Execution Notes" value={tag.dispositionDetails.executionNotes} />}{tag.dispositionDetails.approval?.approved && <Meta label="Approval" value={`${tag.dispositionDetails.approval.approvedByName} · ${displayDate(tag.dispositionDetails.approval.approvedAt, true)}`} />}{tag.dispositionDetails.completedAt && <Meta label="Completed" value={displayDate(tag.dispositionDetails.completedAt, true)} />}{tag.dispositionDetails.completionNotes && <Meta label="Completion Notes" value={tag.dispositionDetails.completionNotes} />}</div>{tag.status === "Disposition In Progress" && mayManage && <div className="grid gap-4 border-t pt-5"><Field label="Completion Notes"><Textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Describe the completed physical work." /></Field><AfterEvidencePicker items={evidence} onChange={setEvidence} userName={user.name} /><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={responsibleConfirmed} onChange={(event) => setResponsibleConfirmed(event.target.checked)} /><span>The responsible person confirms the disposition work is complete.</span></label><Button className="w-fit" disabled={!completionNotes.trim() || !responsibleConfirmed || !evidence.length || Boolean(tag.actionId && action?.status !== "Completed")} onClick={complete}>Complete Disposition</Button>{tag.actionId && action?.status !== "Completed" && <p className="text-xs text-amber-700 dark:text-amber-400">Complete linked Action {tag.actionId} before completing disposition.</p>}</div>}</> : <p className="text-sm text-muted-foreground">Disposition details are unavailable.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
}

function LinkedActionSection({ action, mayCreate, onCreate }: { action?: ReturnType<typeof useActionStore>[number]; mayCreate: boolean; onCreate: () => void }) {
  return <Card><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Optional Execution Action</h2><p className="mt-1 text-xs text-muted-foreground">Create an Action only when execution work needs separate tracking.</p></div>{action && <Badge variant={ACTION_STATUS_CONFIG[action.status].variant}>{action.status}</Badge>}</div>{action ? <div className="mt-4 grid gap-4 sm:grid-cols-3"><Meta label="Action ID" value={action.id} /><Meta label="Owner" value={action.responsiblePersonName || action.assignedTo} /><Meta label="Due" value={getActionDueLabel(action)} /><Button className="w-fit sm:col-span-3" variant="outline" nativeButton={false} render={<Link href={`/actions/${encodeURIComponent(action.id)}`} />}><ExternalLink className="size-4" />View Action</Button></div> : <div className="mt-4 rounded-lg border border-dashed p-4"><p className="text-sm text-muted-foreground">No Action is linked. Disposition may be completed directly with evidence.</p>{mayCreate && <Button className="mt-3" variant="outline" onClick={onCreate}><Link2 className="size-4" />Create Action</Button>}</div>}</CardContent></Card>;
}

function RedTagVerificationSection({ tag, action, mayManage, user }: { tag: RedTag; action?: ReturnType<typeof useActionStore>[number]; mayManage: boolean; user: ReturnType<typeof useCurrentUser> }) {
  const [evidence, setEvidence] = useState<RedTagEvidence[]>([]);
  const [disposition, setDisposition] = useState<RedTagDisposition | "">(tag.disposition ?? "");
  const [dispositionNote, setDispositionNote] = useState(tag.dispositionNote ?? "");
  const [remark, setRemark] = useState(tag.verificationRemark ?? "");
  const [removalConfirmed, setRemovalConfirmed] = useState(false);
  const [error, setError] = useState("");
  const completed = action?.status === "Completed";
  const verified = Boolean(tag.verifiedAt);

  if (tag.decisionRecord) return <RedTagV2VerificationSection tag={tag} action={action} mayManage={mayManage} user={user} />;

  function verify() {
    if (!completed) { setError(`Complete Action ${tag.actionId ?? ""} before verifying this Red Tag.`); return; }
    const availableEvidence = [...(tag.afterEvidence ?? []), ...evidence];
    if (!availableEvidence.length) { setError("Add after evidence before verification."); return; }
    if (!disposition) { setError("Select a disposition before verification."); return; }
    if (disposition === "Other" && !dispositionNote.trim()) { setError("Enter a disposition note for Other."); return; }
    if (!remark.trim()) { setError("Enter a verification remark."); return; }
    if (evidence.length) addRedTagAfterEvidence(tag.id, evidence, user);
    const updated = verifyRedTag(tag.id, action, { disposition, dispositionNote, verificationRemark: remark }, user);
    if (!updated) { setError("Unable to verify this Red Tag. Confirm the Action is completed and all required fields are present."); return; }
    setEvidence([]); setError("");
  }

  function close() {
    if (!removalConfirmed) { setError("Confirm that the physical tag has been removed before closure."); return; }
    if (!closeRedTagAfterRemoval(tag.id, action, removalConfirmed, user)) { setError("Verify the Red Tag and complete its Action before confirming removal."); return; }
    setError("");
  }

  return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Verification and Physical Tag Removal</h2><p className="mt-1 text-xs text-muted-foreground">Action completion does not close the Red Tag. Verify the physical condition, confirm disposition, then remove the tag.</p></div>{tag.status === "Closed" ? <div className="grid gap-4 sm:grid-cols-2"><Meta label="Disposition" value={`${tag.disposition ?? "—"}${tag.dispositionNote ? ` · ${tag.dispositionNote}` : ""}`} /><Meta label="Verified by" value={`${tag.verifiedByName ?? "—"} · ${tag.verifiedAt ? displayDate(tag.verifiedAt, true) : ""}`} /><Meta label="Verification remark" value={tag.verificationRemark ?? "—"} /><Meta label="Closed by" value={`${tag.removedByName ?? "—"} · ${tag.removedAt ? displayDate(tag.removedAt, true) : ""}`} />{tag.afterEvidence?.map((item) => <Image unoptimized width={320} height={256} key={item.id} src={item.url} alt={item.name} className="max-h-64 rounded-lg border object-cover" />)}</div> : mayManage ? <><div className="grid gap-4 md:grid-cols-2"><AfterEvidencePicker items={evidence} onChange={setEvidence} userName={user.name} /><Field label="Disposition"><Select value={disposition} onValueChange={(value) => setDisposition((value ?? "") as RedTagDisposition | "")}><SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger><SelectContent>{RED_TAG_DISPOSITIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>{disposition === "Other" && <Field label="Disposition note"><Input value={dispositionNote} onChange={(event) => setDispositionNote(event.target.value)} /></Field>}<Field label="Verification remark"><Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Describe the verified physical condition and disposition." /></Field></div>{tag.afterEvidence?.length ? <div className="flex flex-wrap gap-3">{tag.afterEvidence.map((item) => <Image unoptimized width={96} height={96} key={item.id} src={item.url} alt={item.name} className="size-24 rounded-lg border object-cover" />)}</div> : undefined}{!verified ? <Button className="w-fit" disabled={!completed} onClick={verify}><CheckCircle2 className="size-4" />Verify Condition</Button> : <div className="grid gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Verified by {tag.verifiedByName} on {tag.verifiedAt ? displayDate(tag.verifiedAt, true) : "—"}. Confirm removal only after the physical tag has been detached.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={removalConfirmed} onChange={(event) => setRemovalConfirmed(event.target.checked)} /><span>I confirm the physical Red Tag has been removed from the item or location.</span></label><Button className="w-fit" disabled={!removalConfirmed} onClick={close}>Confirm Removal & Close</Button></div>}{!completed && <p className="text-xs text-amber-700 dark:text-amber-400">Complete Action {tag.actionId ?? ""} before verifying this Red Tag.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</> : <p className="text-sm text-muted-foreground">A user with Red Tag management or Action review permission must verify and close this tag.</p>}</CardContent></Card>;
}

function RedTagV2VerificationSection({ tag, action, mayManage, user }: { tag: RedTag; action?: ReturnType<typeof useActionStore>[number]; mayManage: boolean; user: ReturnType<typeof useCurrentUser> }) {
  const [result, setResult] = useState<"Passed" | "Failed">("Passed");
  const [comments, setComments] = useState(tag.closure?.verificationDetails ?? "");
  const [evidence, setEvidence] = useState<RedTagEvidence[]>([]);
  const [error, setError] = useState("");
  function verify() {
    if (!comments.trim()) { setError("Verification comments are required."); return; }
    if (!verifyRedTagDisposition(tag.id, { passed: result === "Passed", details: comments, evidence }, user)) setError("Unable to verify this Red Tag.");
    else { setEvidence([]); setError(""); }
  }
  function close() {
    if (!closeRedTag(tag.id, user)) setError("A successful verification is required before closure.");
    else setError("");
  }
  const disposition = tag.dispositionDetails;
  return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Verification and Closure</h2><p className="mt-1 text-xs text-muted-foreground">Physically verify the outcome. Action completion alone never closes this Red Tag.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Decision" value={RED_TAG_DECISION_LABELS[tag.decisionRecord!.type]} /><Meta label="Responsible" value={disposition?.responsiblePersonName ?? tag.keepConfirmation?.confirmedByName ?? "Not applicable"} /><Meta label="Completion Date" value={disposition?.completedAt ? displayDate(disposition.completedAt, true) : tag.keepConfirmation?.confirmedAt ? displayDate(tag.keepConfirmation.confirmedAt, true) : "Not recorded"} />{action && <Meta label="Linked Action" value={`${action.id} · ${action.status}`} />}{disposition?.completionNotes && <Meta label="Completion Notes" value={disposition.completionNotes} />}{tag.keepConfirmation && <Meta label="Keep Justification" value={tag.keepConfirmation.justification} />}</div>{disposition?.evidence.length ? <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completion Evidence</p><div className="mt-3 flex flex-wrap gap-3">{disposition.evidence.map((item) => <Image unoptimized width={128} height={128} key={item.id} src={item.url} alt={item.name} className="size-28 rounded-lg border object-cover" />)}</div></div> : undefined}{tag.status === "Closed" ? <div className="grid gap-4 border-t pt-5 sm:grid-cols-2"><Meta label="Result" value={tag.closure?.verificationResult ?? "—"} /><Meta label="Verified By" value={tag.closure ? `${tag.closure.verifiedByName} · ${displayDate(tag.closure.verifiedAt, true)}` : "—"} /><Meta label="Verification Comments" value={tag.closure?.verificationDetails ?? "—"} /><Meta label="Closed By" value={tag.closure?.closedByName && tag.closure.closedAt ? `${tag.closure.closedByName} · ${displayDate(tag.closure.closedAt, true)}` : "—"} /></div> : tag.closure?.verificationResult === "Passed" ? mayManage ? <div className="grid gap-3 border-t pt-5"><p className="text-sm text-muted-foreground">Verification passed by {tag.closure.verifiedByName} on {displayDate(tag.closure.verifiedAt, true)}.</p><Button className="w-fit" onClick={close}>Close Red Tag</Button></div> : <p className="text-sm text-muted-foreground">Verification passed. An authorized user must close this Red Tag.</p> : mayManage ? <div className="grid gap-4 border-t pt-5"><div className="grid gap-4 sm:grid-cols-2"><ReadOnly label="Verified By" value={user.name} /><ReadOnly label="Verification Date" value={toLocalInputDate(new Date())} /></div><Field label="Verification Result"><div className="flex gap-2"><Button type="button" variant={result === "Passed" ? "default" : "outline"} onClick={() => setResult("Passed")}>Passed</Button><Button type="button" variant={result === "Failed" ? "destructive" : "outline"} onClick={() => setResult("Failed")}>Failed</Button></div></Field><Field label="Verification Comments"><Textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Describe the physical verification result." /></Field><AfterEvidencePicker items={evidence} onChange={setEvidence} userName={user.name} /><Button className="w-fit" disabled={!comments.trim()} onClick={verify}>Record Verification</Button>{tag.closure?.verificationResult === "Failed" && <p className="text-xs text-amber-700 dark:text-amber-400">The previous verification failed. Re-verify after corrective work is complete.</p>}</div> : <p className="text-sm text-muted-foreground">An authorized user must verify this Red Tag.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
}

function AfterEvidencePicker({ items, onChange, userName }: { items: RedTagEvidence[]; onChange: (items: RedTagEvidence[]) => void; userName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  async function changed(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const next: RedTagEvidence[] = [];
    for (const file of files) {
      const { dataUrl } = await optimizeEvidenceImage(file);
      next.push({ id: `RTE-${crypto.randomUUID()}`, name: file.name, url: dataUrl, mimeType: file.type, uploadedBy: userName, uploadedAt: new Date().toISOString() });
    }
    onChange([...items, ...next]); event.target.value = "";
  }
  return <Field label="After evidence"><div><Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="size-4" />Add photos</Button><input ref={inputRef} hidden multiple type="file" accept="image/*" onChange={changed} />{items.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{items.length} photo{items.length === 1 ? "" : "s"} ready to save</p>}</div></Field>;
}

function Meta({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Flag }) { return <div className="min-w-0">{Icon && <Icon className="mb-2 size-4 text-red-600" />}<p className="break-words text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">{value}</p></div>; }
function Missing({ onBack }: { onBack: () => void }) { return <PageContainer><div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed"><div className="text-center"><Flag className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-3 font-semibold">Red Tag not found</h1><Button className="mt-4" variant="outline" onClick={onBack}>Back to Red Tags</Button></div></div></PageContainer>; }

export function RedTagPrintPage({ tagId }: { tagId: string }) {
  const router = useRouter(); const user = useCurrentUser(); const tag = useRedTags().find((item) => item.id === tagId);
  const qrTarget = useRedTagQrTarget(tagId);
  const { t } = useI18n();
  if (!tag) return <Missing onBack={() => router.push("/5s/red")} />;
  const tagIdToPrint = tag.id;
  async function print() {
    await document.fonts?.ready;
    const root = document.querySelector<HTMLElement>(".red-tag-print-surface");
    const images = root ? Array.from(root.querySelectorAll("img")) : [];
    await Promise.all(images.map(async (image) => { if (image.complete) return; try { await image.decode(); } catch { /* Print the tag even if optional evidence fails. */ } }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    markTagPrinted(tagIdToPrint, user);
    window.print();
  }
  return <PageContainer className="red-tag-print-page max-w-none"><style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style><div className="print:hidden"><FiveSPageHeader eyebrow="Red Tags / Print Preview" title="Print Red Tag" description="Print this label and attach it to the tagged item."
    leading={<Button variant="ghost" size="icon-sm" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>}
    actions={<><Button variant="outline" onClick={() => router.push(getRedTagRecordPath(tag.id))}><Eye className="size-4" /> {t("common.view")}</Button><Button onClick={print}><Printer className="size-4" /> {t("redTag.print")}</Button></>} /></div>
    <div className="red-tag-print-surface motion-success-in grid place-items-center rounded-xl border bg-muted/25 p-4 sm:p-8"><RedTagLabel tag={tag} qrTarget={qrTarget} /></div>
  </PageContainer>;
}

function RedTagLabel({ tag, qrTarget }: { tag: RedTag; qrTarget: string }) {
  return <article className="red-tag-label w-full max-w-[430px] overflow-hidden border-[3px] border-red-700 bg-white text-black shadow-lg">
    <header className="border-b-[3px] border-red-700 px-6 py-4 text-center"><p className="text-sm font-bold uppercase tracking-[.22em] text-red-700">5S Workplace Control</p><h1 className="mt-1 text-4xl font-black tracking-[.08em] text-red-700">RED TAG</h1><p className="mt-2 font-mono text-2xl font-black">{tag.tagNumber}</p></header>
    <div className="grid gap-5 p-5"><div className="grid grid-cols-2 gap-x-5 gap-y-4"><LabelValue label="Item" value={tag.itemName} wide /><LabelValue label="Quantity" value={String(tag.quantity)} /><LabelValue label="Location" value={`${tag.zone} · ${tag.section}`} /><LabelValue label="Department" value={tag.department ?? "Not recorded"} />{tag.category && <LabelValue label="Category" value={tag.category} />}<LabelValue label="Reason" value={tag.reason === "Others" ? tag.customReason ?? tag.reason : tag.reason} wide />{tag.estimatedValue !== undefined && <LabelValue label="Estimated Value" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tag.estimatedValue)} />}<LabelValue label="Identified" value={displayDate(tag.createdAt)} /><LabelValue label="Identified By" value={tag.createdByName} wide /></div>
      <div className="grid justify-items-center border-t-2 border-red-200 pt-5"><QrCode value={qrTarget} size={188} /><p className="mt-3 text-base font-black tracking-wide text-red-700">SCAN TO VIEW RECORD</p></div>
    </div></article>;
}
function LabelValue({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "col-span-2" : ""}><p className="text-[11px] font-black uppercase tracking-widest text-red-700">{label}</p><p className="mt-1 text-sm font-bold leading-5">{value}</p></div>; }

function QrCode({ value, size }: { value: string; size: number }) {
  return <div className="grid justify-items-center gap-1"><QRCodeSVG value={value} size={size} level="M" marginSize={2} title={`Red Tag ${value}`} /><span className="sr-only">Open Red Tag at {value}</span></div>;
}
