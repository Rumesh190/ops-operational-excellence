import { describe, expect, it } from "vitest";

import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";
import { GEMBA_SEED_STATE, getGembaSummary } from "@/features/gemba/gemba-store";
import { getActionSourceHref } from "@/lib/actions/action-config";

describe("Gemba MVP domain", () => {
  it("includes draft, active, and completed manufacturing walks", () => {
    expect(new Set(GEMBA_SEED_STATE.walks.map((walk) => walk.status))).toEqual(new Set(["Draft", "In Progress", "Completed"]));
    expect(new Set(GEMBA_SEED_STATE.observations.map((observation) => observation.type))).toEqual(new Set(["Positive", "Opportunity", "Issue"]));
  });

  it("summarizes observations without embedding action records", () => {
    const summary = getGembaSummary(GEMBA_SEED_STATE, new Date("2026-09-14T12:00:00+05:30"));
    expect(summary.walksThisMonth).toBe(4);
    expect(summary.completedWalks).toBe(2);
    expect(summary.actionsCreated).toBe(2);
    expect(GEMBA_SEED_STATE.walks.every((walk) => walk.actionIds.every((id) => typeof id === "string"))).toBe(true);
  });

  it("links Gemba actions back to the exact source observation", () => {
    const action = MY_ACTIONS.find((item) => item.id === "ACT-GEM-014-01");
    expect(action?.sourceModule).toBe("gemba");
    expect(action?.sourceObservationId).toBe("GEM-2026-014-OBS-01");
    expect(action && getActionSourceHref(action)).toBe("/gemba/GEM-2026-014?tab=observations#GEM-2026-014-OBS-01");
  });
});
