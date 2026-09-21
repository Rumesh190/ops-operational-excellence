import ContinuousImprovementLandingPage from "./landing-page";
import ContinuousImprovementNewPage from "./new-page";
import ContinuousImprovementDetailPage from "./detail-page";
import ContinuousImprovementEditPage from "./edit-page";
import ContinuousImprovementReportPage from "./report-page";

export function ImprovementListPage({ initialTab, initialStage }: { initialTab?: string; initialStage?: string } = {}) {
  return <ContinuousImprovementLandingPage initialTab={initialTab} initialStage={initialStage} />;
}

export function ImprovementCreatePage() {
  return <ContinuousImprovementNewPage />;
}

export function ImprovementDetailPage({ id, initialTab }: { id: string; initialTab?: string }) {
  return <ContinuousImprovementDetailPage improvementId={id} initialTab={initialTab} />;
}

export function ImprovementEditPage({ id }: { id: string }) {
  return <ContinuousImprovementEditPage improvementId={id} />;
}

export function ImprovementReportPage({ id }: { id: string }) {
  return <ContinuousImprovementReportPage improvementId={id} />;
}
