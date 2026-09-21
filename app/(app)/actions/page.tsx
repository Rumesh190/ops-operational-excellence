import FiveSActionsPage from "@/features/five-s/actions-page";
import { ModuleGate } from "@/components/modules/module-gate";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; source?: string }> }) {
  const filters = await searchParams;
  return <ModuleGate id="actions"><FiveSActionsPage initialTab={filters.tab} initialStatus={filters.status} initialSource={filters.source} /></ModuleGate>;
}
