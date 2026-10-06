import type { RedTag } from "@/features/five-s/red-tag/types";
import type { MyAction, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { getActionSourceRecordLabel, inferActionSourceModule } from "./action-config";

export interface ResolvedActionSourceEvidence {
  evidence: MyActionEvidence[];
  state: "available" | "not-captured" | "unavailable";
  provenance: string;
  description: string;
  readOnly: true;
}

/**
 * Canonical source-owned Before evidence resolver used by both Action execution
 * and Action reporting. It returns presentation references and never persists or
 * copies evidence into the Action record.
 */
export function resolveActionSourceBeforeEvidence(action: MyAction, redTags: RedTag[]): ResolvedActionSourceEvidence {
  if (action.issueEvidence?.length) return {
    evidence: action.issueEvidence,
    state: "available",
    provenance: "Action issue evidence",
    description: "Original condition captured when this action was created.",
    readOnly: true,
  };

  if (inferActionSourceModule(action) !== "redTag") return {
    evidence: [],
    state: "not-captured",
    provenance: "Source record",
    description: "Original condition captured by the source record.",
    readOnly: true,
  };

  const sourceId = action.sourceId ?? action.sourceTitle;
  const source = redTags.find((tag) => tag.id === sourceId || tag.tagNumber === sourceId);
  const sourceLabel = source ? `Red Tag · ${source.tagNumber}` : `Red Tag · ${getActionSourceRecordLabel(action)}`;

  if (!source) return {
    evidence: [], state: "unavailable", provenance: sourceLabel,
    description: `Source: ${sourceLabel}`, readOnly: true,
  };
  if (!source.imageUrl?.trim()) return {
    evidence: [], state: "not-captured", provenance: sourceLabel,
    description: `Source: ${sourceLabel}`, readOnly: true,
  };

  return {
    evidence: [{
      id: `SOURCE-${source.id}-BEFORE`,
      name: "Red Tag identification photo",
      type: "image",
      evidenceType: "finding",
      uploadedAt: source.createdAt,
      uploadedBy: source.createdByName,
      url: source.imageUrl,
    }],
    state: "available",
    provenance: sourceLabel,
    description: `Source: ${sourceLabel}`,
    readOnly: true,
  };
}

export function actionEvidenceEmptyText(state: ResolvedActionSourceEvidence["state"]) {
  return state === "unavailable" ? "Evidence unavailable" : "No evidence captured";
}
