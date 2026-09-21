import { beforeEach, describe, expect, it } from "vitest";

import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";
import type { MyAction } from "@/features/five-s/types/my-actions";
import {
  acknowledgeActionEscalation,
  evaluateActionAttention,
  getActionAttentionMetrics,
  resetActionAttentionState,
} from "@/lib/actions/action-attention-store";
import { setActions } from "@/lib/actions/action-store";

const now = new Date(2026, 8, 15, 10, 0, 0);

function action(id: string, dueDate: string): MyAction {
  return {
    id,
    title: `Action ${id}`,
    description: "Correct the condition",
    source: "5S Audit",
    sourceTitle: "AUD-TEST",
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone B",
    assignedTo: "Siva Kumar",
    responsiblePersonId: "USR-SIVA-KUMAR",
    responsiblePersonName: "Siva Kumar",
    zoneLeaderId: "USR-RUMESH",
    zoneLeaderName: "Rumesh",
    reviewerId: "USR-LAKSHMAN",
    reviewerName: "Lakshman",
    createdByUserId: "USR-LAKSHMAN",
    createdByName: "Lakshman",
    auditor: "Lakshman",
    status: "In Progress",
    priority: "High",
    dueDate,
    createdAt: "2026-09-10T09:00:00+05:30",
    evidence: [],
  };
}

describe("Action reminders and escalations", () => {
  beforeEach(() => resetActionAttentionState());

  it("generates each configured reminder/escalation threshold without duplicates", () => {
    const actions = [
      action("DUE-SOON", "2026-09-16"),
      action("DUE-TODAY", "2026-09-15"),
      action("OVERDUE-ONE", "2026-09-14"),
      action("OVERDUE-TWO", "2026-09-13"),
      action("OVERDUE-FOUR", "2026-09-11"),
    ];
    setActions(actions);
    const first = evaluateActionAttention(actions, ADMIN_USER_SEEDS, now);

    expect(first.reminders).toEqual(expect.arrayContaining([
      expect.objectContaining({ actionId: "DUE-SOON", type: "Due Soon" }),
      expect.objectContaining({ actionId: "DUE-TODAY", type: "Due Today" }),
      expect.objectContaining({ actionId: "OVERDUE-ONE", type: "Overdue" }),
      expect.objectContaining({ actionId: "OVERDUE-TWO", type: "Repeated Overdue" }),
    ]));
    expect(first.escalations).toEqual(expect.arrayContaining([
      expect.objectContaining({ actionId: "OVERDUE-TWO", level: 1, toUserId: "USR-RUMESH" }),
      expect.objectContaining({ actionId: "OVERDUE-FOUR", level: 2, toUserId: "USR-LAKSHMAN" }),
    ]));

    const second = evaluateActionAttention(actions, ADMIN_USER_SEEDS, now);
    expect(second.reminders).toHaveLength(first.reminders.length);
    expect(second.escalations).toHaveLength(first.escalations.length);
  });

  it("allows only the escalation recipient to acknowledge and exposes analytics selectors", () => {
    const overdue = action("OVERDUE", "2026-09-11");
    setActions([overdue]);
    const result = evaluateActionAttention([overdue], ADMIN_USER_SEEDS, now);
    const levelTwo = result.escalations.find((item) => item.level === 2)!;
    expect(acknowledgeActionEscalation(levelTwo.id, { id: "USR-RUMESH", name: "Rumesh" })).toBeUndefined();
    expect(acknowledgeActionEscalation(levelTwo.id, { id: "USR-LAKSHMAN", name: "Lakshman" })?.status).toBe("Acknowledged");
    expect(getActionAttentionMetrics([action("SOON", "2026-09-16"), overdue], now)).toMatchObject({ dueSoon: 1, overdue: 1, escalated: 1, averageOverdueAge: 4 });
  });
});
