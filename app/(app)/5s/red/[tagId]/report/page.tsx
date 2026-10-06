import { RedTagReportPage } from "@/features/five-s/red-tag/red-tag-report-page";

export default async function Page({ params }: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await params;
  return <RedTagReportPage tagId={tagId} />;
}
