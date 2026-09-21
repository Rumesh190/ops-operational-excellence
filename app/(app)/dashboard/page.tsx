import OpsDashboardPage from "@/features/ops-dashboard/ops-dashboard-page";
import type { AnalyticsDashboardId } from "@/features/analytics/analytics-data";

const DASHBOARD_VIEWS = new Set(["overview", "performance", "modules"] as const);

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; module?: string }> }) {
  const query = await searchParams;
  const initialView = DASHBOARD_VIEWS.has(query.view as "overview" | "performance" | "modules")
    ? query.view as "overview" | "performance" | "modules"
    : "overview";
  return <OpsDashboardPage initialView={initialView} initialModule={query.module as AnalyticsDashboardId | undefined} />;
}
