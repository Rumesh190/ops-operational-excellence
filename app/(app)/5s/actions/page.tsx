import FiveSActionsPage from "@/features/five-s/actions-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; source?: string }> }) {
  const filters = await searchParams;
  return <FiveSActionsPage initialTab={filters.tab} initialStatus={filters.status} initialSource={filters.source} />;
}
