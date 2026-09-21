import { ModuleGate } from "@/components/modules/module-gate";
import ReportsPage from "@/features/reports/reports-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; sort?: string }> }) {
  const params = await searchParams;
  return <ModuleGate id="reports"><ReportsPage initialTab={params.tab} initialSearch={params.q} initialSort={params.sort} /></ModuleGate>;
}
