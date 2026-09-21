import GembaDetailPage from "@/features/gemba/gemba-detail-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <GembaDetailPage walkId={id} initialTab={tab} />;
}
