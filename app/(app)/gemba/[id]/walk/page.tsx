import GembaWalkPage from "@/features/gemba/gemba-walk-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GembaWalkPage walkId={id} />;
}
