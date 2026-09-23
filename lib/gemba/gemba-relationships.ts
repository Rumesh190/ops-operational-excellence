/**
 * Gemba → Action Relationship Integration
 * 
 * PHASE 4 — Augment existing Gemba → Action workflow with relationship tracking
 * 
 * CRITICAL:
 * - Existing Gemba behavior remains unchanged
 * - Relationships are ADDITIVE
 * - Relationship failure must NOT corrupt Action creation
 * - Legacy observations without relationships continue working
 */

import type { OpsRecordRef } from "@/lib/relationships/types";
import { createRelationship } from "@/lib/relationships/relationship-store";

/**
 * Create a Gemba observation → Action relationship
 * 
 * Call this AFTER the Action is successfully created and linked.
 * 
 * IMPORTANT:
 * - Only called when observation.actionId is confirmed set
 * - Failure does not affect existing Action linkage
 * - Safe to call multiple times (duplicate prevention inside)
 */
export function linkGembaObservationToAction(
  walkId: string,
  observationId: string,
  actionId: string,
  observationTitle?: string
): void {
  try {
    const from: OpsRecordRef = {
      module: "gemba",
      recordId: walkId,
      childId: observationId,
      label: observationTitle || observationId,
    };

    const to: OpsRecordRef = {
      module: "action",
      recordId: actionId,
      label: actionId,
    };

    createRelationship(from, to, "action");
  } catch (error) {
    // Relationship creation failure must not break the workflow
    console.error("Failed to create Gemba → Action relationship:", error);
  }
}

/**
 * Get Gemba observation record reference
 */
export function getGembaObservationRef(
  walkId: string,
  observationId: string,
  title?: string
): OpsRecordRef {
  return {
    module: "gemba",
    recordId: walkId,
    childId: observationId,
    label: title || observationId,
  };
}

/**
 * Get Gemba walk record reference
 */
export function getGembaWalkRef(walkId: string, purpose?: string): OpsRecordRef {
  return {
    module: "gemba",
    recordId: walkId,
    label: purpose || walkId,
  };
}