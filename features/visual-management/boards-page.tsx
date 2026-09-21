"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CirclePlay } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";
import { formatVmDate, StartMeetingDialog, VisualManagementNav } from "./visual-management-components";
import { visibleVisualManagementBoards } from "./visual-management-access";
import { useVisualManagementStore } from "./visual-management-store";

export default function BoardsPage() {
  const rawState = useVisualManagementStore();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const boards = visibleVisualManagementBoards(rawState.boards, currentUser, adminUser?.roles);
  const visibleBoardIds = new Set(boards.map((board) => board.id));
  const state = { ...rawState, boards, meetings: rawState.meetings.filter((meeting) => visibleBoardIds.has(meeting.boardId)), escalations: rawState.escalations.filter((item) => visibleBoardIds.has(item.sourceBoardId) || visibleBoardIds.has(item.targetBoardId)) };
  const [startBoardId, setStartBoardId] = useState<string>();
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Visual Management" title="Boards" description="Daily management boards for zone, plant, and leadership tier reviews." actions={<Button onClick={() => setStartBoardId("")}><CirclePlay className="size-4" />Start Meeting</Button>} /><VisualManagementNav />
    <Card className="gap-0 overflow-hidden"><div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow><TableHead>Board</TableHead><TableHead>Tier</TableHead><TableHead>Plant / Zone</TableHead><TableHead>Owner</TableHead><TableHead>Frequency</TableHead><TableHead>Last Meeting</TableHead><TableHead>Open Actions</TableHead><TableHead>Escalations</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{state.boards.map((board) => { const meetings = state.meetings.filter((item) => item.boardId === board.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)); const openEscalations = state.escalations.filter((item) => (item.sourceBoardId === board.id || item.targetBoardId === board.id) && !["Resolved", "Returned"].includes(item.status)).length; const actionIds = new Set(meetings.flatMap((item) => item.actionIds)); const actionCount = actions.filter((action) => actionIds.has(action.id) && action.status !== "Completed").length; return <TableRow key={board.id}><TableCell><Link href={`/visual-management/boards/${board.id}`} className="font-semibold hover:text-primary hover:underline">{board.name}</Link></TableCell><TableCell><Badge variant="outline">{board.tier}</Badge></TableCell><TableCell className="text-muted-foreground">{board.plant}<br />{board.zone ?? "All zones"}</TableCell><TableCell>{board.owner.name}</TableCell><TableCell>{board.meetingFrequency}</TableCell><TableCell>{meetings[0] ? formatVmDate(meetings[0].startedAt, true) : "Not started"}</TableCell><TableCell>{actionCount} Open</TableCell><TableCell>{openEscalations} Escalated</TableCell><TableCell><Badge variant={board.status === "Active" ? "success" : "muted"}>{board.status}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setStartBoardId(board.id)}>Start <CirclePlay className="size-3.5" /></Button></TableCell></TableRow>; })}</TableBody></Table></div>
      <CardContent className="grid gap-3 p-3 lg:hidden">{state.boards.map((board) => <article key={board.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/visual-management/boards/${board.id}`} className="text-sm font-semibold">{board.name}</Link><p className="mt-1 text-xs text-muted-foreground">{board.plant} · {board.zone ?? "All zones"}</p></div><Badge variant="outline">{board.tier}</Badge></div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs"><span><span className="block text-muted-foreground">Owner</span><span className="mt-1 block font-medium">{board.owner.name}</span></span><span><span className="block text-muted-foreground">Frequency</span><span className="mt-1 block font-medium">{board.meetingFrequency}</span></span></div><div className="mt-3 flex gap-2"><Button className="flex-1" size="sm" onClick={() => setStartBoardId(board.id)}><CirclePlay className="size-3.5" />Start</Button><Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/visual-management/boards/${board.id}`} />}>Open<ArrowRight className="size-3.5" /></Button></div></article>)}</CardContent>
    </Card><StartMeetingDialog key={startBoardId ?? "all"} open={startBoardId !== undefined} onOpenChange={(open) => { if (!open) setStartBoardId(undefined); }} initialBoardId={startBoardId || undefined} /></PageContainer>;
}
