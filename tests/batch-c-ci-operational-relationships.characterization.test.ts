import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  canRemoveImprovementOperationalRelationship,
  connectImprovementOperationalRecord,
  findImprovementOperationalRelationship,
  getImprovementOperationalRelationships,
  getImprovementRef,
  getOtherRelationshipRecord,
  removeImprovementOperationalConnection,
} from "@/features/five-s/continuous-improvement/relationships";
import { createRelationship, getRelationshipsForRecord, removeRelationship } from "@/lib/relationships/relationship-store";
import { resolveRecordRoute } from "@/lib/relationships/route-resolver";
import type { OpsRecordRef } from "@/lib/relationships/types";

const ciId = "CI-BATCH-C-TEST";
const gemba: OpsRecordRef = { module: "gemba", recordId: "GEM-BATCH-C", childId: "OBS-BATCH-C" };
const redTag: OpsRecordRef = { module: "redTag", recordId: "RT-BATCH-C" };
const audit: OpsRecordRef = { module: "audit", recordId: "AUD-BATCH-C" };

function cleanup() {
  for (const { relationship } of getRelationshipsForRecord(getImprovementRef(ciId))) removeRelationship(relationship.id);
}

describe("Batch C Continual Improvement operational relationships", () => {
  it("uses canonical stable refs and bidirectional Phase 4 lookup", () => {
    cleanup();
    const relationship = connectImprovementOperationalRecord(ciId, gemba);
    expect(relationship?.relationshipType).toBe("related");
    expect(getRelationshipsForRecord(gemba).some(({ relationship: item }) => item.id === relationship?.id)).toBe(true);
    expect(getOtherRelationshipRecord(relationship!, getImprovementRef(ciId))).toEqual(gemba);
    cleanup();
  });

  it("connects Gemba observations, Red Tags, and Audits without duplicate rows", () => {
    cleanup();
    const first = connectImprovementOperationalRecord(ciId, gemba);
    const duplicate = connectImprovementOperationalRecord(ciId, gemba);
    connectImprovementOperationalRecord(ciId, redTag);
    connectImprovementOperationalRecord(ciId, audit);
    expect(first?.id).toBe(duplicate?.id);
    expect(getImprovementOperationalRelationships(ciId)).toHaveLength(3);
    expect(findImprovementOperationalRelationship(ciId, audit)).toBeTruthy();
    cleanup();
  });

  it("recognizes an existing reverse Gemba origin and protects its provenance", () => {
    cleanup();
    const origin = createRelationship(gemba, getImprovementRef(ciId), "improvement");
    const connected = connectImprovementOperationalRecord(ciId, gemba);
    expect(connected?.id).toBe(origin?.id);
    expect(getImprovementOperationalRelationships(ciId)).toHaveLength(1);
    expect(canRemoveImprovementOperationalRelationship(origin!, ciId)).toBe(false);
    expect(removeImprovementOperationalConnection(origin!, ciId)).toBe(false);
    cleanup();
  });

  it("removes only an optional relationship and leaves both record identities intact", () => {
    cleanup();
    const relationship = connectImprovementOperationalRecord(ciId, redTag)!;
    expect(canRemoveImprovementOperationalRelationship(relationship, ciId)).toBe(true);
    expect(removeImprovementOperationalConnection(relationship, ciId)).toBe(true);
    expect(getImprovementOperationalRelationships(ciId)).toHaveLength(0);
    expect(getImprovementRef(ciId)).toEqual({ module: "continuousImprovement", recordId: ciId });
    expect(redTag).toEqual({ module: "redTag", recordId: "RT-BATCH-C" });
  });

  it("uses canonical routes, including safe Audit parent navigation", () => {
    expect(resolveRecordRoute(gemba)).toBe("/gemba/GEM-BATCH-C?tab=observations#OBS-BATCH-C");
    expect(resolveRecordRoute(redTag)).toBe("/5s/red/RT-BATCH-C");
    expect(resolveRecordRoute(audit)).toBe("/audits?audit=AUD-BATCH-C");
  });

  it("keeps relationship state out of the canonical CI record model", () => {
    const types = readFileSync("features/five-s/continuous-improvement/types.ts", "utf8");
    expect(types).not.toContain("gembaIds");
    expect(types).not.toContain("redTagIds");
    expect(types).not.toContain("auditIds");
  });

  it("creates connections only after CI creation and isolates optional failures", () => {
    const page = readFileSync("features/five-s/continuous-improvement/new-page.tsx", "utf8");
    expect(page.indexOf("createImprovement({")).toBeLessThan(page.indexOf("connectImprovementOperationalRecord(item.id"));
    expect(page).toContain("try { connectImprovementOperationalRecord(item.id, record); }");
    expect(page).toContain("router.push(`/continuous-improvement/");
  });

  it("renders picker, search, accessible module selection, missing-record fallback, and removal language", () => {
    const component = readFileSync("features/five-s/continuous-improvement/related-operational-records.tsx", "utf8");
    expect(component).toContain("Related Operational Records");
    expect(component).toContain("Connect Record");
    expect(component).toContain("Search");
    expect(component).toContain("aria-pressed={module === value}");
    expect(component).toContain("Linked record unavailable");
    expect(component).toContain("Remove connection to");
    expect(component).toContain("max-w-2xl");
  });

  it("keeps owner, completion, lifecycle, and Batch B status predicates untouched", () => {
    const relationshipSource = readFileSync("features/five-s/continuous-improvement/relationships.ts", "utf8");
    for (const forbidden of ["ownerId", "completedAt", "estimatedTime", "createAction", "updateImprovementProposal", "status:"]) expect(relationshipSource).not.toContain(forbidden);
    const landing = readFileSync("features/five-s/continuous-improvement/landing-page.tsx", "utf8");
    expect(landing).toContain('quickFilter: "proposal"');
    expect(landing).toContain('quickFilter: "under-review"');
    expect(landing).toContain('quickFilter: "in-progress"');
  });

  it("shows operational traceability on detail, edit, create, and report surfaces", () => {
    for (const file of ["new-page.tsx", "edit-page.tsx", "detail-page.tsx", "report-page.tsx"]) {
      expect(readFileSync(`features/five-s/continuous-improvement/${file}`, "utf8")).toContain("RelatedOperationalRecords");
    }
  });
});
