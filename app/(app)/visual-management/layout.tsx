import { ModuleGate } from "@/components/modules/module-gate";

export default function VisualManagementLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate id="visualManagement">{children}</ModuleGate>;
}
