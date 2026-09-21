"use client";

import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useModuleEntitlements } from "@/lib/module-entitlements";
import { getAccessCapability, type AccessCapabilityId } from "@/lib/modules";

export function ModuleGate({ id, children }: { id: AccessCapabilityId; children: ReactNode }) {
  const entitlements = useModuleEntitlements();
  const moduleConfig = getAccessCapability(id);

  if (!entitlements[id]) {
    return (
      <PageContainer>
        <FiveSPageHeader
          eyebrow="OPS Workspace"
          title="Module not enabled"
          description={`${moduleConfig.label} is not enabled for this organization.`}
        />
        <section className="grid min-h-[280px] place-items-center rounded-xl border border-border/75 bg-card px-6 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <LockKeyhole className="size-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">Contact your organization administrator to request access.</p>
          </div>
        </section>
      </PageContainer>
    );
  }

  return children;
}
