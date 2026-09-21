"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser, type DemoUser } from "@/lib/current-user";
import { canManageVisualImprovement, canViewVisualImprovement } from "./visual-improvement-access";
import { VISUAL_IMPROVEMENT_CATEGORIES } from "./visual-improvement-config";
import { VisualEvidencePicker, VisualImprovementStatusBadge } from "./visual-improvement-components";
import { planVisualImprovement, saveVisualImprovement, submitVisualImprovement, useVisualImprovements } from "./visual-improvement-store";
import type { VisualImprovement, VisualImprovementCategory, VisualImprovementEvidence } from "./types";

export default function VisualImprovementEditPage({ improvementId }: { improvementId: string }) {
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const item = useVisualImprovements().find((record) => record.id === improvementId);
  if (!item || !canViewVisualImprovement(adminUser, currentUser, item)) return <Unavailable />;
  const mayManage = canManageVisualImprovement(adminUser, currentUser, item);
  const editable = mayManage && !["Awaiting Review", "Completed"].includes(item.status);
  if (!editable) return <PageContainer><FiveSPageHeader eyebrow={`Visual Improvement / ${item.id}`} title="Editing unavailable" description={`This improvement is currently ${item.status.toLowerCase()}.`} leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/visual-improvement/${encodeURIComponent(item.id)}`} />}><ArrowLeft className="size-4" /></Button>} /><Card><CardContent className="grid min-h-48 place-items-center"><Button variant="outline" nativeButton={false} render={<Link href={`/visual-improvement/${encodeURIComponent(item.id)}`} />}>Back to Improvement</Button></CardContent></Card></PageContainer>;
  return <VisualImprovementEditor key={item.id} item={item} currentUser={currentUser} />;
}

function VisualImprovementEditor({ item, currentUser }: { item: VisualImprovement; currentUser: DemoUser }) {
  const router = useRouter();
  const itemId = item.id;
  const [title, setTitle] = useState(item.title);
  const [location, setLocation] = useState(item.location);
  const [category, setCategory] = useState<VisualImprovementCategory>(item.category);
  const [beforeDescription, setBeforeDescription] = useState(item.beforeDescription);
  const [beforeEvidence, setBeforeEvidence] = useState<VisualImprovementEvidence[]>(item.beforeEvidence);
  const [afterDescription, setAfterDescription] = useState(item.afterDescription ?? "");
  const [afterEvidence, setAfterEvidence] = useState<VisualImprovementEvidence[]>(item.afterEvidence);
  const [proposedSaving, setProposedSaving] = useState(item.proposedCostSaving?.toString() ?? "");
  const [actualSaving, setActualSaving] = useState(item.actualCostSaving?.toString() ?? "");
  const [benefitDescription, setBenefitDescription] = useState(item.benefitDescription ?? "");
  const [timeSaved, setTimeSaved] = useState(item.timeSaved ?? "");
  const [spaceSaved, setSpaceSaved] = useState(item.spaceSaved ?? "");
  const [safetyBenefit, setSafetyBenefit] = useState(item.safetyBenefit ?? "");
  const [qualityBenefit, setQualityBenefit] = useState(item.qualityBenefit ?? "");
  const [otherBenefit, setOtherBenefit] = useState(item.otherBenefit ?? "");
  const [completionNotes, setCompletionNotes] = useState(item.completionNotes ?? "");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(item.estimatedCompletionDate ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function save(submit = false, moveToPlanned = false) {
    if (!title.trim() || !location.trim() || !beforeDescription.trim() || !beforeEvidence.length) { setError("Title, location, before description, and before evidence are required."); return; }
    if (submit && (!afterDescription.trim() || !afterEvidence.length)) { setError("After description and after evidence are required before review."); return; }
    if (proposedSaving && (!Number.isFinite(Number(proposedSaving)) || Number(proposedSaving) < 0)) { setError("Proposed saving must be zero or more."); return; }
    if (actualSaving && (!Number.isFinite(Number(actualSaving)) || Number(actualSaving) < 0)) { setError("Actual saving must be zero or more."); return; }
    const updated = saveVisualImprovement(itemId, { title: title.trim(), location: location.trim(), category, beforeDescription: beforeDescription.trim(), beforeEvidence, afterDescription: afterDescription.trim() || undefined, afterEvidence, proposedCostSaving: proposedSaving ? Number(proposedSaving) : undefined, actualCostSaving: actualSaving ? Number(actualSaving) : undefined, benefitDescription: benefitDescription.trim() || undefined, timeSaved: timeSaved.trim() || undefined, spaceSaved: spaceSaved.trim() || undefined, safetyBenefit: safetyBenefit.trim() || undefined, qualityBenefit: qualityBenefit.trim() || undefined, otherBenefit: otherBenefit.trim() || undefined, completionNotes: completionNotes.trim() || undefined, estimatedCompletionDate: estimatedCompletionDate || undefined }, currentUser);
    if (!updated) { setError("Unable to save this improvement."); return; }
    if (moveToPlanned) planVisualImprovement(itemId, currentUser);
    if (submit) submitVisualImprovement(itemId, currentUser);
    setError(""); setSaved(true);
    if (submit || moveToPlanned) router.push(`/visual-improvement/${encodeURIComponent(itemId)}${submit ? "?tab=review" : ""}`);
  }

  const canSubmit = ["In Progress", "Returned"].includes(item.status);
  return <PageContainer className="max-w-5xl pb-24 sm:pb-8">
    <FiveSPageHeader eyebrow={`Visual Improvement / ${item.id}`} title="Update Improvement" description="Add the after state and record the benefits created by the visible change." leading={<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link href={`/visual-improvement/${encodeURIComponent(item.id)}`} />} aria-label="Back to improvement"><ArrowLeft className="size-4" /></Button>} actions={<VisualImprovementStatusBadge status={item.status} />} />
    {item.status === "Returned" && item.reviewRemark && <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.055] p-4"><p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Returned for changes</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reviewRemark}</p></div>}
    {saved && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" />Improvement saved.</div>}

    <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-base">Improvement details</CardTitle></CardHeader><CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"><Field label="Title *" className="sm:col-span-2"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Area / Location *"><Input value={location} onChange={(event) => setLocation(event.target.value)} /></Field><Field label="Category *"><Select value={category} onValueChange={(value) => setCategory((value ?? "Other") as VisualImprovementCategory)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{VISUAL_IMPROVEMENT_CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Estimated Completion Date"><Input type="date" value={estimatedCompletionDate} onChange={(event) => setEstimatedCompletionDate(event.target.value)} /></Field><Field label="Proposed Cost Saving (INR / year)"><Input type="number" min="0" value={proposedSaving} onChange={(event) => setProposedSaving(event.target.value)} placeholder="Optional" /></Field><Field label="Before Description *" className="sm:col-span-2"><Textarea value={beforeDescription} onChange={(event) => setBeforeDescription(event.target.value)} rows={4} /></Field><div className="sm:col-span-2"><Label className="mb-2 block">Before Evidence *</Label><VisualEvidencePicker items={beforeEvidence} onChange={setBeforeEvidence} uploadedBy={currentUser.name} label="Add before photos" required /></div></CardContent></Card>

    <Card className="gap-0 border-emerald-500/15"><CardHeader className="border-b pb-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400"><Camera className="size-4" /></span><div><CardTitle className="text-base">After state</CardTitle><p className="mt-1 text-xs text-muted-foreground">Capture the completed transformation at the same useful angle where possible.</p></div></div></CardHeader><CardContent className="grid gap-5 p-4 sm:p-5"><Field label="After Description"><Textarea value={afterDescription} onChange={(event) => setAfterDescription(event.target.value)} placeholder="What visibly changed and how is the area working now?" rows={4} /></Field><div><Label className="mb-2 block">After Evidence</Label><VisualEvidencePicker items={afterEvidence} onChange={setAfterEvidence} uploadedBy={currentUser.name} label="Add after photos" /></div></CardContent></Card>

    <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-base">Benefits and completion</CardTitle><p className="text-xs text-muted-foreground">Only record values that are meaningful for this improvement.</p></CardHeader><CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"><Field label="Actual Cost Saving (INR / year)"><Input type="number" min="0" value={actualSaving} onChange={(event) => setActualSaving(event.target.value)} placeholder="Optional" /></Field><Field label="Time Saved"><Input value={timeSaved} onChange={(event) => setTimeSaved(event.target.value)} placeholder="Example: 12 minutes per shift" /></Field><Field label="Space Saved"><Input value={spaceSaved} onChange={(event) => setSpaceSaved(event.target.value)} placeholder="Example: 18 m²" /></Field><Field label="Safety Benefit"><Input value={safetyBenefit} onChange={(event) => setSafetyBenefit(event.target.value)} placeholder="Optional" /></Field><Field label="Quality Benefit"><Input value={qualityBenefit} onChange={(event) => setQualityBenefit(event.target.value)} placeholder="Optional" /></Field><Field label="Other Benefit"><Input value={otherBenefit} onChange={(event) => setOtherBenefit(event.target.value)} placeholder="Optional" /></Field><Field label="Benefit Description" className="sm:col-span-2"><Textarea value={benefitDescription} onChange={(event) => setBenefitDescription(event.target.value)} placeholder="Summarize the measurable or practical benefit." rows={3} /></Field><Field label="Completion Notes" className="sm:col-span-2"><Textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Verification, handover, or standardization notes." rows={3} /></Field></CardContent></Card>
    {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}
    <div className="hidden justify-end gap-2 sm:flex"><Button variant="outline" onClick={() => save(false)}><Save className="size-4" />Save Changes</Button>{item.status === "Draft" && <Button onClick={() => save(false, true)}>Save & Move to Planned</Button>}{canSubmit && <Button onClick={() => save(true)}><CheckCircle2 className="size-4" />{item.status === "Returned" ? "Resubmit for Review" : "Submit for Review"}</Button>}</div>
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t bg-background/95 p-3 backdrop-blur sm:hidden"><Button variant="outline" className="h-11" onClick={() => save(false)}>Save</Button>{item.status === "Draft" ? <Button className="h-11" onClick={() => save(false, true)}>Move to Planned</Button> : canSubmit ? <Button className="h-11" onClick={() => save(true)}>{item.status === "Returned" ? "Resubmit" : "Submit for Review"}</Button> : <Button className="h-11" nativeButton={false} render={<Link href={`/visual-improvement/${encodeURIComponent(item.id)}`} />}>Done</Button>}</div>
  </PageContainer>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`grid min-w-0 gap-1.5 text-sm font-medium ${className ?? ""}`}>{label}{children}</label>; }
function Unavailable() { return <PageContainer><FiveSPageHeader eyebrow="OPS Workspace / Visual Improvement" title="Improvement unavailable" description="This improvement could not be found or is outside your access." /><Card><CardContent className="grid min-h-48 place-items-center"><Button variant="outline" nativeButton={false} render={<Link href="/visual-improvement" />}>Back to Visual Improvement</Button></CardContent></Card></PageContainer>; }
