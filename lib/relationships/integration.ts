/**
 * OPS Relationship Integration
 * 
 * PHASE 4 — Safe integration hooks for existing module workflows
 * 
 * This file provides helper functions that existing stores can call
 * to create relationships after successful record linking.
 * 
 * CRITICAL:
 * - These are optional additions to existing workflows
 * - Failure does not corrupt the original workflow
 * - Legacy records without relationships continue working
 */

export { linkGembaObservationToAction, getGembaObservationRef, getGembaWalkRef } from "../gemba/gemba-relationships";