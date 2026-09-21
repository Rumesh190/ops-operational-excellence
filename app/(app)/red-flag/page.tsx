import RedFlagPage from "@/features/red-flag/red-flag-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; severity?: string }> }) {
  const { tab, status, severity } = await searchParams;
  return <RedFlagPage initialTab={tab} initialStatus={status} initialSeverity={severity} />;
}
