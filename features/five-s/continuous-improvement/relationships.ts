import { createRelationship, getRelationshipsForRecord, removeRelationship } from "@/lib/relationships/relationship-store";
import type { OpsRecordRef, OpsRelationship } from "@/lib/relationships/types";
import { areRecordRefsEqual } from "@/lib/relationships/utils";

export const SUPPORTED_IMPROVEMENT_RELATIONSHIP_MODULES = ["gemba", "redTag", "audit"] as const;

export function getImprovementRef(improvementId: string): OpsRecordRef {
  return { module: "continuousImprovement", recordId: improvementId };
}

export function getOtherRelationshipRecord(relationship: OpsRelationship, current: OpsRecordRef) {
  return areRecordRefsEqual(relationship.from, current) ? relationship.to : relationship.from;
}

export function getImprovementOperationalRelationships(improvementId: string) {
  const current = getImprovementRef(improvementId);
  return getRelationshipsForRecord(current)
    .map(({ relationship }) => relationship)
    .filter((relationship) => SUPPORTED_IMPROVEMENT_RELATIONSHIP_MODULES.includes(getOtherRelationshipRecord(relationship, current).module as typeof SUPPORTED_IMPROVEMENT_RELATIONSHIP_MODULES[number]));
}

export function findImprovementOperationalRelationship(improvementId: string, target: OpsRecordRef) {
  const current = getImprovementRef(improvementId);
  return getImprovementOperationalRelationships(improvementId).find((relationship) => areRecordRefsEqual(getOtherRelationshipRecord(relationship, current), target));
}

/** Connects only after the canonical CI exists and treats either direction/type as the same operational connection. */
export function connectImprovementOperationalRecord(improvementId: string, target: OpsRecordRef) {
  const existing = findImprovementOperationalRelationship(improvementId, target);
  if (existing) return existing;
  return createRelationship(getImprovementRef(improvementId), target, "related");
}

/** Only manually-added, CI-outgoing generic links can be removed. Origin/provenance relationships remain protected. */
export function canRemoveImprovementOperationalRelationship(relationship: OpsRelationship, improvementId: string) {
  return relationship.relationshipType === "related" && areRecordRefsEqual(relationship.from, getImprovementRef(improvementId));
}

export function removeImprovementOperationalConnection(relationship: OpsRelationship, improvementId: string) {
  if (!canRemoveImprovementOperationalRelationship(relationship, improvementId)) return false;
  return removeRelationship(relationship.id);
}
