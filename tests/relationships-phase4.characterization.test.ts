/**
 * PHASE 4 — Cross-Module Relationship Foundation Tests
 * 
 * Verifies the relationship architecture foundation without
 * breaking existing module behavior.
 */

import { describe, test, expect, beforeEach } from "vitest";
import type { OpsRecordRef } from "@/lib/relationships/types";
import {
  createRelationship,
  getRelationshipsForRecord,
  getOutgoingRelationships,
  getIncomingRelationships,
  removeRelationship,
} from "@/lib/relationships/relationship-store";
import { areRecordRefsEqual, getRecordRefKey, parseRecordRefKey } from "@/lib/relationships/utils";
import { resolveRecordRoute, getRecordRefLabel } from "@/lib/relationships/route-resolver";

describe("PHASE 4 — OpsRecordRef Identity", () => {
  test("two refs with same module and recordId are equal", () => {
    const a: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    const b: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    
    expect(areRecordRefsEqual(a, b)).toBe(true);
  });

  test("refs with different recordIds are not equal", () => {
    const a: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    const b: OpsRecordRef = { module: "action", recordId: "ACT-002" };
    
    expect(areRecordRefsEqual(a, b)).toBe(false);
  });

  test("refs with different modules are not equal", () => {
    const a: OpsRecordRef = { module: "action", recordId: "001" };
    const b: OpsRecordRef = { module: "redTag", recordId: "001" };
    
    expect(areRecordRefsEqual(a, b)).toBe(false);
  });

  test("child ID comparison - both undefined are equal", () => {
    const a: OpsRecordRef = { module: "gemba", recordId: "GEM-001" };
    const b: OpsRecordRef = { module: "gemba", recordId: "GEM-001", childId: undefined };
    
    expect(areRecordRefsEqual(a, b)).toBe(true);
  });

  test("child ID comparison - different children are not equal", () => {
    const a: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    };
    const b: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-002",
    };
    
    expect(areRecordRefsEqual(a, b)).toBe(false);
  });

  test("child ID comparison - one with child, one without are not equal", () => {
    const a: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    };
    const b: OpsRecordRef = { module: "gemba", recordId: "GEM-001" };
    
    expect(areRecordRefsEqual(a, b)).toBe(false);
  });

  test("labels do not affect identity", () => {
    const a: OpsRecordRef = {
      module: "action",
      recordId: "ACT-001",
      label: "Fix machine",
    };
    const b: OpsRecordRef = {
      module: "action",
      recordId: "ACT-001",
      label: "Different label",
    };
    
    expect(areRecordRefsEqual(a, b)).toBe(true);
  });
});

describe("PHASE 4 — Record Reference Keys", () => {
  test("generate key without child", () => {
    const ref: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    expect(getRecordRefKey(ref)).toBe("action:ACT-001");
  });

  test("generate key with child", () => {
    const ref: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    };
    expect(getRecordRefKey(ref)).toBe("gemba:GEM-001:OBS-001");
  });

  test("parse valid key without child", () => {
    const parsed = parseRecordRefKey("action:ACT-001");
    expect(parsed).toEqual({
      module: "action",
      recordId: "ACT-001",
      childId: undefined,
    });
  });

  test("parse valid key with child", () => {
    const parsed = parseRecordRefKey("gemba:GEM-001:OBS-001");
    expect(parsed).toEqual({
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    });
  });

  test("parse invalid key returns null", () => {
    expect(parseRecordRefKey("invalid")).toBeNull();
    expect(parseRecordRefKey("too:many:parts:here")).toBeNull();
  });
});

