import { ImprovementEditPage } from "@/features/five-s/continuous-improvement/module";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImprovementEditPage id={id} />;
}
