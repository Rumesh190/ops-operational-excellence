"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ACCESS_CAPABILITIES, getNavigationGroup, isAccessCapabilityRouteActive } from "@/lib/modules";
import { ROUTE_LABELS } from "@/lib/navigation";

interface Crumb { label: string; href?: string }

const SETTINGS_CATEGORIES = [
  { paths: ["/settings/organization/"], label: "Organization" },
  { paths: ["/settings/users", "/settings/roles"], label: "Users & Access" },
  { paths: ["/settings/audit"], label: "Audit Configuration" },
  { paths: ["/settings/actions/"], label: "Action Configuration" },
  { paths: ["/settings/visual-management/"], label: "Visual Management" },
  { paths: ["/settings/notifications", "/settings/appearance"], label: "Preferences" },
  { paths: ["/settings/module-access"], label: "Platform Administration" },
] as const;

function decodeSegment(value: string) { try { return decodeURIComponent(value); } catch { return value; } }
function title(value: string) {
  const decoded = decodeSegment(value);
  if (/^[A-Z]{2,}(?:-[A-Z0-9]+)+$/.test(decoded)) return decoded;
  return decoded.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function crumbsForPath(pathname: string): Crumb[] {
  if (pathname === "/dashboard" || pathname === "/5s") return [{ label: "Dashboard" }];
  const settingsCategory = SETTINGS_CATEGORIES.find((category) => category.paths.some((path) => pathname === path || pathname.startsWith(path)))?.label;
  if (settingsCategory) {
    const pageLabel = ROUTE_LABELS[pathname] ?? title(pathname.split("/").at(-1) ?? "");
    return [
      { label: "Settings", href: "/settings" },
      { label: settingsCategory },
      ...(pageLabel === settingsCategory ? [] : [{ label: pageLabel }]),
    ];
  }
  const capability = ACCESS_CAPABILITIES.find((moduleConfig) => isAccessCapabilityRouteActive(pathname, moduleConfig));
  if (capability) {
    const bases = [capability.route, ...(capability.legacyRoutes ?? [])];
    const base = bases.filter((route) => pathname === route || pathname.startsWith(`${route}/`)).sort((a, b) => b.length - a.length)[0];
    const remainder = pathname.slice(base.length).split("/").filter(Boolean);
    const parentLabel = capability.stageLabel ?? getNavigationGroup(capability.navigationGroup).label;
    return [{ label: parentLabel }, { label: capability.label, href: remainder.length ? capability.route : undefined }, ...remainder.map((segment) => ({ label: title(segment) }))];
  }
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((_, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    return { path, label: ROUTE_LABELS[path] ?? title(segments[index]), href: index < segments.length - 1 ? path : undefined };
  });
}

function BreadcrumbNav() {
  const crumbs = crumbsForPath(usePathname());
  return <Breadcrumb><BreadcrumbList>{crumbs.map((crumb, index) => <React.Fragment key={`${crumb.label}-${index}`}><BreadcrumbItem>{crumb.href ? <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink> : <BreadcrumbPage>{crumb.label}</BreadcrumbPage>}</BreadcrumbItem>{index < crumbs.length - 1 && <BreadcrumbSeparator />}</React.Fragment>)}</BreadcrumbList></Breadcrumb>;
}

export { BreadcrumbNav, crumbsForPath };
