import MeetingDetailPage from "@/features/visual-management/meeting-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetailPage meetingId={id} />;
}
