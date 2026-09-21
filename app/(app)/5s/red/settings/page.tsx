"use client";

import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { RedTagNav } from "@/features/five-s/red-tag/red-tag-nav";

export default function Page() {
  return (
    <PageContainer>
      <FiveSPageHeader
        eyebrow="5S Workplace Organization"
        title="5S Red Tags"
        description="Identify, label, and track items that should be removed or dispositioned from the workplace."
      />
      <RedTagNav />
      <OpsEmptyState
        title="Settings coming soon"
        description="Red Tag module settings will be available in a future release."
      />
    </PageContainer>
  );
}
