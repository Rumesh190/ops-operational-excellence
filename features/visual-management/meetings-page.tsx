"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CirclePlay, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminUsers } from "@/features/five-s/administration/store";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { visibleVisualManagementBoards, visibleVisualManagementMeetings } from "./visual-management-access";
import { formatVmDate, MeetingStatusBadge, StartMeetingDialog, VisualManagementNav } from "./visual-management-components";
import { meetingDurationMinutes, useVisualManagementStore } from "./visual-management-store";

export default function MeetingsPage() {
  const rawState = useVisualManagementStore();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const boards = visibleVisualManagementBoards(rawState.boards, currentUser, adminUser?.roles);
  const state = { ...rawState, boards, meetings: visibleVisualManagementMeetings(rawState.meetings, rawState.boards, currentUser, adminUser?.roles) };
  const [search, setSearch] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const boardMap = useMemo(() => new Map(state.boards.map((board) => [board.id, board])), [state.boards]);
  const meetings = state.meetings.filter((meeting) => `${meeting.id} ${meeting.boardName ?? boardMap.get(meeting.boardId)?.name ?? ""} ${meeting.lead.name} ${meeting.zone ?? ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return <PageContainer className="max-w-none"><FiveSPageHeader eyebrow="Visual Management" title="Meetings" description="History of daily management and tier-review meetings." actions={<Button onClick={() => setStartOpen(true)}><CirclePlay className="size-4" />Start Meeting</Button>} /><VisualManagementNav /><div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings..." /></div><Card className="gap-0 overflow-hidden"><div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow>{["Meeting ID", "Board", "Tier", "Plant / Zone", "Date", "Lead", "Participants", "Topics", "Actions", "Escalations", "Duration", "Status"].map((heading) => <TableHead key={heading}>{heading}</TableHead>)}</TableRow></TableHeader><TableBody>{meetings.map((meeting) => <TableRow key={meeting.id}><TableCell><Link href={`/visual-management/meetings/${meeting.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{meeting.id}</Link></TableCell><TableCell className="font-medium">{meeting.boardName ?? boardMap.get(meeting.boardId)?.name ?? meeting.boardId}</TableCell><TableCell><Badge variant="outline">{meeting.tier}</Badge></TableCell><TableCell className="text-muted-foreground">{meeting.plant}<br />{meeting.zone ?? "All zones"}</TableCell><TableCell>{formatVmDate(meeting.startedAt, true)}</TableCell><TableCell>{meeting.lead.name}</TableCell><TableCell>{meeting.participants.filter((item) => item.attendance === "Present").length}</TableCell><TableCell>{meeting.topicIds.length}</TableCell><TableCell>{meeting.actionIds.length}</TableCell><TableCell>{meeting.escalationIds.length}</TableCell><TableCell>{meetingDurationMinutes(meeting)} min</TableCell><TableCell><MeetingStatusBadge status={meeting.status} /></TableCell></TableRow>)}</TableBody></Table></div><CardContent className="grid gap-3 p-3 lg:hidden">{meetings.map((meeting) => <Link key={meeting.id} href={`/visual-management/meetings/${meeting.id}`} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-primary">{meeting.id}</p><p className="mt-1 text-sm font-semibold">{meeting.boardName ?? boardMap.get(meeting.boardId)?.name ?? meeting.boardId}</p></div><MeetingStatusBadge status={meeting.status} /></div><p className="mt-2 text-xs text-muted-foreground">{formatVmDate(meeting.startedAt, true)} · {meeting.lead.name}</p><div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground"><span>{meeting.topicIds.length} topics</span><span>{meeting.actionIds.length} actions</span><span>{meetingDurationMinutes(meeting)} min</span><ArrowRight className="ml-auto size-4" /></div></Link>)}</CardContent></Card><StartMeetingDialog open={startOpen} onOpenChange={setStartOpen} /></PageContainer>;
}
