import VisualImprovementReportPage from "@/features/visual-improvement/visual-improvement-report-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VisualImprovementReportPage improvementId={id} />;
}
