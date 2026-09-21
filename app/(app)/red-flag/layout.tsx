import { ModuleGate } from "@/components/modules/module-gate";

export default function RedFlagLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate id="redFlag">{children}</ModuleGate>;
}
