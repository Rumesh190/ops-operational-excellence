"use client";

import { Header } from "@/components/navigation/header";
import { Sidebar } from "@/components/navigation/sidebar";
import { useUiPreferences } from "@/components/preferences/ui-preferences-provider";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";

/**
 * OPS dual-tone shell: persistent desktop sidebar, responsive header, and a
 * consistently aligned light workspace.
 */
function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUiPreferences();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const shellContext = pathname.startsWith("/super-admin") && currentUser.isSuperAdmin ? "super-admin" : "ops";

  return (
    <div className="min-h-screen bg-muted/35 dark:bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        context={shellContext}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="app-workspace-shell flex min-h-screen flex-col">
        <Header />

        <main className="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-6 2xl:px-8 2xl:py-8">
          <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export { AppShell };
