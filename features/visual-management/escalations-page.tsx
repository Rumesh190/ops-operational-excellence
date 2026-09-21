"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CornerUpRight } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { visibleVisualManagementBoards } from "./visual-management-access";
import { EscalationStatusBadge, formatVmDate, VisualManagementNav, VmMetric } from "./visual-management-components";
import { updateEscalationStatus, useVisualManagementStore } from "./visual-management-store";

export default function EscalationsPage() {
  const [notice, setNotice] = useState("");
  const rawState = useVisualManagementStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const boards = visibleVisualManagementBoards(rawState.boards, currentUser, adminUser?.roles);
  const visibleBoardIds = new Set(boards.map((board) => board.id));
  const state = { ...rawState, boards, escalations: rawState.escalations.filter((item) => visibleBoardIds.has(item.sourceBoardId) || visibleBoardIds.has(item.targetBoardId)) };
  const open = state.escalations.filter((item) => !["Resolved", "Returned"].includes(item.status));
  const boardMap = new Map(state.boards.map((board) => [board.id, board]));
  const topicMap = new Map(state.topics.map((topic) => [topic.id, topic]));
  function changeStatus(id: string, status: Parameters<typeof updateEscalationStatus>[1]) {
    setNotice("");
    try { updateEscalationStatus(id, status); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Unable to update this escalation."); }
  }
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Visual Management" title="Escalations" description="Issues raised from one tier to the next, with ownership and response status." /><VisualManagementNav />{notice && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">{notice}</p>}<section className="grid gap-3 sm:grid-cols-3"><VmMetric label="Open" value={state.escalations.filter((item) => item.status === "Open").length} tone="danger" /><VmMetric label="In Review" value={state.escalations.filter((item) => ["Acknowledged", "In Progress"].includes(item.status)).length} tone="warning" /><VmMetric label="Resolved" value={state.escalations.filter((item) => item.status === "Resolved").length} tone="success" /></section><div className="grid gap-3">{state.escalations.map((item) => { const topic = topicMap.get(item.topicId); const source = boardMap.get(item.sourceBoardId); const target = boardMap.get(item.targetBoardId); return <Card key={item.id} className="gap-0"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{item.id}</span><EscalationStatusBadge status={item.status} /><Badge variant="outline">{source?.tier} → {target?.tier}</Badge></div><h2 className="mt-2 text-sm font-semibold">{topic?.title ?? item.reason}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><Link href={`/visual-management/boards/${source?.id}`} className="font-medium text-primary hover:underline">{source?.name}</Link><CornerUpRight className="size-3.5 text-muted-foreground" /><Link href={`/visual-management/boards/${target?.id}`} className="font-medium text-primary hover:underline">{target?.name}</Link><span className="text-muted-foreground">· {formatVmDate(item.createdAt, true)}</span></div></div><div className="flex flex-wrap gap-2">{item.status === "Open" && <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, "Acknowledged")}>Acknowledge</Button>}{!["Resolved", "Returned"].includes(item.status) && <><Button size="sm" variant="outline" onClick={() => changeStatus(item.id, "In Progress")}>In Progress</Button><Button size="sm" onClick={() => changeStatus(item.id, "Resolved")}>Resolve</Button></>}<Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/visual-management/meetings/${item.sourceMeetingId}`} />}>Meeting <ArrowRight className="size-3.5" /></Button></div></div></CardContent></Card>; })}{!open.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No active escalations.</p>}</div></PageContainer>;
}
