/**
 * Gemba → Red Tag Relationship Helper
 * 
 * PHASE 5A — Cross-module workflow
 * 
 * Creates Phase 4 relationship between Gemba observation and Red Tag.
 */

import { createRelationship } from "@/lib/relationships/relationship-store";

/**
 * Link a Gemba observation to a Red Tag
 * 
 * Creates a Phase 4 relationship after Red Tag creation.
 * Gracefully handles errors to avoid breaking the Red Tag creation flow.
 */
export function linkGembaObservationToRedTag(
  walkId: string,
  observationId: string,
  redTagId: string,
  title?: string
): void {
  try {
    createRelationship(
      {
        module: "gemba",
        recordId: walkId,
        childId: observationId,
      },
      {
        module: "redTag",
        recordId: redTagId,
      },
      "red-tag",
      {
        title: title || "Gemba observation",
      }
    );
  } catch (error) {
    // Log but don't throw - relationship failure should not break Red Tag creation
    console.error("Failed to create Gemba → Red Tag relationship:", error);
  }
}