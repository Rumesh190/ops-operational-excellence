import { ModuleGate } from "@/components/modules/module-gate";

export default function VisualImprovementLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate id="visualImprovement">{children}</ModuleGate>;
}
