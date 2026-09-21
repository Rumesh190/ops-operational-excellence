"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";

const ACTION_CENTER_TABS = [
  { id: "my-actions", label: "My Actions", href: "/actions" },
  { id: "team-actions", label: "Team Actions", href: "/actions?tab=team-actions" },
  { id: "settings", label: "Settings", href: "/actions/settings" },
];

export function ActionsNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/actions/settings") ? "settings" : "my-actions";
  return <OpsTabBar label="Actions sections" tabs={ACTION_CENTER_TABS} active={active} />;
}
