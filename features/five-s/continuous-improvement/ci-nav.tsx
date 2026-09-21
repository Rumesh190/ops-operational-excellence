"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";

const CI_TABS = [
  { id: "overview", label: "Overview", href: "/continuous-improvement" },
  { id: "improvements", label: "Improvements", href: "/continuous-improvement?tab=improvements" },
  { id: "review", label: "Review Queue", href: "/continuous-improvement?tab=review" },
  { id: "completed", label: "Completed", href: "/continuous-improvement?tab=completed" },
  { id: "settings", label: "Settings", href: "/continuous-improvement/settings" },
];

export function ContinuousImprovementNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/continuous-improvement/settings") ? "settings" : "overview";
  return <OpsTabBar label="Continuous Improvement sections" tabs={CI_TABS} active={active} />;
}
