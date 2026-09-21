import RedFlagReportPage from "@/features/red-flag/red-flag-report-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RedFlagReportPage flagId={id} />;
}
