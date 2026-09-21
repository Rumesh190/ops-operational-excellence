"use client";

import Link from "next/link";
import { ArrowRight, BellRing, Clock3, ShieldAlert, Tag } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { ActionsNav } from "@/features/actions/actions-nav";
import { useSettingsAccess, SettingsAccessDenied } from "@/features/settings/settings-access";
import { useActionConfiguration } from "@/lib/actions/action-configuration-store";
import { useActionCategorySettings } from "@/lib/actions/action-category-store";

const ITEMS = [
  {
    label: "Categories",
    href: "/actions/settings/categories",
    icon: Tag,
    descriptionFn: (cfg: ReturnType<typeof useActionConfiguration>, cats: ReturnType<typeof useActionCategorySettings>) =>
      `${cats.filter((c) => c.active).length} active categories`,
  },
  {
    label: "Priority & Due Dates",
    href: "/actions/settings/priority-due-dates",
    icon: Clock3,
    descriptionFn: (cfg: ReturnType<typeof useActionConfiguration>) =>
      cfg.priorities.map((p) => `${p.label}: ${p.dueOffsetDays}d`).join(" · "),
  },
  {
    label: "Reminder Rules",
    href: "/actions/settings/reminder-rules",
    icon: BellRing,
    descriptionFn: (cfg: ReturnType<typeof useActionConfiguration>) => {
      const active = [cfg.reminders.dueSoon, cfg.reminders.dueToday, cfg.reminders.overdue, cfg.reminders.repeatOverdue].filter((r) => r.enabled).length;
      return `${active} active reminder rules`;
    },
  },
  {
    label: "Escalation Rules",
    href: "/actions/settings/escalation-rules",
    icon: ShieldAlert,
    descriptionFn: (cfg: ReturnType<typeof useActionConfiguration>) =>
      `${cfg.escalations.filter((e) => e.enabled).length} escalation levels active`,
  },
] as const;

export default function Page() {
  const access = useSettingsAccess();
  const cfg = useActionConfiguration();
  const cats = useActionCategorySettings();

  if (!access.canManageConfiguration) {
    return (
      <PageContainer>
        <FiveSPageHeader eyebrow="OPS Workspace" title="Actions" description="Track, complete, review, and close actions created across OPS." />
        <ActionsNav />
        <SettingsAccessDenied area="Action Configuration" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <FiveSPageHeader eyebrow="OPS Workspace" title="Actions" description="Track, complete, review, and close actions created across OPS." />
      <ActionsNav />
      <div className="space-y-2">
        {ITEMS.map((item) => (
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
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {(item as typeof ITEMS[number]).descriptionFn(cfg, cats as never)}
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
