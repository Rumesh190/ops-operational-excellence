"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, Check, CheckCircle2, Circle, ExternalLink, Eye, FileText, Flag, Footprints, Link2, LockKeyhole, Package, Plus, Printer, QrCode as QrCodeIcon, Search, Trash2, Upload, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { PageContainer } from "@/components/layout/page-container";
import { OpsCameraCapture } from "@/components/ops/ops-camera-capture";
import { PageFormActionBar } from "@/components/ops/page-form-action-bar";
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
import { useOrganizationConfiguration } from "@/lib/organization-store";
import { useCurrentUser } from "@/lib/current-user";
import { ACTION_STATUS_CONFIG, getActionDueLabel } from "@/lib/actions/action-config";
import { useActionStore } from "@/lib/actions/action-store";
import { clearRedTagHandlingMode, completeRedTagDisposition, confirmRedTagKeep, createAndSubmitRedTagV2, linkRedTagAction, markTagPrinted, reconcileRedTagActions, recordRedTagDecision, setRedTagHandlingMode, startRedTagDisposition, submitRedTagForReview, updateFurtherEvaluationDecision, useRedTags } from "./store";
import { getRedTagReasonDisplay, RED_TAG_CATEGORIES, RED_TAG_DECISION_LABELS, RED_TAG_DECISIONS, RED_TAG_REASON_GROUPS, RED_TAG_REASONS, RED_TAG_SECTIONS, type RedTag, type RedTagCategory, type RedTagDecision, type RedTagEvidence, type RedTagReason, type RedTagReasonCategory, type RedTagStatus } from "./types";
import { useI18n } from "@/components/preferences/use-i18n";
import { optimizeEvidenceImage } from "@/lib/evidence-images";
import { getIncomingRelationships } from "@/lib/relationships/relationship-store";
import { canCreateRedTag } from "./access";
import { RedTagNav } from "./red-tag-nav";
import { getCreateRedTagQrTarget, getRedTagQrTarget, getRedTagRecordPath } from "./qr";

const STATUS_TONE: Record<RedTagStatus, "danger" | "warning" | "success" | "secondary"> = {
  Open: "danger", "Under Review": "warning", "Decision Made": "warning", "Disposition In Progress": "warning", "In Progress": "warning", "Awaiting Verification": "success", Closed: "secondary",
};

function displayDate(value: string, time = false) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(value));
}

export function getRedTagDispositionStartErrors(input: { responsiblePersonId?: string; targetDate: string; executionNotes: string }) {
  return {
    responsible: input.responsiblePersonId ? "" : "Select a responsible person.",
    targetDate: input.targetDate ? "" : "Select a target date.",
    executionNotes: input.executionNotes.trim() ? "" : "Enter execution notes.",
  };
}

function Summary({ tags }: { tags: RedTag[] }) {
  const items = [
    { label: "Under Review", value: tags.filter((tag) => ["Open", "Under Review"].includes(tag.status)).length },
    { label: "Awaiting Closure", value: tags.filter((tag) => ["Decision Made", "Disposition In Progress", "In Progress", "Awaiting Verification"].includes(tag.status)).length },
    { label: "Closed", value: tags.filter((tag) => tag.status === "Closed").length },
  ];
  return <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-3">
    {items.map((item) => <div key={item.label} className="border-b p-4 last:border-0 even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0">
      <p className="text-xs font-medium text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{item.value}</p>
    </div>)}
  </div>;
}

export function RedTagOverviewPage() {
  const tags = useRedTags(); const router = useRouter();
  const user = useCurrentUser();
  const adminUser = useAdminUsers().find((item) => item.id === user.id);
  const mayCreate = canCreateRedTag(adminUser);
  const organization = useOrganizationConfiguration();
  const [createQrOpen, setCreateQrOpen] = useState(false);
  const [createQrQuantity, setCreateQrQuantity] = useState("1");
  const plant = organization.plants.find((item) => item.status === "Active" && item.name === user.plant);
  const createQrTarget = useCreateRedTagQrTarget(plant?.id);
  const attention = tags.filter((tag) => tag.status !== "Closed" && (tag.status === "Awaiting Verification" || Boolean(tag.actionId) || tag.status === "Under Review"));
  const qrQuantity = Number(createQrQuantity);
  const validQrQuantity = Number.isInteger(qrQuantity) && qrQuantity >= 1 && qrQuantity <= 100;
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Red Tag" title="Overview" description="Current review, closure, and attention workload from the Red Tag record." actions={mayCreate ? <><Button variant="outline" onClick={() => setCreateQrOpen(true)}><QrCodeIcon className="size-4" />Create QR</Button><Button onClick={() => router.push("/5s/red/create")}><Plus className="size-4" />Create Red Tag</Button></> : undefined} /><RedTagNav /><Summary tags={tags} /><section><h2 className="text-sm font-semibold">Requires attention</h2><div className="mt-3 divide-y overflow-hidden rounded-xl border bg-card">{attention.slice(0, 8).map((tag) => <button key={tag.id} onClick={() => router.push(`/5s/red/${tag.id}`)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/25"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{tag.itemName}</p><p className="mt-1 text-xs text-muted-foreground">{tag.reasonCategory ? `${tag.reasonCategory} · ` : ""}{tag.reason === "Free Text" ? tag.customReason : tag.reason}</p></div><Badge variant={STATUS_TONE[tag.status]}>{getRedTagDisplayStatus(tag)}</Badge></button>)}{!attention.length && <p className="p-8 text-center text-sm text-muted-foreground">No Red Tags currently require attention.</p>}</div></section><Dialog open={createQrOpen} onOpenChange={setCreateQrOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Create Red Tag QR</DialogTitle></DialogHeader><div className="grid justify-items-center gap-4 py-3 text-center"><p className="text-xl font-black tracking-wide text-red-700">RED TAG</p><QrCode value={createQrTarget} size={220} /><div><p className="font-semibold">Scan to create a Red Tag</p><p className="mt-1 text-sm text-muted-foreground">{plant?.name ?? user.plant}</p></div><Field label="Number of QR labels"><Input className="text-center" type="number" min={1} max={100} step={1} value={createQrQuantity} onChange={(event) => setCreateQrQuantity(event.target.value)} /></Field>{!validQrQuantity && <p role="alert" className="text-sm text-destructive">Enter a whole number from 1 to 100.</p>}<Button className="w-full" disabled={!validQrQuantity} onClick={() => router.push(`/5s/red/create-qr/print?${new URLSearchParams({ ...(plant ? { plant: plant.id } : {}), quantity: String(qrQuantity) }).toString()}`)}><Printer className="size-4" />Print {validQrQuantity ? qrQuantity : ""} QR {qrQuantity === 1 ? "label" : "labels"}</Button></div></DialogContent></Dialog></PageContainer>;
}

