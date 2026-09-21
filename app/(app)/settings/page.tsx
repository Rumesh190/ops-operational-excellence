"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  Palette,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Input } from "@/components/ui/input";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useSettingsAccess } from "@/features/settings/settings-access";

interface Item {
  label: string;
  href: string;
  description: string;
  access?: "roles";
}

interface Group {
  title: string;
  description: string;
  icon: LucideIcon;
  items: Item[];
  access?: "users" | "configuration" | "platform";
}

const GROUPS: Group[] = [
  {
    title: "Organization",
    description: "Manage your operating structure.",
    icon: Building2,
    access: "configuration",
    items: [
      { label: "Plant", href: "/settings/organization/plant", description: "Manufacturing site information" },
      { label: "Zones", href: "/settings/organization/zones", description: "Zone A–D structure and ownership" },
    ],
  },
  {
    title: "Users & Access",
    description: "Manage people, assignments, and permissions.",
    icon: Users,
    access: "users",
    items: [
      { label: "Users", href: "/settings/users", description: "Users, assignments, and status" },
      { label: "Roles & Permissions", href: "/settings/roles", description: "Role capabilities and access", access: "roles" },
    ],
  },
  {
    title: "Preferences",
    description: "Personalize your OPS experience.",
    icon: Palette,
    items: [
      { label: "Notifications", href: "/profile?tab=notifications", description: "Operational notification preferences" },
      { label: "Appearance", href: "/profile?tab=preferences", description: "Theme and display preferences" },
    ],
  },
  {
    title: "Platform Administration",
    description: "Manage organization-level platform access.",
    icon: ShieldCheck,
    access: "platform",
    items: [
      { label: "Module Access", href: "/settings/module-access", description: "Control which OPS capabilities are available to each organization" },
    ],
  },
];

export default function Page() {
  const access = useSettingsAccess();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const groups = useMemo(() => GROUPS
    .filter((group) => !group.access
      || (group.access === "users" ? access.canViewUsers
        : group.access === "configuration" ? access.canManageConfiguration
          : access.isSuperAdmin))
    .map((group) => {
      const allowedItems = group.items.filter((item) => !item.access || access.canManageRoles);
      if (!query || `${group.title} ${group.description}`.toLowerCase().includes(query)) return { ...group, items: allowedItems };
      return {
        ...group,
        items: allowedItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query)),
      };
    })
    .filter((group) => group.items.length > 0), [access.canManageConfiguration, access.canManageRoles, access.canViewUsers, access.isSuperAdmin, query]);

  return (
    <PageContainer>
      <FiveSPageHeader
        eyebrow="Settings"
        title="Settings & Administration"
        description="Configure organization structure, users, roles, and product preferences."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Settings"
          aria-label="Search Settings"
          className="pl-9"
        />
      </div>

      {groups.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.title}
              className={group.access === "platform"
                ? "rounded-xl border border-primary/20 bg-primary/[0.025] p-4 shadow-sm"
                : "rounded-xl border bg-card p-4 shadow-sm"}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
                  <group.icon className="size-[17px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{group.description}</p>
                </div>
              </div>

              <div className="mt-3 divide-y border-t">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 outline-none transition-colors hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium transition-colors group-hover:text-primary">{item.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center rounded-xl border border-dashed text-center">
          <div>
            <p className="text-sm font-semibold">No settings found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different category, setting, or description.</p>
          </div>
        </div>
      )}

      {!access.canViewUsers && !access.canManageConfiguration && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Bell className="size-4" />
          Administrative settings are hidden for your current role. Personal preferences remain available.
        </div>
      )}
    </PageContainer>
  );
}
