import { RedTagCreatePage } from "@/features/five-s/red-tag/red-tag-module";

export default async function Page({ searchParams }: { searchParams: Promise<{ plant?: string }> }) {
  const { plant } = await searchParams;
  return <RedTagCreatePage plantRef={plant} />;
}
