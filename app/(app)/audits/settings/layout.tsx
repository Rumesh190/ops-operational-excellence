import { SettingsDetailBack } from "@/components/settings/settings-detail-back";

export default function AuditSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <SettingsDetailBack backHref="/audits/settings" label="Back to Audit Settings" />
      {children}
    </div>
  );
}
