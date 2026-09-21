import { ModuleGate } from "@/components/modules/module-gate";
import FiveSActionReportRoute from "@/features/five-s/action-report-route";

export default async function Page({ params, searchParams }: { params: Promise<{ actionId: string }>; searchParams: Promise<{ from?: string; returnTo?: string }> }) {
  const { actionId } = await params;
  const query = await searchParams;
  return <ModuleGate id="actions"><FiveSActionReportRoute actionId={actionId} origin={query.from} returnTo={query.returnTo} /></ModuleGate>;
}
