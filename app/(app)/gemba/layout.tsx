import { ModuleGate } from "@/components/modules/module-gate";

export default function GembaLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate id="gemba">{children}</ModuleGate>;
}
