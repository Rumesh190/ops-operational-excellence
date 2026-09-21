import GembaPage from "@/features/gemba/gemba-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <GembaPage initialTab={tab} />;
}
