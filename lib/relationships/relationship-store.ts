/**
 * OPS Relationship Store
 * 
 * PHASE 4 — Canonical store for cross-module relationships
 * 
 * CRITICAL RULES:
 * - Metadata only
 * - NO Base64/binary content
 * - NO duplicate record storage
 * - Additive to existing module behavior
 * - Must not corrupt existing workflows on failure
 */

import React from "react";
import { getStorageKey, loadFromStorage, safeSetStorage } from "../browser-storage";
import type {
  OpsRelationship,
  OpsRecordRef,
  OpsRelationshipType,
  RelationshipQueryResult,
  RelationshipStoreSnapshot,
} from "./types";
import { areRecordRefsEqual } from "./utils";

const STORAGE_KEY = "ops_relationships_v1";
const STORAGE_VERSION = 1;

/**
 * In-memory relationship store
 */
let relationships: OpsRelationship[] = [];
const listeners: Set<() => void> = new Set();
let hasInitialized = false;

/**
 * Generate stable relationship ID
 */
function generateRelationshipId(): string {
  return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notify subscribers of changes
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Load relationships from localStorage
 */
function loadRelationships(): void {
  try {
    const stored = loadFromStorage<RelationshipStoreSnapshot>(
      getStorageKey(STORAGE_KEY)
    );

    if (stored && Array.isArray(stored.relationships)) {
      // Validate and sanitize stored relationships
      relationships = stored.relationships.filter((rel) => {
        // Basic validation
        if (!rel.id || !rel.from || !rel.to || !rel.relationshipType) {
          console.warn("Invalid relationship found, skipping:", rel);
          return false;
        }

        // Check for forbidden content (Base64, data URLs, etc.)
        const jsonStr = JSON.stringify(rel);
        if (
          jsonStr.includes("data:image") ||
          jsonStr.includes("data:audio") ||
          jsonStr.includes("blob:") ||
          (jsonStr.length > 50000) // Suspiciously large
        ) {
          console.warn("Relationship contains forbidden content, skipping:", rel.id);
          return false;
        }

        return true;
      });
    }
  } catch (error) {
    console.error("Failed to load relationships:", error);
    relationships = [];
  }
}

/**
 * Persist relationships to localStorage
 */
function persistRelationships(): void {
  try {
    const snapshot: RelationshipStoreSnapshot = {
      relationships,
      version: STORAGE_VERSION,
    };
    safeSetStorage(getStorageKey(STORAGE_KEY), snapshot);
  } catch (error) {
    console.error("Failed to persist relationships:", error);
  }
}

/**
 * Initialize store (load from localStorage)
 */
function initializeStore(): void {
  if (typeof window === "undefined") return;
  if (hasInitialized) return;
  
  hasInitialized = true;
  loadRelationships();
}

/**
 * Subscribe to relationship changes
 */
function subscribe(listener: () => void): () => void {
  initializeStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get current snapshot
 */
function getSnapshot(): OpsRelationship[] {
  initializeStore();
  return relationships;
}

/**
 * Create a new relationship
 * 
 * IMPORTANT: Only call this AFTER the underlying records are successfully created.
 * Never create a relationship pointing to a failed/non-existent record.
 */
export function createRelationship(
  from: OpsRecordRef,
  to: OpsRecordRef,
  relationshipType: OpsRelationshipType,
  metadata?: Record<string, string | number | boolean>
): OpsRelationship | null {
  initializeStore();

  // Validate inputs
  if (!from.module || !from.recordId || !to.module || !to.recordId) {
    console.error("Invalid relationship: missing required fields", { from, to });
    return null;
  }

  // Check for duplicates
  const duplicate = relationships.find(
    (rel) =>
      areRecordRefsEqual(rel.from, from) &&
      areRecordRefsEqual(rel.to, to) &&
      rel.relationshipType === relationshipType
  );

  if (duplicate) {
    console.warn("Duplicate relationship already exists:", duplicate.id);
    return duplicate;
  }

  // Create new relationship
  const relationship: OpsRelationship = {
    id: generateRelationshipId(),
    from,
    to,
    relationshipType,
    createdAt: new Date().toISOString(),
    metadata,
  };

  relationships = [...relationships, relationship];
  persistRelationships();
  notifyListeners();

  return relationship;
}

/**
 * Get all relationships for a specific record
 */
export function getRelationshipsForRecord(
  record: OpsRecordRef
): RelationshipQueryResult[] {
  initializeStore();

  const results: RelationshipQueryResult[] = [];

  for (const rel of relationships) {
    if (areRecordRefsEqual(rel.from, record)) {
      results.push({ relationship: rel, direction: "outgoing" });
    } else if (areRecordRefsEqual(rel.to, record)) {
      results.push({ relationship: rel, direction: "incoming" });
    }
  }

  return results;
}

/**
 * Get outgoing relationships from a record
 */
export function getOutgoingRelationships(record: OpsRecordRef): OpsRelationship[] {
  initializeStore();

  return relationships.filter((rel) => areRecordRefsEqual(rel.from, record));
}

/**
 * Get incoming relationships to a record
 */
export function getIncomingRelationships(record: OpsRecordRef): OpsRelationship[] {
  initializeStore();

  return relationships.filter((rel) => areRecordRefsEqual(rel.to, record));
}

/**
 * Remove a relationship by ID
 * 
 * CRITICAL: This does NOT delete the underlying records.
 * Only the relationship metadata is removed.
 */
export function removeRelationship(relationshipId: string): boolean {
  initializeStore();

  const before = relationships.length;
  relationships = relationships.filter((rel) => rel.id !== relationshipId);

  if (relationships.length < before) {
    persistRelationships();
    notifyListeners();
    return true;
  }

  return false;
}

/**
 * React hook for subscribing to relationships
 * 
 * Uses useSyncExternalStore for proper React 18 compatibility
 */
export function useRelationships(): OpsRelationship[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => []);
}
