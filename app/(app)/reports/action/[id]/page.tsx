import { ModuleGate } from "@/components/modules/module-gate";
import ActionProgressReportPage from "@/features/reports/action-progress-report-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModuleGate id="reports"><ModuleGate id="actions"><ActionProgressReportPage actionId={id} /></ModuleGate></ModuleGate>;
}
