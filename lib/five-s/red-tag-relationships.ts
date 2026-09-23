/**
 * Red Tag → Action Relationship Integration
 * 
 * PHASE 4 — Augment existing Red Tag → Action workflow with relationship tracking
 * 
 * CRITICAL:
 * - Existing Red Tag behavior remains unchanged
 * - Relationships are ADDITIVE
 * - Relationship failure must NOT corrupt Action linkage
 * - Legacy tags without relationships continue working
 */

import type { OpsRecordRef } from "@/lib/relationships/types";
import { createRelationship } from "@/lib/relationships/relationship-store";

/**
 * Create a Red Tag → Action relationship
 * 
 * Call this AFTER the Action is successfully created and linked.
 * 
 * IMPORTANT:
 * - Only called when tag.actionId is confirmed set
 * - Failure does not affect existing Action linkage
 * - Safe to call multiple times (duplicate prevention inside)
 */
export function linkRedTagToAction(
  tagId: string,
  actionId: string,
  tagNumber?: string
): void {
  try {
    const from: OpsRecordRef = {
      module: "redTag",
      recordId: tagId,
      label: tagNumber || tagId,
    };

    const to: OpsRecordRef = {
      module: "action",
      recordId: actionId,
      label: actionId,
    };

    createRelationship(from, to, "action");
  } catch (error) {
    // Relationship creation failure must not break the workflow
    console.error("Failed to create Red Tag → Action relationship:", error);
  }
}

/**
 * Get Red Tag record reference
 */
export function getRedTagRef(tagId: string, tagNumber?: string): OpsRecordRef {
  return {
    module: "redTag",
    recordId: tagId,
    label: tagNumber || tagId,
  };
}