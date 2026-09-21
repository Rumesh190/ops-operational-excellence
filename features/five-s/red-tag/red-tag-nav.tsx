"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";

const RED_TAG_TABS = [
  { id: "red-tag", label: "Red Tags", href: "/5s/red" },
  { id: "settings", label: "Settings", href: "/5s/red/settings" },
];

export function RedTagNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/5s/red/settings") ? "settings" : "red-tag";
  return <OpsTabBar label="Red Tag sections" tabs={RED_TAG_TABS} active={active} />;
}