function getRedTagDisplayStatus(tag: RedTag) {
  if (tag.status === "Closed") return "Closed";
  if (["Open", "Under Review"].includes(tag.status)) return "Under Review";
  return "Awaiting Closure";
}

export function RedTagListPage({ view = "all" }: { view?: "all" | "awaiting-closure" | "closed" }) {
  const router = useRouter();
  const { t } = useI18n();
  const tags = useRedTags();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((item) => item.id === currentUser.id);
  const mayCreate = canCreateRedTag(adminUser);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("All"); const [section, setSection] = useState("All");
  const [reason, setReason] = useState("All"); const [person, setPerson] = useState("All"); const [date, setDate] = useState("");
  const people = [...new Set(tags.map((tag) => tag.responsiblePersonName).filter((value): value is string => Boolean(value)))];
  const scoped = tags.filter((tag) => view === "closed" ? tag.status === "Closed" : view === "awaiting-closure" ? ["Decision Made", "Disposition In Progress", "In Progress", "Awaiting Verification"].includes(tag.status) : true);
  const filtered = scoped.filter((tag) => {
    const term = search.toLowerCase();
    return (!term || `${tag.tagNumber} ${tag.itemName} ${tag.remarks}`.toLowerCase().includes(term)) &&
      (status === "All" || getRedTagDisplayStatus(tag) === status) && (section === "All" || tag.section === section) &&
      (reason === "All" || tag.reason === reason) && (person === "All" || tag.responsiblePersonName === person) &&
      (!date || tag.createdAt.slice(0, 10) === date);
  });
  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="Red Tag" title={view === "closed" ? "Closed" : view === "awaiting-closure" ? "Awaiting Closure" : "Red Tags"} description={view === "closed" ? "Completed Red Tags with retained decision, evidence, and closure history." : view === "awaiting-closure" ? "Reviewed Red Tags waiting for direct completion, evidence, or a linked Action." : "Identify, review, and close physical workplace items."}
      actions={mayCreate ? <Button onClick={() => router.push("/5s/red/create")}><Plus className="size-4" /> {t("redTag.create")}</Button> : undefined} />
    <RedTagNav />
    {view === "all" && <Summary tags={tags} />}
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-2 border-b bg-muted/15 p-3 md:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(130px,1fr))]">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search tags or items..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Filter value={status} onChange={setStatus} label="All statuses" options={["Under Review", "Awaiting Closure", "Closed"]} />
        <Filter value={section} onChange={setSection} label="All sections" options={[...RED_TAG_SECTIONS]} />
        <Filter value={reason} onChange={setReason} label="All reasons" options={[...RED_TAG_REASONS, ...Object.values(RED_TAG_REASON_GROUPS).flat()]} />
        <Filter value={person} onChange={setPerson} label="All responsible" options={people} />
        <Input type="date" aria-label="Created date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid gap-3 p-3 md:hidden">{filtered.map((tag) => <button key={tag.id} onClick={() => router.push(`/5s/red/${tag.id}`)} className="min-w-0 rounded-xl border bg-background p-4 text-left active:bg-muted/40"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-bold text-red-700 dark:text-red-400">{tag.tagNumber}</p><h2 className="mt-1 break-words font-semibold">{tag.itemName}</h2></div><Badge variant={STATUS_TONE[tag.status]}>{tag.status}</Badge></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm"><div><dt className="text-xs text-muted-foreground">Section</dt><dd className="mt-1 break-words font-medium">{tag.section}</dd></div><div><dt className="text-xs text-muted-foreground">Reason</dt><dd className="mt-1 break-words font-medium">{tag.reason}</dd></div><div><dt className="text-xs text-muted-foreground">Responsible</dt><dd className="mt-1 break-words font-medium">{tag.responsiblePersonName ?? "Not assigned"}</dd></div><div><dt className="text-xs text-muted-foreground">Target</dt><dd className="mt-1 font-medium">{tag.targetDate ? displayDate(tag.targetDate) : "Not set"}</dd></div></dl></button>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1180px] text-sm"><thead className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr>
        {["Tag ID", "Item / Issue", "Location", "Responsible Person", "Target Date", "Status", "Linked Action", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
      </tr></thead><tbody>{filtered.map((tag) => <tr key={tag.id} className="border-b last:border-0 hover:bg-muted/20">
        <td className="px-4 py-3 font-mono text-xs font-semibold text-red-700 dark:text-red-400">{tag.tagNumber}</td><td className="px-4 py-3 font-medium">{tag.itemName}</td>
        <td className="px-4 py-3">{tag.zone} · {tag.section}</td><td className="px-4 py-3">{tag.responsiblePersonName ?? "Not assigned"}</td>
        <td className="px-4 py-3 whitespace-nowrap">{tag.targetDate ? displayDate(tag.targetDate) : "Not set"}</td><td className="px-4 py-3"><Badge variant={STATUS_TONE[tag.status]}>{getRedTagDisplayStatus(tag)}</Badge></td>
        <td className="px-4 py-3 font-mono text-xs">{tag.actionId ?? "—"}</td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => router.push(`/5s/red/${tag.id}`)}><Eye className="size-4" /> View</Button></td>
      </tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="py-14 text-center text-sm text-muted-foreground">No Red Tags match the selected filters.</div>}
    </section>
  </PageContainer>;
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[] }) {
  return <Select value={value} onValueChange={(v) => onChange(v ?? "All")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">{label}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>;
}

export function RedTagCreatePage({ plantRef }: { plantRef?: string } = {}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((item) => item.id === currentUser.id);
  if (!canCreateRedTag(adminUser)) {
    return <PageContainer><div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed"><div className="max-w-md text-center"><LockKeyhole className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-3 font-semibold">Red Tag creation unavailable</h1><p className="mt-2 text-sm text-muted-foreground">You do not have permission to create Red Tags.</p><Button className="mt-4" variant="outline" onClick={() => router.push("/5s/red")}>Back to Red Tags</Button></div></div></PageContainer>;
  }
  return <RedTagCreateForm plantRef={plantRef} />;
}

function RedTagCreateForm({ plantRef }: { plantRef?: string }) {
  const router = useRouter(); const user = useCurrentUser();
  const organization = useOrganizationConfiguration();
  const resolvedPlant = organization.plants.find((item) => item.id === plantRef && item.status === "Active");
  const plantName = resolvedPlant?.name ?? user.plant;
  const { t } = useI18n();
  const today = useMemo(() => toLocalInputDate(new Date()), []);
  const [zone, setZone] = useState(user.primaryZone); const [item, setItem] = useState("");
  const [reasonCategory, setReasonCategory] = useState<RedTagReasonCategory | "">(""); const [reason, setReason] = useState<RedTagReason | "">(""); const [customReason, setCustomReason] = useState(""); const [remarks, setRemarks] = useState("");
  const [category, setCategory] = useState<RedTagCategory | "">(""); const [imageUrl, setImageUrl] = useState<string>(); const [preview, setPreview] = useState(false);
  const [creating, setCreating] = useState(false); const [photoError, setPhotoError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const creatingRef = useRef(false);
  const validationTargets = useRef<Record<string, HTMLElement | null>>({});
  const uploadRef = useRef<HTMLInputElement>(null);
  const availableZones = resolvedPlant ? FIVE_S_ZONE_CONFIGURATION.filter((candidate) => organization.zones.some((item) => item.status === "Active" && item.plantId === resolvedPlant.id && item.name === candidate.name)) : FIVE_S_ZONE_CONFIGURATION;
  const selectedZone = availableZones.some((item) => item.name === zone) ? zone : availableZones[0]?.name ?? zone;
  const zoneConfig = availableZones.find((z) => z.name === selectedZone);
  const validationErrors = {
    item: item.trim() ? "" : "Enter an item name.",
    category: category ? "" : "Select an item category.",
    remarks: remarks.trim() ? "" : "Describe the item and its current condition.",
    reasonCategory: reasonCategory ? "" : "Select a tagging category.",
    reason: reason ? "" : "Select a tagging reason.",
    customReason: reason !== "Free Text" || customReason.trim() ? "" : "Enter the tagging reason.",
    photo: imageUrl ? "" : "Add a photo to create this Red Tag.",
  };
  const invalidFields = Object.entries(validationErrors).filter(([, message]) => Boolean(message));
  async function processImage(file?: File) { if (!file) return; try { const { dataUrl } = await optimizeEvidenceImage(file); setImageUrl(dataUrl); setPhotoError(""); } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to process this image."); } }
  async function imageChanged(e: React.ChangeEvent<HTMLInputElement>) { await processImage(e.target.files?.[0]); e.target.value = ""; }
  function submit() {
    if (creatingRef.current) return;
    setSubmitAttempted(true);
    if (invalidFields.length || !reasonCategory || !reason || !category || !zoneConfig || !imageUrl) {
      const firstKey = invalidFields[0]?.[0];
      const target = firstKey ? validationTargets.current[firstKey] : undefined;
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      if (firstKey !== "photo") window.setTimeout(() => target?.focus({ preventScroll: true }), 250);
      return;
    }
    creatingRef.current = true; setCreating(true);
    window.setTimeout(() => { try { const tag = createAndSubmitRedTagV2({ plant: plantName, zone: selectedZone, section: zoneConfig.department, department: zoneConfig.department, category, itemName: item.trim(), reasonCategory, reason, customReason: customReason.trim() || undefined, remarks: remarks.trim(), createdById: user.id, createdByName: user.name, imageUrl }, user, { id: zoneConfig.leaderId, name: zoneConfig.leader }); if (!tag) { creatingRef.current = false; setCreating(false); return; } router.push(`/5s/red/${tag.id}`); } catch { creatingRef.current = false; setCreating(false); } }, 240);
  }
  return <PageContainer className="max-w-none">
    <FiveSPageHeader eyebrow="Red Tags / Create" title="Create Red Tag" description="Identify a physical item and capture the context needed for review."
      leading={<Button variant="ghost" size="icon-sm" onClick={() => router.push("/5s/red")}><ArrowLeft className="size-4" /></Button>} />
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-5">
      <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <ReadOnly label="Plant" value={plantName} /><Field label="Zone"><Select value={selectedZone} onValueChange={(v) => setZone(v ?? user.primaryZone)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableZones.map((z) => <SelectItem key={z.name} value={z.name}>{z.name}</SelectItem>)}</SelectContent></Select></Field>
        <ReadOnly label="Department" value={zoneConfig?.department ?? "—"} /><ReadOnly label="Tag ID" value={`RT-EGM-${zoneConfig?.code ?? "ZA"}-###`} /><ReadOnly label="Date Identified" value={today} /><ReadOnly label="Identified By" value={user.name} />
      </CardContent></Card>
      <Card><CardContent className="grid gap-5 p-5">
        <div><h2 className="font-semibold">Physical Item</h2><p className="mt-1 text-xs text-muted-foreground">Record the item that needs review.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Item Name *" error={submitAttempted ? validationErrors.item : undefined} errorId="red-tag-item-error"><Input ref={(node) => { validationTargets.current.item = node; }} required value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Obsolete welding fixture" aria-invalid={submitAttempted && Boolean(validationErrors.item)} aria-describedby={submitAttempted && validationErrors.item ? "red-tag-item-error" : undefined} /></Field><Field label="Category *" error={submitAttempted ? validationErrors.category : undefined} errorId="red-tag-category-error"><Select value={category} onValueChange={(value) => setCategory((value ?? "") as RedTagCategory | "")}><SelectTrigger ref={(node) => { validationTargets.current.category = node; }} aria-invalid={submitAttempted && Boolean(validationErrors.category)} aria-describedby={submitAttempted && validationErrors.category ? "red-tag-category-error" : undefined}><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{RED_TAG_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div>
        <Field label="Item Description *" error={submitAttempted ? validationErrors.remarks : undefined} errorId="red-tag-remarks-error"><Textarea ref={(node) => { validationTargets.current.remarks = node; }} required value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Describe the item and its current condition." aria-invalid={submitAttempted && Boolean(validationErrors.remarks)} aria-describedby={submitAttempted && validationErrors.remarks ? "red-tag-remarks-error" : undefined} /></Field>
      </CardContent></Card>
      <Card><CardContent className="grid gap-5 p-5">
        <div><h2 className="font-semibold">Tagging Reason</h2><p className="mt-1 text-xs text-muted-foreground">Explain why this physical item needs review.</p></div>
        <Field label="Category *" error={submitAttempted ? validationErrors.reasonCategory : undefined} errorId="red-tag-reason-category-error"><div aria-invalid={submitAttempted && Boolean(validationErrors.reasonCategory)} aria-describedby={submitAttempted && validationErrors.reasonCategory ? "red-tag-reason-category-error" : undefined} className={`grid gap-2 rounded-lg sm:grid-cols-2 lg:grid-cols-5 ${submitAttempted && validationErrors.reasonCategory ? "ring-2 ring-destructive/20" : ""}`}>{(Object.keys(RED_TAG_REASON_GROUPS) as RedTagReasonCategory[]).map((option, index) => <button ref={index === 0 ? (node) => { validationTargets.current.reasonCategory = node; } : undefined} key={option} type="button" onClick={() => { setReasonCategory(option); setReason(option === "Other" ? "Free Text" : ""); setCustomReason(""); }} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${reasonCategory === option ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-background hover:border-primary/40"}`}>{option}</button>)}</div></Field>
        {reasonCategory && reasonCategory !== "Other" && <Field label="Reason *" error={submitAttempted ? validationErrors.reason : undefined} errorId="red-tag-reason-error"><div aria-invalid={submitAttempted && Boolean(validationErrors.reason)} aria-describedby={submitAttempted && validationErrors.reason ? "red-tag-reason-error" : undefined} className={`grid gap-2 rounded-lg sm:grid-cols-2 lg:grid-cols-3 ${submitAttempted && validationErrors.reason ? "ring-2 ring-destructive/20" : ""}`}>{RED_TAG_REASON_GROUPS[reasonCategory].map((option, index) => <button ref={index === 0 ? (node) => { validationTargets.current.reason = node; } : undefined} key={option} type="button" onClick={() => setReason(option)} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${reason === option ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-background hover:border-primary/40"}`}>{reason === option && <CheckCircle2 className="mr-2 inline size-4" />}{option}</button>)}</div></Field>}
        {reasonCategory === "Other" && <Field label="Reason *" error={submitAttempted ? validationErrors.customReason : undefined} errorId="red-tag-custom-reason-error"><Input ref={(node) => { validationTargets.current.customReason = node; }} required value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Describe the tagging reason..." aria-invalid={submitAttempted && Boolean(validationErrors.customReason)} aria-describedby={submitAttempted && validationErrors.customReason ? "red-tag-custom-reason-error" : undefined} /></Field>}
      </CardContent></Card>
      <Card ref={(node) => { validationTargets.current.photo = node; }} className={submitAttempted && validationErrors.photo ? "border-destructive ring-2 ring-destructive/20" : undefined}><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Photo Identification</h2><p className="mt-1 text-xs text-muted-foreground">Capture the Before image used to identify this Red Tag.</p></div>
        <Field label="Before Photo *" error={submitAttempted ? validationErrors.photo : photoError} errorId="red-tag-photo-error"><div className="grid gap-3" aria-invalid={submitAttempted && Boolean(validationErrors.photo)} aria-describedby={submitAttempted && validationErrors.photo ? "red-tag-photo-error" : undefined}><div className="grid grid-cols-2 gap-2 sm:flex"><OpsCameraCapture fileNamePrefix="red-tag-before" onCapture={processImage} trigger={(openCamera) => <Button type="button" variant="outline" onClick={openCamera}><Camera className="size-4" />Take Photo</Button>} /><Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}><Upload className="size-4" />Upload Photo</Button></div><input ref={uploadRef} hidden type="file" accept="image/*" onChange={imageChanged} />{imageUrl && <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2"><button type="button" onClick={() => setPreview(true)}><img src={imageUrl} alt="Before item preview" className="size-20 rounded object-cover" /></button><Button type="button" size="sm" variant="ghost" onClick={() => setPreview(true)}>View</Button><Button type="button" size="sm" variant="ghost" onClick={() => uploadRef.current?.click()}>Replace</Button><Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => { setImageUrl(undefined); setPhotoError("Add a photo to create this Red Tag."); }}><Trash2 className="size-4" />Remove</Button></div>}</div></Field>
      </CardContent></Card>
      <PageFormActionBar primaryLabel={t("redTag.create")} submittingLabel="Creating…" primaryType="submit" secondaryLabel={t("common.cancel")} secondaryAction={() => router.push("/5s/red")} isSubmitting={creating} validationSummary={submitAttempted && invalidFields.length ? `${invalidFields.length} required ${invalidFields.length === 1 ? "field needs" : "fields need"} attention.` : undefined} />
    </form>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Before / Identification Photo</DialogTitle></DialogHeader>{imageUrl && <img src={imageUrl} alt="Before item full-screen preview" className="max-h-[75vh] w-full object-contain" />}</DialogContent></Dialog>
  </PageContainer>;
}

function Field({ label, children, error, errorId }: { label: string; children: React.ReactNode; error?: string; errorId?: string }) { return <div className="grid content-start gap-2"><Label>{label}</Label>{children}{error && <p id={errorId} role="alert" className="text-xs font-medium text-destructive">{error}</p>}</div>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <Field label={label}><div className="flex h-10 items-center rounded-md border bg-muted/35 px-3 text-sm font-medium">{value}</div></Field>; }

function useRedTagQrTarget(tagId: string) {
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "");
  return getRedTagQrTarget(tagId, origin);
}

function useCreateRedTagQrTarget(plantId?: string) {
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "");
  return getCreateRedTagQrTarget(plantId, origin);
}

export function RedTagCreateQrPrintPage({ plantRef, quantity = 1 }: { plantRef?: string; quantity?: number }) {
  const user = useCurrentUser();
  const organization = useOrganizationConfiguration();
  const plant = organization.plants.find((item) => item.id === plantRef && item.status === "Active");
  const target = useCreateRedTagQrTarget(plant?.id);
  return <PageContainer className="max-w-5xl"><FiveSPageHeader eyebrow="Red Tag" title="Print Create QR" description={`${quantity} reusable shop-floor QR ${quantity === 1 ? "label" : "labels"} linked to the canonical Create Red Tag form.`} actions={<Button onClick={() => window.print()}><Printer className="size-4" />Print {quantity}</Button>} /><div className="red-tag-print-surface grid gap-4 sm:grid-cols-2">{Array.from({ length: quantity }, (_, index) => <div key={index} className="grid break-inside-avoid justify-items-center gap-4 rounded-xl border bg-white p-8 text-center text-slate-950"><p className="text-2xl font-black tracking-[0.16em] text-red-700">RED TAG</p><p className="text-lg font-semibold">Scan to create a Red Tag</p><QrCode value={target} size={220} /><p className="text-sm font-semibold">{plant?.name ?? user.plant}</p></div>)}</div></PageContainer>;
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
    source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceObservation: tag.decisionRecord ? `Decision · ${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} · Reason · ${getRedTagReasonDisplay(tag.reason, tag.customReason)}` : getRedTagReasonDisplay(tag.reason, tag.customReason),
    title: `Execute ${tag.tagNumber}: ${tag.itemName}`, description: tag.decisionRecord ? `${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} · ${getRedTagReasonDisplay(tag.reason, tag.customReason)} · ${tag.remarks}` : tag.requiredAction ?? tag.remarks,
    plant: tag.plant, zone: tag.zone, location: tag.section,
    evidence: [], sourceEvidenceCount: tag.imageUrl?.trim() ? 1 : 0,
    defaultResponsibleId: tag.dispositionDetails?.responsiblePersonId ?? tag.responsiblePersonId, defaultDueDate: tag.dispositionDetails?.targetDate ?? tag.targetDate,
  };
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Red Tags / Details" title={tag.tagNumber} description={`${tag.itemName} · ${tag.section}`}
    leading={<Button variant="ghost" size="icon-sm" onClick={() => router.push("/5s/red")}><ArrowLeft className="size-4" /></Button>}
    actions={<><Button variant="outline" onClick={() => router.push(`/5s/red/${tag.id}/report`)}><FileText className="size-4" />View Report</Button><Button variant="outline" onClick={() => setQrOpen(true)}><QrCodeIcon className="size-4" /> View QR</Button><Button variant="outline" onClick={() => router.push(`/5s/red/${tag.id}/print`)}><Printer className="size-4" /> Print Red Tag</Button></>} />
    <RedTagLifecycleIndicator tag={tag} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.7fr)]"><div className="grid gap-5">
      <Card><CardContent className="grid gap-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Item Details</h2><Badge variant={STATUS_TONE[tag.status]}>{tag.status}</Badge></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Meta icon={Package} label="Item / Equipment" value={tag.itemName} /><Meta label="Red Tag ID" value={tag.tagNumber} />{tag.quantity !== undefined && <Meta label="Quantity" value={String(tag.quantity)} />}<Meta label="Category" value={tag.category ?? "Not recorded"} /><Meta label="Location" value={`${tag.plant} · ${tag.zone} · ${tag.section}`} /><Meta label="Department" value={tag.department ?? "Not recorded"} /><Meta label="Reason" value={getRedTagReasonDisplay(tag.reason, tag.customReason)} />{tag.estimatedValue !== undefined && <Meta label="Estimated Value" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tag.estimatedValue)} />}<Meta icon={CalendarDays} label="Identified Date" value={displayDate(tag.createdAt, true)} /><Meta icon={UserRound} label="Identified By" value={tag.createdByName} /></div><div className="border-t pt-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item Description</p><p className="mt-2 text-sm leading-6">{tag.remarks || "No description added."}</p></div></CardContent></Card>
      {gembaSource && <Card><CardContent className="p-5"><div className="flex items-center gap-2"><Footprints className="size-5 text-primary" /><h2 className="font-semibold">Source: Gemba Observation</h2></div><p className="mt-2 text-sm text-muted-foreground">This Red Tag was created from a Gemba walk observation.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Meta label="Gemba Walk" value={gembaSource.walkId} /><Meta label="Observation" value={gembaSource.observationId ?? "Not recorded"} />{gembaSource.title && <Meta label="Observation Title" value={gembaSource.title} />}</div><Button className="mt-4" variant="outline" size="sm" nativeButton={false} render={<Link href={`/gemba/${gembaSource.walkId}`} />}><ExternalLink className="size-3.5" />View Gemba Walk</Button></CardContent></Card>}
      <RedTagReviewDecisionSection tag={tag} mayManage={mayManage} user={user} />
      <RedTagDispositionSection tag={tag} action={action} mayManage={mayManage} user={user} users={adminUsers} onCreateAction={() => setActionOpen(true)} />
      {(action || tag.handlingMode === "linked_action") && <LinkedActionSection action={action} mayCreate={mayManage && tag.handlingMode === "linked_action" && ["Decision Made", "Disposition In Progress"].includes(tag.status) && Boolean(tag.decisionRecord && !["keep", "further_evaluation"].includes(tag.decisionRecord.type))} onCreate={() => setActionOpen(true)} />}
    </div><aside className="grid content-start gap-5"><Card><CardContent className="grid justify-items-center p-5"><QrCode value={qrTarget} size={176} /><p className="mt-3 font-mono text-sm font-bold">{tag.tagNumber}</p><p className="mt-1 text-xs text-muted-foreground">Scan to view Red Tag</p><Button className="mt-4" variant="outline" onClick={() => setQrOpen(true)}><QrCodeIcon className="size-4" />View QR</Button></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Tag History</h2><div className="mt-5 grid gap-0">{tag.history.map((event, i) => <div key={event.id} className="relative grid grid-cols-[18px_1fr] gap-3 pb-5 last:pb-0"><div className="relative"><span className="absolute left-[5px] top-1 size-2.5 rounded-full bg-red-600" />{i < tag.history.length - 1 && <span className="absolute left-[9px] top-4 h-full w-px bg-border" />}</div><div><p className="text-sm font-semibold">{event.label}</p><p className="mt-1 text-xs text-muted-foreground">{displayDate(event.at, true)} · by {event.actor}</p></div></div>)}</div></CardContent></Card></aside></div>
    <CreateLinkedActionDialog key={tag.id} open={actionOpen} onOpenChange={setActionOpen} context={tag.actionId ? null : actionContext} onCreated={(created) => { const linked = linkRedTagAction(tag.id, created.id, user); if (!linked) return false; setActionOpen(false); return true; }} />
    <Dialog open={qrOpen} onOpenChange={setQrOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Red Tag QR</DialogTitle></DialogHeader><div className="grid justify-items-center gap-3 py-3 text-center"><p className="font-mono text-lg font-bold">{tag.tagNumber}</p><p className="text-sm font-semibold">{tag.itemName}</p><QrCode value={qrTarget} size={240} /><p className="text-sm font-medium">Scan to view Red Tag</p><p className="text-xs text-muted-foreground">{tag.zone} · {tag.section}</p></div></DialogContent></Dialog>
  </PageContainer>;
}

function RedTagLifecycleIndicator({ tag }: { tag: RedTag }) {
  const isKeep = tag.decisionRecord?.type === "keep";
  const stages = isKeep ? ["Identify", "Review", "Keep Confirmation", "Closed"] as const : ["Identify", "Review", "Decision", "Disposition", "Closed"] as const;
  const active = tag.status === "Closed" ? stages.length - 1 : tag.status === "Open" ? 0 : tag.status === "Under Review" ? 1 : isKeep ? 2 : tag.status === "Decision Made" ? 2 : 3;
  return <Card><CardContent className={`grid gap-3 p-4 ${isKeep ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5"}`}>{stages.map((stage, index) => {
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

function RedTagDispositionSection({ tag, action, mayManage, user, users, onCreateAction }: { tag: RedTag; action?: ReturnType<typeof useActionStore>[number]; mayManage: boolean; user: ReturnType<typeof useCurrentUser>; users: ReturnType<typeof useAdminUsers>; onCreateAction: () => void }) {
  const [responsibleId, setResponsibleId] = useState(tag.dispositionDetails?.responsiblePersonId ?? (tag.handlingMode === "direct" ? user.id : ""));
  const [targetDate, setTargetDate] = useState(tag.dispositionDetails?.targetDate ?? "");
  const [executionNotes, setExecutionNotes] = useState(tag.dispositionDetails?.executionNotes ?? "");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [completionNotes, setCompletionNotes] = useState(tag.dispositionDetails?.completionNotes ?? "");
  const [responsibleConfirmed, setResponsibleConfirmed] = useState(false);
  const [evidence, setEvidence] = useState<RedTagEvidence[]>(tag.handlingMode === "linked_action" ? tag.afterEvidence ?? [] : []);
  const [completionAttempted, setCompletionAttempted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const completionLock = useRef(false);
  const completionTargets = useRef<Record<string, HTMLElement | null>>({});
  const [keepJustification, setKeepJustification] = useState(tag.keepConfirmation?.justification ?? "");
  const [replacement, setReplacement] = useState<Exclude<RedTagDecision, "further_evaluation"> | "">("");
  const [replacementComments, setReplacementComments] = useState("");
  const [error, setError] = useState("");
  const [startAttempted, setStartAttempted] = useState(false);
  const startTargets = useRef<Record<string, HTMLElement | null>>({});
  const decision = tag.decisionRecord?.type;
  const eligibleUsers = users.filter((item) => item.status === "Active");
  const effectiveResponsibleId = tag.handlingMode === "direct" ? user.id : responsibleId;
  const responsible = tag.handlingMode === "direct" ? user : eligibleUsers.find((item) => item.id === effectiveResponsibleId);
  const startErrors = getRedTagDispositionStartErrors({ responsiblePersonId: responsible?.id, targetDate, executionNotes });
  const completionErrors = {
    notes: completionNotes.trim() ? "" : "Enter completion notes.",
    evidence: evidence.length ? "" : "Add an After photo to complete the disposition.",
    confirmation: responsibleConfirmed ? "" : "Confirm that the disposition work is complete.",
  };
  const incompleteLinkedAction = Boolean(tag.actionId && action?.status !== "Completed");

  function start() {
    setStartAttempted(true);
    const missing = Object.entries(startErrors).filter(([, message]) => Boolean(message));
    if (missing.length) {
      setError(missing.length === 1 ? missing[0][1] : `Complete the required fields:\n${missing.map(([, message]) => `• ${message.replace(/\.$/, "")}`).join("\n")}`);
      const target = startTargets.current[missing[0][0]];
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      window.setTimeout(() => target?.focus({ preventScroll: true }), 250);
      return;
    }
    if (!responsible) return;
    if (!startRedTagDisposition(tag.id, { responsiblePersonId: responsible.id, responsiblePersonName: responsible.name, targetDate, executionNotes, approval: approvalConfirmed ? { approved: true, approvedAt: new Date().toISOString(), approvedByUserId: user.id, approvedByName: user.name, comment: approvalComment.trim() || undefined } : undefined }, user)) setError("Unable to start disposition.");
    else setError("");
  }
  function complete() {
    if (completionLock.current) return;
    setCompletionAttempted(true);
    const firstInvalid = Object.entries(completionErrors).find(([, message]) => Boolean(message));
    if (firstInvalid) {
      const [key] = firstInvalid;
      const target = completionTargets.current[key];
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      if (key !== "evidence") window.setTimeout(() => target?.focus({ preventScroll: true }), 250);
      return;
    }
    if (incompleteLinkedAction) { setError(`Complete the linked Action ${tag.actionId} before closing this disposition.`); return; }
    completionLock.current = true; setCompleting(true);
    if (!completeRedTagDisposition(tag.id, { evidence, completionNotes, responsibleConfirmed }, user)) setError("Unable to complete disposition.");
    else { setEvidence([]); setError(""); return; }
    completionLock.current = false; setCompleting(false);
  }
  function confirmKeep() {
    if (!confirmRedTagKeep(tag.id, keepJustification, user)) setError("Unable to confirm this Keep decision.");
    else setError("");
  }
  function replaceDecision() {
    if (!replacement || !updateFurtherEvaluationDecision(tag.id, replacement, replacementComments, user)) setError("Select a final decision before continuing.");
    else setError("");
  }
  function chooseHandling(mode: "direct" | "linked_action") {
    if (!setRedTagHandlingMode(tag.id, mode, user)) setError("Unable to select how this Red Tag will be handled.");
    else { setError(""); if (mode === "linked_action") onCreateAction(); }
  }
  function goBackToHandlingChoice() {
    if (!clearRedTagHandlingMode(tag.id, user)) setError("Unable to change the handling method after disposition work has started.");
    else setError("");
  }

  if (!tag.decisionRecord) return <Card><CardContent className="p-5"><h2 className="font-semibold">Disposition</h2><p className="mt-2 text-sm text-muted-foreground">Pending a recorded decision.</p></CardContent></Card>;
  if (decision === "further_evaluation") return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Further Evaluation</h2><p className="mt-1 text-sm text-muted-foreground">A final decision is required before disposition and closure.</p></div>{mayManage && tag.status === "Decision Made" ? <><Field label="Final Decision"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{RED_TAG_DECISIONS.filter((item) => item !== "further_evaluation").map((item) => <button type="button" key={item} onClick={() => setReplacement(item)} className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${replacement === item ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/35 dark:text-red-200" : "bg-background"}`}>{RED_TAG_DECISION_LABELS[item]}</button>)}</div></Field><Field label="Evaluation Comments"><Textarea value={replacementComments} onChange={(event) => setReplacementComments(event.target.value)} /></Field><Button className="w-fit" disabled={!replacement} onClick={replaceDecision}>Update Decision</Button></> : <p className="text-sm text-muted-foreground">Waiting for an authorized user to update the decision.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
  if (decision === "keep") return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">Keep Confirmation</h2><p className="mt-1 text-sm text-muted-foreground">Confirm that the reviewed item should remain. This closes the Red Tag without disposition, After evidence, or an Action.</p></div>{tag.keepConfirmation ? <div className="grid gap-4 sm:grid-cols-2">{tag.keepConfirmation.justification && <Meta label="Confirmation Note" value={tag.keepConfirmation.justification} />}<Meta label="Confirmed By" value={`${tag.keepConfirmation.confirmedByName} · ${displayDate(tag.keepConfirmation.confirmedAt, true)}`} /><Meta label="Outcome" value="Kept · Closed" /></div> : mayManage && tag.status === "Decision Made" ? <><Field label="Confirmation Note (optional)"><Textarea value={keepJustification} onChange={(event) => setKeepJustification(event.target.value)} placeholder="Add a note if useful." /></Field><Button className="w-fit" onClick={confirmKeep}>Confirm & Keep</Button></> : <p className="text-sm text-muted-foreground">Waiting for an authorized Keep confirmation.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
  if (tag.status === "Decision Made" && !tag.handlingMode) return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">How will this be handled?</h2><p className="mt-1 text-sm text-muted-foreground">Complete the correction here or track execution through the canonical Action workflow.</p></div>{mayManage ? <div className="grid gap-3 sm:grid-cols-2"><Button className="min-h-12" variant="outline" onClick={() => chooseHandling("direct")}>Handle directly</Button><Button className="min-h-12" onClick={() => chooseHandling("linked_action")}><Link2 className="size-4" />Create Linked Action</Button></div> : <p className="text-sm text-muted-foreground">An authorized reviewer must select the handling method.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
  if (tag.status === "Decision Made" && tag.handlingMode === "linked_action" && !action) return <Card><CardContent className="grid gap-4 p-5"><div><h2 className="font-semibold">Create Linked Action</h2><p className="mt-1 text-sm text-muted-foreground">Create the canonical OPS Action before disposition work begins.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={goBackToHandlingChoice}><ArrowLeft className="size-4" />Back</Button><Button onClick={onCreateAction}><Link2 className="size-4" />Create Linked Action</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
  if (tag.handlingMode === "linked_action" && action?.status !== "Completed") return null;

  return <Card><CardContent className="grid gap-5 p-5"><div><h2 className="font-semibold">{tag.status === "Closed" ? "Disposition Outcome" : "Disposition"}</h2><p className="mt-1 text-sm text-muted-foreground">{tag.status === "Closed" ? "Completed disposition with the original and completion evidence." : `Execute the recorded ${RED_TAG_DECISION_LABELS[tag.decisionRecord.type]} decision.`}</p></div>{tag.status === "Decision Made" ? mayManage ? <><div className="grid gap-4 sm:grid-cols-2">{tag.handlingMode === "direct" ? <ReadOnly label="Responsible Person" value={responsible?.name ?? user.name} /> : <Field label="Responsible Person *" error={startAttempted ? startErrors.responsible : undefined} errorId="red-tag-start-responsible-error"><Select value={responsibleId} onValueChange={(value) => setResponsibleId(value ?? "")}><SelectTrigger ref={(node) => { startTargets.current.responsible = node; }} aria-invalid={startAttempted && Boolean(startErrors.responsible)}><SelectValue placeholder="Select responsible person" /></SelectTrigger><SelectContent>{eligibleUsers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>}<Field label="Target Date *" error={startAttempted ? startErrors.targetDate : undefined} errorId="red-tag-start-target-error"><Input ref={(node) => { startTargets.current.targetDate = node; }} type="date" min={toLocalInputDate(new Date())} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} aria-invalid={startAttempted && Boolean(startErrors.targetDate)} /></Field></div><Field label="Execution Notes *" error={startAttempted ? startErrors.executionNotes : undefined} errorId="red-tag-start-notes-error"><Textarea ref={(node) => { startTargets.current.executionNotes = node; }} value={executionNotes} onChange={(event) => setExecutionNotes(event.target.value)} placeholder="Describe how this disposition will be executed." aria-invalid={startAttempted && Boolean(startErrors.executionNotes)} /></Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} /><span>Record approval for this disposition, if required.</span></label>{approvalConfirmed && <Field label="Approval Comment (optional)"><Input value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} /></Field>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={goBackToHandlingChoice}><ArrowLeft className="size-4" />Back</Button><Button onClick={start}>Start Disposition</Button></div></> : <p className="text-sm text-muted-foreground">An authorized user must start disposition.</p> : tag.dispositionDetails ? <>{tag.status === "Closed" && <div className="grid gap-4 sm:grid-cols-2"><DispositionEvidence title="Before" imageUrl={tag.imageUrl} empty="Before photo unavailable" /><DispositionEvidence title="After" imageUrl={tag.afterEvidence?.[0]?.url} empty="After photo unavailable" /></div>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Decision" value={RED_TAG_DECISION_LABELS[tag.dispositionDetails.decision]} /><Meta label="Responsible" value={tag.dispositionDetails.responsiblePersonName} /><Meta label="Target Date" value={displayDate(tag.dispositionDetails.targetDate)} />{tag.dispositionDetails.executionNotes && <Meta label="Execution Notes" value={tag.dispositionDetails.executionNotes} />}{tag.dispositionDetails.approval?.approved && <Meta label="Approval" value={`${tag.dispositionDetails.approval.approvedByName} · ${displayDate(tag.dispositionDetails.approval.approvedAt, true)}`} />}{tag.dispositionDetails.completedAt && <Meta label="Completed" value={`${tag.dispositionDetails.completedByName ?? "—"} · ${displayDate(tag.dispositionDetails.completedAt, true)}`} />}{tag.dispositionDetails.completionNotes && <Meta label="Completion Notes" value={tag.dispositionDetails.completionNotes} />}</div>{tag.status === "Disposition In Progress" && mayManage && <div className="grid gap-4 border-t pt-5"><Field label="Completion Notes *" error={completionAttempted ? completionErrors.notes : undefined} errorId="red-tag-completion-notes-error"><Textarea ref={(node) => { completionTargets.current.notes = node; }} value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Describe the completed physical work." aria-invalid={completionAttempted && Boolean(completionErrors.notes)} aria-describedby={completionAttempted && completionErrors.notes ? "red-tag-completion-notes-error" : undefined} /></Field><AfterEvidencePicker items={evidence} onChange={setEvidence} userName={user.name} error={completionAttempted ? completionErrors.evidence : undefined} targetRef={(node) => { completionTargets.current.evidence = node; }} /><div ref={(node) => { completionTargets.current.confirmation = node; }} className={`rounded-lg ${completionAttempted && completionErrors.confirmation ? "border border-destructive p-3 ring-2 ring-destructive/20" : ""}`}><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={responsibleConfirmed} onChange={(event) => setResponsibleConfirmed(event.target.checked)} aria-invalid={completionAttempted && Boolean(completionErrors.confirmation)} aria-describedby={completionAttempted && completionErrors.confirmation ? "red-tag-completion-confirmation-error" : undefined} /><span>The responsible person confirms the disposition work is complete.</span></label>{completionAttempted && completionErrors.confirmation && <p id="red-tag-completion-confirmation-error" role="alert" className="mt-2 text-xs font-medium text-destructive">{completionErrors.confirmation}</p>}</div><Button className="w-fit" disabled={completing} onClick={complete}>{completing ? "Completing…" : "Complete Disposition"}</Button>{incompleteLinkedAction && <p className="text-xs text-amber-700 dark:text-amber-400">Complete the linked Action {tag.actionId} before closing this disposition.</p>}</div>}</> : <p className="text-sm text-muted-foreground">Disposition details are unavailable.</p>}{error && <p role="alert" className="whitespace-pre-line text-sm text-destructive">{error}</p>}</CardContent></Card>;
}

function LinkedActionSection({ action, mayCreate, onCreate }: { action?: ReturnType<typeof useActionStore>[number]; mayCreate: boolean; onCreate: () => void }) {
  return <Card><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Optional Execution Action</h2><p className="mt-1 text-xs text-muted-foreground">Create an Action only when execution work needs separate tracking.</p></div>{action && <Badge variant={ACTION_STATUS_CONFIG[action.status].variant}>{action.status}</Badge>}</div>{action ? <div className="mt-4 grid gap-4 sm:grid-cols-3"><Meta label="Action ID" value={action.id} /><Meta label="Owner" value={action.responsiblePersonName || action.assignedTo} /><Meta label="Due" value={getActionDueLabel(action)} /><Button className="w-fit sm:col-span-3" variant="outline" nativeButton={false} render={<Link href={`/actions/${encodeURIComponent(action.id)}`} />}><ExternalLink className="size-4" />View Action</Button></div> : <div className="mt-4 rounded-lg border border-dashed p-4"><p className="text-sm text-muted-foreground">No Action is linked. Disposition may be completed directly with evidence.</p>{mayCreate && <Button className="mt-3" variant="outline" onClick={onCreate}><Link2 className="size-4" />Create Action</Button>}</div>}</CardContent></Card>;
}

function DispositionEvidence({ title, imageUrl, empty }: { title: string; imageUrl?: string; empty: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>{imageUrl ? <Image unoptimized width={640} height={480} src={imageUrl} alt={`${title} evidence`} className="mt-2 aspect-[4/3] w-full rounded-lg border object-contain" /> : <div className="mt-2 grid aspect-[4/3] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">{empty}</div>}</div>;
}

 function AfterEvidencePicker({ items, onChange, userName, error, targetRef }: { items: RedTagEvidence[]; onChange: (items: RedTagEvidence[]) => void; userName: string; error?: string; targetRef?: (node: HTMLDivElement | null) => void }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  async function addFiles(files: File[]) {
    const next: RedTagEvidence[] = [];
    for (const file of files) {
      const { dataUrl } = await optimizeEvidenceImage(file);
      next.push({ id: `RTE-${crypto.randomUUID()}`, name: file.name, url: dataUrl, mimeType: file.type, uploadedBy: userName, uploadedAt: new Date().toISOString() });
    }
    onChange([...items, ...next]);
  }
   return <div ref={targetRef} className={error ? "rounded-lg border border-destructive p-3 ring-2 ring-destructive/20" : undefined}><Field label="After Photo *" error={error} errorId="red-tag-after-photo-error"><div className="grid gap-3" aria-invalid={Boolean(error)} aria-describedby={error ? "red-tag-after-photo-error" : undefined}><div className="grid grid-cols-2 gap-2 sm:flex"><OpsCameraCapture fileNamePrefix="red-tag-after" onCapture={(file) => addFiles([file])} trigger={(openCamera) => <Button type="button" variant="outline" onClick={openCamera}><Camera className="size-4" />Take Photo</Button>} /><Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}><Upload className="size-4" />Upload Photo</Button></div><input ref={uploadRef} hidden multiple type="file" accept="image/*" onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />{items.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border"><Image unoptimized width={160} height={120} src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" /><div className="border-t"><button type="button" className="min-h-9 w-full text-xs font-medium text-destructive" onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))}>Remove</button></div></div>)}</div>}</div></Field></div>;
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
    <div className="grid gap-5 p-5"><div className="grid grid-cols-2 gap-x-5 gap-y-4"><LabelValue label="Item" value={tag.itemName} wide />{tag.quantity !== undefined && <LabelValue label="Quantity" value={String(tag.quantity)} />}<LabelValue label="Location" value={`${tag.zone} · ${tag.section}`} /><LabelValue label="Department" value={tag.department ?? "Not recorded"} />{tag.category && <LabelValue label="Category" value={tag.category} />}<LabelValue label="Reason" value={getRedTagReasonDisplay(tag.reason, tag.customReason)} wide />{tag.estimatedValue !== undefined && <LabelValue label="Estimated Value" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tag.estimatedValue)} />}<LabelValue label="Identified" value={displayDate(tag.createdAt)} /><LabelValue label="Identified By" value={tag.createdByName} wide /></div>
      <div className="grid justify-items-center border-t-2 border-red-200 pt-5"><QrCode value={qrTarget} size={188} /><p className="mt-3 text-base font-black tracking-wide text-red-700">SCAN TO VIEW RECORD</p></div>
    </div></article>;
}
function LabelValue({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "col-span-2" : ""}><p className="text-[11px] font-black uppercase tracking-widest text-red-700">{label}</p><p className="mt-1 text-sm font-bold leading-5">{value}</p></div>; }

function QrCode({ value, size }: { value: string; size: number }) {
  return <div className="grid justify-items-center gap-1"><QRCodeSVG value={value} size={size} level="M" marginSize={2} title={`Red Tag ${value}`} /><span className="sr-only">Open Red Tag at {value}</span></div>;
}
