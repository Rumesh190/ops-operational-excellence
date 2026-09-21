import VisualImprovementPage from "@/features/visual-improvement/visual-improvement-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const { tab, status } = await searchParams;
  return <VisualImprovementPage initialTab={tab} initialStatus={status} />;
}
