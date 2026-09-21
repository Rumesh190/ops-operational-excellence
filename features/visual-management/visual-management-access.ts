import type { VisualManagementBoard, VisualManagementMeeting } from "./types";

export interface VisualManagementAccessUser {
  id: string;
  plant: string;
  primaryZone: string;
  isSuperAdmin: boolean;
}

export function canViewVisualManagementBoard(board: VisualManagementBoard, user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  if (user.isSuperAdmin || roles?.some((role) => role === "Admin" || role === "Auditor")) return true;
  if (board.owner.id === user.id || board.members.some((member) => member.id === user.id)) return true;
  return board.plant === user.plant && Boolean(board.zone) && board.zone === user.primaryZone;
}

export function visibleVisualManagementBoards(boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  return boards.filter((board) => canViewVisualManagementBoard(board, user, roles));
}

export function canViewVisualManagementMeeting(meeting: VisualManagementMeeting, boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  const board = boards.find((item) => item.id === meeting.boardId);
  return Boolean(board && canViewVisualManagementBoard(board, user, roles));
}

export function visibleVisualManagementMeetings(meetings: VisualManagementMeeting[], boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  const visibleIds = new Set(visibleVisualManagementBoards(boards, user, roles).map((board) => board.id));
  return meetings.filter((meeting) => visibleIds.has(meeting.boardId));
}
