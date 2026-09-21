import MeetingModePage from "@/features/visual-management/meeting-mode-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingModePage boardId={id} />;
}
