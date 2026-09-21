import { ModuleGate } from "@/components/modules/module-gate";
import ReportSummaryPage from "@/features/reports/report-summary-page";

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return <ModuleGate id="reports"><ReportSummaryPage reportTypeId={type} /></ModuleGate>;
}
