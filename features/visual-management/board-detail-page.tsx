"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, CirclePlay, ClipboardCheck, History, ListTodo } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { formatVmDate, KpiStatusBadge, MeetingStatusBadge, StartMeetingDialog, VisualManagementNav } from "./visual-management-components";
import { canViewVisualManagementBoard } from "./visual-management-access";
import { meetingDurationMinutes, useVisualManagementStore } from "./visual-management-store";
import { ConfiguredKpiBoard } from "./configured-kpi-board";

export default function BoardDetailPage({ boardId }: { boardId: string }) {
  const state = useVisualManagementStore();
  const allActions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const [startOpen, setStartOpen] = useState(false);
  const candidate = state.boards.find((item) => item.id === boardId);
  const board = candidate && canViewVisualManagementBoard(candidate, currentUser, adminUser?.roles) ? candidate : undefined;
  const meetings = useMemo(() => state.meetings.filter((item) => item.boardId === boardId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [boardId, state.meetings]);
  if (!board) return <Missing />;
  const actionIds = new Set(meetings.flatMap((meeting) => meeting.actionIds));
  const actions = allActions.filter((action) => actionIds.has(action.id) || (action.sourceModule === "visualManagement" && action.sourceLocation?.includes(board.zone ?? board.plant)));
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow={`${board.tier} · ${board.plant}${board.zone ? ` / ${board.zone}` : ""}`} title={board.name} description={`${board.meetingFrequency} · Owner: ${board.owner.name} · ${board.members.length} expected members`} leading={<Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/visual-management/boards" />} aria-label="Back to boards"><ArrowLeft className="size-4" /></Button>} actions={<Button onClick={() => setStartOpen(true)}><CirclePlay className="size-4" />Start Meeting</Button>} /><VisualManagementNav />
    <Tabs defaultValue="board"><TabsList variant="line" className="max-w-full overflow-x-auto"><TabsTrigger value="board"><ClipboardCheck />Board</TabsTrigger><TabsTrigger value="actions"><ListTodo />Actions <Badge size="sm" variant="secondary">{actions.length}</Badge></TabsTrigger><TabsTrigger value="meetings"><History />Meetings <Badge size="sm" variant="secondary">{meetings.length}</Badge></TabsTrigger><TabsTrigger value="trends"><BarChart3 />Trends</TabsTrigger></TabsList>
      <TabsContent value="board" className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-12"><ConfiguredKpiBoard board={board} /></div>
        <section className="grid gap-3 sm:grid-cols-2 xl:col-span-8 2xl:grid-cols-3">
          {board.sections.map((entry) => <Card key={entry.section} className="gap-0 shadow-none"><CardHeader className="flex-row items-center justify-between border-b pb-3"><CardTitle className="text-sm">{entry.section}</CardTitle><KpiStatusBadge status={entry.status} /></CardHeader><CardContent className="grid gap-3 p-4 text-xs"><Meta label="Target" value={entry.target} /><Meta label="Actual" value={entry.actual} /><Meta label="Latest note" value={entry.note || "No exception noted."} /></CardContent></Card>)}
        </section>
        <aside className="grid content-start gap-4 xl:col-span-4">
          <Card className="gap-0"><CardHeader className="border-b pb-4"><CardTitle className="text-[15px]">Previous Actions</CardTitle></CardHeader><CardContent className="divide-y p-0">{actions.slice(0, 5).map((action) => <Link href={`/actions/${action.id}`} key={action.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{action.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{action.responsiblePersonName ?? action.assignedTo} · Due {action.dueDate}</span></span><Badge variant={action.status === "Completed" ? "success" : action.status === "Overdue" ? "danger" : "warning"}>{action.status}</Badge></Link>)}{!actions.length && <Empty text="No board actions yet" />}</CardContent></Card>
        </aside>
      </TabsContent>
      <TabsContent value="actions" className="mt-4"><Card className="gap-0"><CardContent className="divide-y p-0">{actions.map((action) => <Link href={`/actions/${action.id}`} key={action.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{action.title}</span><span className="mt-1 block text-xs text-muted-foreground">{action.id} · {action.responsiblePersonName ?? action.assignedTo} · Due {action.dueDate}</span></span><Badge variant={action.status === "Completed" ? "success" : action.status === "Overdue" ? "danger" : "warning"}>{action.status}</Badge><ArrowRight className="size-4 text-muted-foreground" /></Link>)}{!actions.length && <Empty text="Actions created during meetings will appear here." />}</CardContent></Card></TabsContent>
      <TabsContent value="meetings" className="mt-4"><Card className="gap-0"><CardContent className="divide-y p-0">{meetings.map((meeting) => <Link href={`/visual-management/meetings/${meeting.id}`} key={meeting.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"><span className="min-w-0 flex-1"><span className="block font-mono text-xs font-semibold text-primary">{meeting.id}</span><span className="mt-1 block text-xs text-muted-foreground">{formatVmDate(meeting.startedAt, true)} · {meeting.lead.name} · {meetingDurationMinutes(meeting)} min</span></span><MeetingStatusBadge status={meeting.status} /><ArrowRight className="size-4 text-muted-foreground" /></Link>)}{!meetings.length && <Empty text="No meetings have been recorded for this board." />}</CardContent></Card></TabsContent>
      <TabsContent value="trends" className="mt-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{board.sections.map((entry) => { const values = meetings.slice(0, 5).reverse().map((meeting) => meeting.kpiEntries.find((item) => item.section === entry.section)?.status ?? "Green"); return <Card key={entry.section} className="gap-0"><CardHeader className="border-b pb-3"><CardTitle className="text-sm">{entry.section}</CardTitle></CardHeader><CardContent className="p-4"><div className="flex h-24 items-end gap-2">{values.length ? values.map((status, index) => <span key={index} title={status} className={`min-h-3 flex-1 rounded-t ${status === "Green" ? "bg-emerald-500" : status === "Amber" ? "bg-amber-500" : "bg-red-500"}`} style={{ height: status === "Green" ? "35%" : status === "Amber" ? "65%" : "100%" }} />) : <span className="self-center text-xs text-muted-foreground">No history</span>}</div><p className="mt-3 text-[11px] text-muted-foreground">Last {values.length} meetings</p></CardContent></Card>; })}</div></TabsContent>
    </Tabs><StartMeetingDialog open={startOpen} onOpenChange={setStartOpen} initialBoardId={board.id} /></PageContainer>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 leading-5">{value}</p></div>; }

function Empty({ text }: { text: string }) { return <div className="grid min-h-32 place-items-center p-6 text-center text-sm text-muted-foreground">{text}</div>; }
function Missing() { return <PageContainer><FiveSPageHeader eyebrow="Visual Management" title="Board not found" description="This board is unavailable." /><Button variant="outline" nativeButton={false} render={<Link href="/visual-management/boards" />}>Back to Boards</Button></PageContainer>; }
