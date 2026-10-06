"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";

const RED_TAG_TABS = [
  { id: "overview", label: "Overview", href: "/5s/red/overview" },
  { id: "red-tag", label: "Red Tags", href: "/5s/red" },
  { id: "awaiting-closure", label: "Awaiting Closure", href: "/5s/red/awaiting-closure" },
  { id: "closed", label: "Closed", href: "/5s/red/closed" },
  { id: "settings", label: "Settings", href: "/5s/red/settings" },
];

export function RedTagNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/5s/red/settings") ? "settings" : pathname.startsWith("/5s/red/overview") ? "overview" : pathname.startsWith("/5s/red/awaiting-closure") ? "awaiting-closure" : pathname.startsWith("/5s/red/closed") ? "closed" : "red-tag";
  return <OpsTabBar label="Red Tag sections" tabs={RED_TAG_TABS} active={active} />;
}
