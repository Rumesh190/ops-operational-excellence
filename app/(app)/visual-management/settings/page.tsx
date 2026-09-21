"use client";

import Link from "next/link";
import { ArrowRight, LayoutPanelTop, Layers3, BarChart3 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useSettingsAccess, SettingsAccessDenied } from "@/features/settings/settings-access";
import { useVisualManagementConfiguration } from "@/features/visual-management/visual-management-configuration-store";
import { VisualManagementNav } from "@/features/visual-management/visual-management-components";
import { useModuleEntitlements } from "@/lib/module-entitlements";

export default function Page() {
  const access = useSettingsAccess();
  const modules = useModuleEntitlements();
  const cfg = useVisualManagementConfiguration();
  const allowed = access.canManageConfiguration && (modules.visualManagement || access.isSuperAdmin);

  if (!allowed) {
    return (
      <PageContainer>
        <FiveSPageHeader eyebrow="OPS Workspace" title="Visual Management" description="Run daily operational meetings, review performance, track issues, and turn discussions into action." />
        <VisualManagementNav />
        <SettingsAccessDenied area="Visual Management configuration" />
      </PageContainer>
    );
  }

  const items = [
    {
      label: "Boards",
      href: "/visual-management/settings/boards",
      icon: LayoutPanelTop,
      description: `${cfg.boards.filter((b) => b.status === "Active").length} active boards`,
    },
    {
      label: "Tier Structure",
      href: "/visual-management/settings/tiers",
      icon: Layers3,
      description: `${cfg.tiers.filter((t) => t.active).length} active tiers`,
    },
    {
      label: "KPI Sections",
      href: "/visual-management/settings/kpi-sections",
      icon: BarChart3,
      description: `${cfg.kpiSections.filter((k) => k.active).length} active KPI sections`,
    },
  ];

  return (
    <PageContainer>
      <FiveSPageHeader eyebrow="OPS Workspace" title="Visual Management" description="Run daily operational meetings, review performance, track issues, and turn discussions into action." />
      <VisualManagementNav />
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm outline-none transition-colors hover:border-primary/30 hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
              <item.icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
