import RedFlagDetailPage from "@/features/red-flag/red-flag-detail-page";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <RedFlagDetailPage flagId={id} initialTab={tab} />;
}
