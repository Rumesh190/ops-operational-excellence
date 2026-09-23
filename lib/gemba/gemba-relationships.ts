/**
 * Gemba → Continuous Improvement Relationship Helper
 * 
 * PHASE 5B — Cross-module workflow
 * 
 * Creates Phase 4 relationship between Gemba observation and Continuous Improvement.
 */

import { createRelationship } from "@/lib/relationships/relationship-store";

/**
 * Link a Gemba observation to a Continuous Improvement
 * 
 * Creates a Phase 4 relationship after CI creation.
 * Gracefully handles errors to avoid breaking the CI creation flow.
 */
export function linkGembaObservationToImprovement(
  walkId: string,
  observationId: string,
  improvementId: string,
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
        module: "continuousImprovement",
        recordId: improvementId,
      },
      "improvement",
      {
        title: title || "Gemba observation",
      }
    );
  } catch (error) {
    // Log but don't throw - relationship failure should not break CI creation
    console.error("Failed to create Gemba → Continuous Improvement relationship:", error);
  }
}