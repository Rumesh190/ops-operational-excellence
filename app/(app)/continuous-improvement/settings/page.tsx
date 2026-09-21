"use client";

import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { ContinuousImprovementNav } from "@/features/five-s/continuous-improvement/ci-nav";

export default function Page() {
  return (
    <PageContainer>
      <FiveSPageHeader
        eyebrow="OPS Workspace"
        title="Continuous Improvement"
        description="Capture improvement ideas, review proposals, track implementation, and measure realized benefits."
      />
      <ContinuousImprovementNav />
      <OpsEmptyState
        title="Settings coming soon"
        description="Continuous Improvement module settings will be available in a future release."
      />
    </PageContainer>
  );
}
