"use client";

import { useRouter } from "next/navigation";

import { getRoleVisibleActions } from "@/features/actions/action-center-data";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useActionStore } from "@/lib/actions/action-store";
import { useCurrentUser } from "@/lib/current-user";

import FiveSActionReportPage from "./action-report-page";

interface FiveSActionReportRouteProps {
  actionId: string;
  origin?: string;
  returnTo?: string;
}

export default function FiveSActionReportRoute({
  actionId,
  origin,
  returnTo,
}: FiveSActionReportRouteProps) {
  const router = useRouter();
  const actions = useActionStore();
  const currentUser = useCurrentUser();
  const adminUsers = useAdminUsers();
  const adminUser = adminUsers.find((user) => user.id === currentUser.id);
  const storedAction = actions.find((item) => item.id === actionId);
  const action = getRoleVisibleActions(actions, currentUser, adminUser).find((item) => item.id === actionId);
  const reportsOrigin = origin === "reports-action";
  const backDestination = reportsOrigin && (returnTo?.startsWith("/5s/reports") || returnTo?.startsWith("/reports")) ? returnTo : "/actions";
  const backLabel = reportsOrigin ? "Back to Action Reports" : "Back to Actions";

  /* =========================================================
     ACTION NOT FOUND
     ========================================================= */

  if (!action) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {storedAction ? "Action access denied" : "Action not found"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {storedAction ? "This report is outside your permitted role or zone scope." : "The requested action could not be found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(backDestination)
            }
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     ONLY COMPLETED ACTIONS HAVE REPORTS
     ========================================================= */

  if (action.status !== "Completed") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            Report not available
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            The closure report is available only after
            this action has been completed.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(backDestination)
            }
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     REPORT
     ========================================================= */

  return (
    <div className="flex flex-1 flex-col px-6 py-6 lg:px-8 print:p-0">
      <FiveSActionReportPage
        action={action}
        onBack={() =>
          router.push(backDestination)
        }
        onViewSource={reportsOrigin ? () => router.push(`/actions/${encodeURIComponent(action.id)}`) : undefined}
        backLabel={backLabel}
      />
    </div>
  );
}
