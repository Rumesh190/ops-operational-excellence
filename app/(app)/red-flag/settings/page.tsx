"use client";

import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { RedFlagNav } from "@/features/red-flag/red-flag-nav";

export default function Page() {
  return (
    <PageContainer>
      <FiveSPageHeader
        eyebrow="OPS Workspace"
        title="Red Flag"
        description="Raise urgent operational issues quickly, contain risk, and verify closure with a traceable record."
      />
      <RedFlagNav />
      <OpsEmptyState
        title="Settings coming soon"
        description="Red Flag module settings will be available in a future release."
      />
    </PageContainer>
  );
}
