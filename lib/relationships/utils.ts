/**
 * OPS Relationship Utilities
 * 
 * PHASE 4 — Helper functions for record identity and comparison
 */

import type { OpsRecordRef } from "./types";

/**
 * Compare two OpsRecordRefs for equality
 * 
 * CRITICAL:
 * - Must account for child IDs
 * - Labels are NOT part of identity
 * - Case-sensitive comparison
 * 
 * Examples:
 * 
 * gemba + walk-001 + obs-003 ≠ gemba + walk-001 + obs-004
 * gemba + walk-001 + obs-003 = gemba + walk-001 + obs-003 (even with different labels)
 */
export function areRecordRefsEqual(a: OpsRecordRef, b: OpsRecordRef): boolean {
  if (a.module !== b.module) return false;
  if (a.recordId !== b.recordId) return false;

  // Child ID comparison
  // Both undefined/null/empty = equal
  // One defined, one not = not equal
  // Both defined = must match exactly
  const aChild = a.childId || undefined;
  const bChild = b.childId || undefined;

  return aChild === bChild;
}

/**
 * Create a stable string key for a record reference
 * 
 * Useful for Map keys and React keys
 */
export function getRecordRefKey(ref: OpsRecordRef): string {
  if (ref.childId) {
    return `${ref.module}:${ref.recordId}:${ref.childId}`;
  }
  return `${ref.module}:${ref.recordId}`;
}

/**
 * Parse a record reference key back to OpsRecordRef
 * 
 * Returns null if invalid format
 */
export function parseRecordRefKey(key: string): OpsRecordRef | null {
  const parts = key.split(":");
  
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [module, recordId, childId] = parts;

  // Validate module
  const validModules = [
    "gemba",
    "redFlag",
    "redTag",
    "continuousImprovement",
    "audit",
    "action",
    "visualManagement",
    "visualImprovement",
  ];

  if (!validModules.includes(module)) {
    return null;
  }

  return {
    module: module as OpsRecordRef["module"],
    recordId,
    childId: childId || undefined,
  };
}