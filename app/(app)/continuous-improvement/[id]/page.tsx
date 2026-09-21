import { ImprovementDetailPage } from "@/features/five-s/continuous-improvement/module";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ImprovementDetailPage id={id} initialTab={query.tab} />;
}
