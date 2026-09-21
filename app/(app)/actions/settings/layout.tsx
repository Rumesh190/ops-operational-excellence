import { SettingsDetailBack } from "@/components/settings/settings-detail-back";

export default function ActionSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <SettingsDetailBack backHref="/actions/settings" label="Back to Action Settings" />
      {children}
    </div>
  );
}
