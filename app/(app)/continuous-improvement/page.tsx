import { ImprovementListPage } from "@/features/five-s/continuous-improvement/module";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const filters = await searchParams;
  return <ImprovementListPage initialTab={filters.tab} initialStage={filters.stage} />;
}
