"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";

const RED_FLAG_TABS = [
  { id: "overview", label: "Overview", href: "/red-flag" },
  { id: "red-flags", label: "Red Flags", href: "/red-flag?tab=red-flags" },
  { id: "awaiting-closure", label: "Awaiting Closure", href: "/red-flag?tab=awaiting-closure" },
  { id: "closed", label: "Closed", href: "/red-flag?tab=closed" },
  { id: "settings", label: "Settings", href: "/red-flag/settings" },
];

export function RedFlagNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/red-flag/settings") ? "settings" : "overview";
  return <OpsTabBar label="Red Flag sections" tabs={RED_FLAG_TABS} active={active} />;
}
