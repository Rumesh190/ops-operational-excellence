"use client";

/**
 * OPS Linked Records Component
 * 
 * PHASE 4 — Lightweight UI for displaying cross-module relationships
 * 
 * CRITICAL:
 * - Display connectivity only
 * - No module workflow logic
 * - Graceful degradation for missing records
 * - No unnecessary nested cards
 * - Enterprise SaaS appearance
 */

import React from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OpsRecordRef, OpsRelationship } from "@/lib/relationships/types";
import {
  resolveRecordRoute,
  getRecordRefLabel,
  getModuleDisplayName,
} from "@/lib/relationships/route-resolver";

interface LinkedRecordsProps {
  /** Relationships to display */
  relationships: OpsRelationship[];
  
  /** Current record (to determine direction) */
  currentRecord?: OpsRecordRef;
  
  /** Optional custom status resolver */
  getRecordStatus?: (ref: OpsRecordRef) => string | null;
  
  /** Compact mode (smaller spacing) */
  compact?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Display linked operational records
 */
export function LinkedRecords({
  relationships,
  currentRecord,
  getRecordStatus,
  compact = false,
  className,
}: LinkedRecordsProps) {
  if (relationships.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">
        Linked Records
      </h3>
      <div className="space-y-2">
        {relationships.map((rel) => (
          <LinkedRecordItem
            key={rel.id}
            relationship={rel}
            currentRecord={currentRecord}
            getRecordStatus={getRecordStatus}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface LinkedRecordItemProps {
  relationship: OpsRelationship;
  currentRecord?: OpsRecordRef;
  getRecordStatus?: (ref: OpsRecordRef) => string | null;
  compact?: boolean;
}

function LinkedRecordItem({
  relationship,
  currentRecord,
  getRecordStatus,
  compact = false,
}: LinkedRecordItemProps) {
  // Determine which record to display
  const isOutgoing = currentRecord
    ? relationship.from.module === currentRecord.module &&
      relationship.from.recordId === currentRecord.recordId &&
      relationship.from.childId === currentRecord.childId
    : true;

  const displayRecord = isOutgoing ? relationship.to : relationship.from;
  const route = resolveRecordRoute(displayRecord);
  const label = getRecordRefLabel(displayRecord);
  const moduleLabel = getModuleDisplayName(displayRecord.module);
  const status = getRecordStatus?.(displayRecord);

  // Graceful degradation for missing routes
  if (!route) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
          compact && "px-2 py-1.5 text-xs"
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {moduleLabel} · {label}
        </span>
        <Badge variant="secondary" size="sm">
          No route
        </Badge>
      </div>
    );
  }

  return (
    <Link
      href={route}
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact && "gap-2 px-2.5 py-2"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {moduleLabel}
          </span>
          {isOutgoing && (
            <ArrowRight className={cn("text-muted-foreground", compact ? "size-3" : "size-3.5")} />
          )}
        </div>
        <div className={cn("mt-0.5 flex items-center gap-2", compact && "mt-0")}>
          <span
            className={cn(
              "truncate font-mono text-muted-foreground",
              compact ? "text-[10px]" : "text-xs"
            )}
            title={label}
          >
            {label}
          </span>
          {status && (
            <Badge
              variant="secondary"
              size="sm"
              className={cn(compact && "text-[10px] px-1.5 py-0")}
            >
              {status}
            </Badge>
          )}
        </div>
      </div>
      <ExternalLink
        className={cn(
          "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
          compact ? "size-3.5" : "size-4"
        )}
      />
    </Link>
  );
}

/**
 * Simpler inline variant for displaying a single linked record
 */
export function InlineLinkedRecord({
  record,
  status,
  compact = false,
}: {
  record: OpsRecordRef;
  status?: string;
  compact?: boolean;
}) {
  const route = resolveRecordRoute(record);
  const label = getRecordRefLabel(record);
  const moduleLabel = getModuleDisplayName(record.module);

  if (!route) {
    return (
      <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        {moduleLabel} · {label}
      </span>
    );
  }

  return (
    <Link
      href={route}
      className={cn(
        "inline-flex items-center gap-1.5 text-primary hover:underline",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <span className="font-medium">{moduleLabel}</span>
      <span className="font-mono">{label}</span>
      {status && (
        <Badge variant="secondary" size="sm" className={cn(compact && "text-[10px]")}>
          {status}
        </Badge>
      )}
    </Link>
  );
}