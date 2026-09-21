import VisualImprovementDetailPage from "@/features/visual-improvement/visual-improvement-detail-page";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <VisualImprovementDetailPage improvementId={id} initialTab={tab} />;
}