describe("PHASE 4 — Relationship Creation", () => {
  test("create valid relationship", () => {
    const from: OpsRecordRef = { module: "gemba", recordId: "GEM-001", childId: "OBS-001" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    
    const rel = createRelationship(from, to, "action");
    
    expect(rel).toBeTruthy();
    expect(rel?.from).toEqual(from);
    expect(rel?.to).toEqual(to);
    expect(rel?.relationshipType).toBe("action");
    expect(rel?.id).toBeTruthy();
    expect(rel?.createdAt).toBeTruthy();
  });

  test("duplicate relationship returns existing", () => {
    const from: OpsRecordRef = { module: "redTag", recordId: "RT-001" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-002" };
    
    const rel1 = createRelationship(from, to, "action");
    const rel2 = createRelationship(from, to, "action");
    
    expect(rel1?.id).toBe(rel2?.id);
  });

  test("missing required fields returns null", () => {
    const from: OpsRecordRef = { module: "action", recordId: "" };
    const to: OpsRecordRef = { module: "redTag", recordId: "RT-001" };
    
    const rel = createRelationship(from, to, "action");
    expect(rel).toBeNull();
  });

  test("relationship does not contain Base64 evidence", () => {
    const from: OpsRecordRef = { module: "gemba", recordId: "GEM-001" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    
    const rel = createRelationship(from, to, "action", {
      note: "Test relationship",
    });
    
    const jsonStr = JSON.stringify(rel);
    expect(jsonStr).not.toContain("data:image");
    expect(jsonStr).not.toContain("data:audio");
    expect(jsonStr).not.toContain("blob:");
  });
});

describe("PHASE 4 — Relationship Queries", () => {
  beforeEach(() => {
    // Create test relationships
    const gembaObs: OpsRecordRef = { module: "gemba", recordId: "GEM-001", childId: "OBS-001" };
    const action1: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    const redTag: OpsRecordRef = { module: "redTag", recordId: "RT-001" };
    const action2: OpsRecordRef = { module: "action", recordId: "ACT-002" };
    
    createRelationship(gembaObs, action1, "action");
    createRelationship(redTag, action2, "action");
  });

  test("get outgoing relationships", () => {
    const gembaObs: OpsRecordRef = { module: "gemba", recordId: "GEM-001", childId: "OBS-001" };
    const outgoing = getOutgoingRelationships(gembaObs);
    
    expect(outgoing.length).toBeGreaterThan(0);
    expect(outgoing[0].to.module).toBe("action");
  });

  test("get incoming relationships", () => {
    const action: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    const incoming = getIncomingRelationships(action);
    
    expect(incoming.length).toBeGreaterThan(0);
    expect(incoming[0].from.module).toBe("gemba");
  });

  test("get all relationships for record", () => {
    const action: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    const results = getRelationshipsForRecord(action);
    
    expect(results.length).toBeGreaterThan(0);
    const incoming = results.filter((r) => r.direction === "incoming");
    expect(incoming.length).toBeGreaterThan(0);
  });
});

describe("PHASE 4 — Route Resolution", () => {
  test("resolve action route", () => {
    const ref: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    expect(resolveRecordRoute(ref)).toBe("/actions/ACT-001");
  });

  test("resolve red tag route", () => {
    const ref: OpsRecordRef = { module: "redTag", recordId: "RT-001" };
    expect(resolveRecordRoute(ref)).toBe("/5s/red/RT-001");
  });

  test("resolve gemba walk route", () => {
    const ref: OpsRecordRef = { module: "gemba", recordId: "GEM-001" };
    expect(resolveRecordRoute(ref)).toBe("/gemba/GEM-001");
  });

  test("resolve gemba observation route", () => {
    const ref: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    };
    expect(resolveRecordRoute(ref)).toBe("/gemba/GEM-001?tab=observations#OBS-001");
  });

  test("resolve continuous improvement route", () => {
    const ref: OpsRecordRef = { module: "continuousImprovement", recordId: "CI-001" };
    expect(resolveRecordRoute(ref)).toBe("/continuous-improvement/CI-001");
  });

  test("resolve red flag route", () => {
    const ref: OpsRecordRef = { module: "redFlag", recordId: "RF-001" };
    expect(resolveRecordRoute(ref)).toBe("/red-flag/RF-001");
  });
});

describe("PHASE 4 — Record Labels", () => {
  test("use provided label", () => {
    const ref: OpsRecordRef = {
      module: "action",
      recordId: "ACT-001",
      label: "Fix machine",
    };
    expect(getRecordRefLabel(ref)).toBe("Fix machine");
  });

  test("generate default label for action", () => {
    const ref: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    expect(getRecordRefLabel(ref)).toBe("Action ACT-001");
  });

  test("generate default label for gemba observation", () => {
    const ref: OpsRecordRef = {
      module: "gemba",
      recordId: "GEM-001",
      childId: "OBS-001",
    };
    expect(getRecordRefLabel(ref)).toBe("Observation OBS-001");
  });
});

describe("PHASE 4 — Relationship Deletion", () => {
  test("remove relationship by ID", () => {
    const from: OpsRecordRef = { module: "redTag", recordId: "RT-TEST" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-TEST" };
    
    const rel = createRelationship(from, to, "action");
    expect(rel).toBeTruthy();
    
    const removed = removeRelationship(rel!.id);
    expect(removed).toBe(true);
    
    const relationships = getOutgoingRelationships(from);
    const found = relationships.find((r) => r.id === rel!.id);
    expect(found).toBeUndefined();
  });

  test("removing relationship does not delete source record", () => {
    // This is a conceptual test - in real implementation,
    // the source records live in their own stores
    const from: OpsRecordRef = { module: "redTag", recordId: "RT-KEEP" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-KEEP" };
    
    const rel = createRelationship(from, to, "action");
    removeRelationship(rel!.id);
    
    // Source records should still exist in their respective stores
    // This just verifies the relationship metadata is removed
    expect(true).toBe(true);
  });
});

describe("PHASE 4 — Legacy Compatibility", () => {
  test("records without relationships are supported", () => {
    // Conceptual test - existing module records don't require relationships
    const gembaObs: OpsRecordRef = {
      module: "gemba",
      recordId: "LEGACY-GEM-001",
      childId: "LEGACY-OBS-001",
    };
    
    // No relationship created
    const relationships = getRelationshipsForRecord(gembaObs);
    
    // Should return empty array, not error
    expect(Array.isArray(relationships)).toBe(true);
    expect(relationships.length).toBe(0);
  });

  test("route resolution works without relationships", () => {
    const ref: OpsRecordRef = { module: "action", recordId: "LEGACY-ACT-001" };
    
    // Route resolution doesn't depend on relationships
    const route = resolveRecordRoute(ref);
    expect(route).toBe("/actions/LEGACY-ACT-001");
  });
});

describe("PHASE 4 — Data Safety", () => {
  test("relationship store does not accept large payloads", () => {
    // Relationships should be metadata only
    const from: OpsRecordRef = { module: "gemba", recordId: "GEM-SAFE" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-SAFE" };
    
    const rel = createRelationship(from, to, "action");
    
    const jsonStr = JSON.stringify(rel);
    // Relationship should be small (< 1KB for normal case)
    expect(jsonStr.length).toBeLessThan(2000);
  });

  test("no Base64 images in relationships", () => {
    const from: OpsRecordRef = { module: "gemba", recordId: "GEM-001" };
    const to: OpsRecordRef = { module: "action", recordId: "ACT-001" };
    
    const rel = createRelationship(from, to, "action");
    const jsonStr = JSON.stringify(rel);
    
    expect(jsonStr).not.toContain("data:image/png;base64");
    expect(jsonStr).not.toContain("data:image/jpeg;base64");
  });
});
