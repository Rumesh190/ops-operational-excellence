"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Save, Send } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { getFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { cn } from "@/lib/utils";
import { canEditProposal, canViewImprovement } from "./access";
import { ImprovementEvidencePicker, ImprovementStatusBadge } from "./components";
import { IMPROVEMENT_BENEFIT_TYPES } from "./config";
import { selectableImprovementOwners } from "./owner";
import { submitImprovement, updateImprovementProposal, useImprovements } from "./store";
import type { ContinuousImprovement, ImprovementBenefitType, ImprovementEvidence, TimeUnit } from "./types";

export default function ContinuousImprovementEditPage({ improvementId }: { improvementId: string }) {
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const item = useImprovements().find((record) => record.id === improvementId);
  if (!item || !canViewImprovement(adminUser, currentUser, item)) return <PageContainer><FiveSPageHeader eyebrow="Continuous Improvement" title="Improvement not found" description="This improvement is unavailable." /></PageContainer>;
  if (!canEditProposal(adminUser, currentUser, item)) return <PageContainer><FiveSPageHeader eyebrow="Continuous Improvement" title="Proposal locked" description="Only draft or submitted proposals can be edited by their proposer." leading={<Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}`} />}><ArrowLeft className="size-4" /></Button>} /><Card><CardContent className="grid min-h-48 place-items-center text-sm text-muted-foreground">This improvement is currently {item.status.replaceAll("_", " ")}.</CardContent></Card></PageContainer>;
  return <ProposalEditor key={`${item.id}-${item.updatedAt}`} item={item} />;
}

function ProposalEditor({ item }: { item: ContinuousImprovement }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const zone = getFiveSZoneConfiguration(item.zone)!;
  const ownerOptions = selectableImprovementOwners(adminUsers, item.plant, item.zone);
  const [title, setTitle] = useState(item.title);
  const [problem, setProblem] = useState(item.issueDescription);
  const [proposal, setProposal] = useState(item.proposedImprovement);
  const [expectedBenefit, setExpectedBenefit] = useState(item.expectedBenefit);
  const [benefitType, setBenefitType] = useState<ImprovementBenefitType>(item.benefitType);
  const [proposedSaving, setProposedSaving] = useState(item.proposedSaving?.toString() ?? "");
  const [estimatedTime, setEstimatedTime] = useState(item.estimatedTime.toString());
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<TimeUnit>(item.estimatedTimeUnit);
  const [memberIds, setMemberIds] = useState(item.memberIds);
  const [ownerId, setOwnerId] = useState(item.ownerId);
  const [beforeEvidence, setBeforeEvidence] = useState<ImprovementEvidence[]>(item.beforeEvidence);
  const [notice, setNotice] = useState("");

  function save(submitDraft = false) {
    setNotice("");
    try {
      updateImprovementProposal(item.id, { title, issueDescription: problem, proposedImprovement: proposal, expectedBenefit, benefitType, proposedSaving: proposedSaving === "" ? undefined : Number(proposedSaving), estimatedTime: Number(estimatedTime), estimatedTimeUnit, ownerId, memberIds, beforeEvidence }, currentUser);
      if (submitDraft && item.status === "draft") submitImprovement(item.id, currentUser);
      setNotice(submitDraft ? "Proposal submitted for review." : "Proposal changes saved.");
      if (submitDraft) router.push(`/continuous-improvement/${encodeURIComponent(item.id)}?tab=review`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Unable to save the proposal."); }
  }
  function toggleMember(id: string) { setMemberIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  return <PageContainer className="max-w-5xl pb-24 sm:pb-8"><FiveSPageHeader eyebrow="Continuous Improvement" title="Edit Proposal" description={`${item.id} · Update the opportunity, proposal, and expected benefit.`} leading={<Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}`} />}><ArrowLeft className="size-4" /></Button>} actions={<ImprovementStatusBadge status={item.status} />} />{notice && <div role="status" className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">{notice}</div>}
    <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-base">Current State</CardTitle></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5"><Field label="Title *"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Plant"><Input value={item.plant} disabled /></Field><Field label="Zone"><Input value={item.zone} disabled /></Field><Field label="Created By"><Input value={item.proposedByName} disabled /></Field><Field label="Owner *"><Select value={ownerId} onValueChange={(value) => setOwnerId(value ?? ownerId)}><SelectTrigger className="w-full"><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{ownerOptions.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name} · {owner.zoneMemberships.find((membership) => membership.zone === item.zone)?.responsibility ?? "Admin"}</SelectItem>)}</SelectContent></Select></Field></div><Field label="Problem / Opportunity *"><Textarea rows={5} value={problem} onChange={(event) => setProblem(event.target.value)} /></Field><div><Label className="mb-2 block">Current-state Evidence</Label><ImprovementEvidencePicker items={beforeEvidence} onChange={setBeforeEvidence} uploadedBy={currentUser.name} /></div></CardContent></Card>
    <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-base">Proposed Improvement</CardTitle></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5"><Field label="Proposed Improvement *"><Textarea rows={5} value={proposal} onChange={(event) => setProposal(event.target.value)} /></Field><Field label="Participants"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{zone.members.map((member) => <button key={member.id} type="button" onClick={() => toggleMember(member.id)} className={cn("flex min-h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm", memberIds.includes(member.id) ? "border-primary/35 bg-primary/[0.06]" : "hover:bg-muted/30")}><span className={cn("grid size-5 shrink-0 place-items-center rounded border", memberIds.includes(member.id) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{memberIds.includes(member.id) && <Check className="size-3.5" />}</span>{member.name}</button>)}</div></Field></CardContent></Card>
    <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-base">Expected Benefit</CardTitle></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5"><Field label="Expected Benefit Description *"><Textarea rows={4} value={expectedBenefit} onChange={(event) => setExpectedBenefit(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Benefit Type"><Select value={benefitType} onValueChange={(value) => setBenefitType((value ?? "Other") as ImprovementBenefitType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{IMPROVEMENT_BENEFIT_TYPES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Proposed Cost Saving (INR)"><Input type="number" min="0" value={proposedSaving} onChange={(event) => setProposedSaving(event.target.value)} /></Field><Field label="Estimated Completion Time *"><Input type="number" min="1" value={estimatedTime} onChange={(event) => setEstimatedTime(event.target.value)} /></Field><Field label="Time Unit"><Select value={estimatedTimeUnit} onValueChange={(value) => setEstimatedTimeUnit((value ?? "Days") as TimeUnit)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{(["Hours", "Days", "Weeks"] as TimeUnit[]).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field></div></CardContent></Card>
    <div className="hidden justify-end gap-2 sm:flex"><Button variant="outline" onClick={() => save(false)}><Save className="size-4" />Save Changes</Button>{item.status === "draft" && <Button onClick={() => save(true)}><Send className="size-4" />Submit for Review</Button>}</div><div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t bg-background/95 p-3 backdrop-blur sm:hidden"><Button variant="outline" className="min-h-11" onClick={() => save(false)}><Save className="size-4" />Save</Button>{item.status === "draft" ? <Button className="min-h-11" onClick={() => save(true)}><Send className="size-4" />Submit</Button> : <Button className="min-h-11" nativeButton={false} render={<Link href={`/continuous-improvement/${encodeURIComponent(item.id)}`} />}>Done</Button>}</div>
  </PageContainer>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-medium">{label}{children}</label>; }
