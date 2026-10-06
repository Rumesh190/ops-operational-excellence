import { afterEach, describe, expect, it } from "vitest";
import { occurrencesInRange, setMeetingSchedulesForTests, validateMeetingSchedule, type MeetingSchedule } from "@/features/visual-management/meeting-schedule-store";

const base: MeetingSchedule = {
  id: "schedule-test",
  boardId: "board-test",
  date: "2026-10-05",
  time: "09:30",
  durationMinutes: 30,
  recurrence: { type: "weekly", interval: 1, weekdays: [0, 3], end: { type: "count", count: 4 } },
  attendees: [{ id: "user-test", name: "Test User", attendance: "Absent", expected: true }],
  createdByUserId: "user-test",
  createdAt: "2026-10-05T00:00:00.000Z",
  status: "Scheduled",
  overrides: [],
};

afterEach(() => setMeetingSchedulesForTests([]));

describe("Visual Management meeting schedules", () => {
  it("expands weekly selected weekdays without persisting instances", () => {
    expect(occurrencesInRange(base, "2026-10-01", "2026-11-01").map((item) => item.date)).toEqual(["2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"]);
  });
  it("supports monthly dates in shorter months and count ends", () => {
    const schedule: MeetingSchedule = { ...base, date: "2026-01-31", recurrence: { type: "monthly", interval: 1, end: { type: "count", count: 3 } } };
    expect(occurrencesInRange(schedule, "2026-01-01", "2026-04-30").map((item) => item.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
  it("applies a single cancellation without changing adjacent instances", () => {
    const schedule: MeetingSchedule = { ...base, overrides: [{ occurrenceDate: "2026-10-08", cancelled: true }] };
    expect(occurrencesInRange(schedule, "2026-10-05", "2026-10-15").map((item) => item.status)).toEqual(["Scheduled", "Cancelled", "Scheduled", "Scheduled"]);
  });
  it("shows a moved occurrence in its new calendar window", () => {
    const schedule: MeetingSchedule = { ...base, overrides: [{ occurrenceDate: "2026-10-08", date: "2026-10-20" }] };
    expect(occurrencesInRange(schedule, "2026-10-20", "2026-10-20").map((item) => item.occurrenceDate)).toEqual(["2026-10-08"]);
  });
  it("rejects malformed dates and missing expected attendees", () => {
    expect(validateMeetingSchedule({ ...base, date: "2026-02-31" })).toBe("Choose a valid date.");
    expect(validateMeetingSchedule({ ...base, attendees: [] })).toBe("Add at least one expected attendee.");
  });
});
