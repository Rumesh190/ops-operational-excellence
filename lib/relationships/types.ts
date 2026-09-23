/**
 * OPS Cross-Module Relationship Foundation
 * 
 * PHASE 4 — Lightweight relationship architecture for connecting
 * operational records across OPS modules.
 * 
 * This provides:
 * - Stable record references
 * - Bidirectional relationship tracking
 * - Route resolution
 * - No duplicate record storage
 * - No binary evidence storage
 */

/**
 * Canonical OPS module identifiers
 */
export type OpsModule =
  | "gemba"
  | "redFlag"
  | "redTag"
  | "continuousImprovement"
  | "audit"
  | "action"
  | "visualManagement"
  | "visualImprovement";

/**
 * Lightweight reference to any OPS record
 * 
 * CRITICAL:
 * - module + recordId must be stable
 * - childId supports sub-records (e.g., walk/observation, audit/finding)
 * - label is display metadata only, NOT identity
 * - routes are resolved separately, NOT stored
 */
export interface OpsRecordRef {
  module: OpsModule;
  recordId: string;
  childId?: string;
  label?: string;
}

/**
 * Relationship type vocabulary
 * 
 * Machine-readable stable identifiers
 */
export type OpsRelationshipType =
  | "created-from"   // Record was created from another record
  | "action"         // Links to an Action
  | "red-tag"        // Links to a Red Tag
  | "improvement"    // Links to a Continuous Improvement
  | "related";       // Generic relationship

/**
 * Canonical cross-module relationship
 * 
 * CRITICAL:
 * - Metadata only
 * - NO Base64 images
 * - NO data: URLs
 * - NO Blob URLs
 * - NO audio/binary content
 * - NO full record copies
 */
export interface OpsRelationship {
  id: string;
  from: OpsRecordRef;
  to: OpsRecordRef;
  relationshipType: OpsRelationshipType;
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean>; // Simple metadata only
}

/**
 * Relationship query result
 */
export interface RelationshipQueryResult {
  relationship: OpsRelationship;
  direction: "outgoing" | "incoming";
}

/**
 * Relationship store snapshot
 */
export interface RelationshipStoreSnapshot {
  relationships: OpsRelationship[];
  version: number;
}