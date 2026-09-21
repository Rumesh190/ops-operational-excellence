import { SettingsDetailBack } from "@/components/settings/settings-detail-back";

export default function VisualManagementSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <SettingsDetailBack backHref="/visual-management/settings" label="Back to Visual Management Settings" />
      {children}
    </div>
  );
}
