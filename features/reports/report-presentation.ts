import type { MyAction } from "@/features/five-s/types/my-actions";
import { inferActionSourceModule } from "@/lib/actions/action-config";

const ACTION_REPORT_TITLES = {
  redTag: "Red Tag Action Report",
  gemba: "Gemba Action Report",
  audit: "Audit Action Report",
  continuousImprovement: "Continual Improvement Action Report",
  visualManagement: "Visual Management Action Report",
  manual: "Action Completion Report",
  visualImprovement: "Legacy Improvement Action Report",
  redFlag: "Historical Red Flag Action Report",
} as const;

export function getActionReportTitle(action: Pick<MyAction, "source" | "sourceModule">) {
  return ACTION_REPORT_TITLES[inferActionSourceModule(action)];
}
