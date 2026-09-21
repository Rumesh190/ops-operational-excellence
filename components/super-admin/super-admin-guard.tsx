"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (user.isSuperAdmin) return children;
  return <PageContainer><FiveSPageHeader eyebrow="OPS" title="Access restricted" description="Super Admin is available only to platform administrators." /><section className="grid min-h-[280px] place-items-center rounded-xl border bg-card"><div className="text-center"><ShieldAlert className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">You do not have access to this area.</p></div></section></PageContainer>;
}
