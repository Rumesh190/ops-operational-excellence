import type { ReactNode } from "react";
import { SettingsDetailBack } from "@/components/settings/settings-detail-back";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <SettingsDetailBack />
      {children}
    </div>
  );
}
