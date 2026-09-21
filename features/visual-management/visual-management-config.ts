import type {
  VisualManagementKpiEntry,
  VisualManagementKpiSection,
  VisualManagementKpiStatus,
  VisualManagementTier,
} from "./types";
import { getNextVisualManagementTierName } from "./visual-management-configuration-store";

export const VISUAL_MANAGEMENT_SECTIONS: readonly VisualManagementKpiSection[] = [
  "Safety",
  "Quality",
  "Delivery",
  "Cost",
  "People",
] as const;

export const VISUAL_MANAGEMENT_TIERS: readonly VisualManagementTier[] = ["Tier 1", "Tier 2", "Tier 3"] as const;
export const VISUAL_MANAGEMENT_KPI_STATUSES: readonly VisualManagementKpiStatus[] = ["Green", "Amber", "Red"] as const;

export const KPI_SECTION_DEFAULTS: Record<string, { target: string; actual: string }> = {
  Safety: { target: "0 incidents", actual: "0 incidents" },
  Quality: { target: "≥ 98% first-pass yield", actual: "98.4%" },
  Delivery: { target: "≥ 95% plan attainment", actual: "94%" },
  Cost: { target: "≤ INR 12k daily variance", actual: "INR 9.2k" },
  People: { target: "100% critical staffing", actual: "96%" },
};

export function createDefaultKpiEntries(statuses: Partial<Record<VisualManagementKpiSection, VisualManagementKpiStatus>> = {}, sections: readonly VisualManagementKpiSection[] = VISUAL_MANAGEMENT_SECTIONS): VisualManagementKpiEntry[] {
  return sections.map((section) => ({
    section,
    status: statuses[section] ?? "Green",
    target: KPI_SECTION_DEFAULTS[section]?.target ?? "Define target",
    actual: KPI_SECTION_DEFAULTS[section]?.actual ?? "Enter value",
    note: "",
  }));
}

export function kpiStatusRank(status: VisualManagementKpiStatus) {
  return status === "Red" ? 3 : status === "Amber" ? 2 : 1;
}

export function nextTier(tier: VisualManagementTier): VisualManagementTier | undefined {
  return getNextVisualManagementTierName(tier);
}
