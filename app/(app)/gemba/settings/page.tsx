"use client";

import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { GembaNav } from "@/features/gemba/gemba-nav";

export default function Page() {
  return (
    <PageContainer>
      <FiveSPageHeader
        eyebrow="OPS Workspace"
        title="Gemba"
        description="Observe work where it happens, capture insight quickly, and turn follow-up into action."
      />
      <GembaNav />
      <OpsEmptyState
        title="Settings coming soon"
        description="Gemba module settings will be available in a future release."
      />
    </PageContainer>
  );
}
