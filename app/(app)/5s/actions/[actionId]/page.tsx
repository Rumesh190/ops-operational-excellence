import FiveSActionDetailPage from "@/features/five-s/action-detail-page";

interface PageProps {
  params: Promise<{ actionId: string }>;
  searchParams: Promise<{ mode?: string; section?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { actionId } = await params;
  const query = await searchParams;
  return <FiveSActionDetailPage actionId={actionId} initialSection={query.mode === "review" ? "review" : query.section} />;
}
