import type { ReactNode } from "react";
import { ModuleGate } from "@/components/modules/module-gate";
export default function Layout({ children }: { children: ReactNode }) {
  // Red Tags retain the existing entitlement for backwards-compatible access.
  // This is access reuse only; /5s/red is not a Red Flag route alias.
  return <ModuleGate id="redFlag">{children}</ModuleGate>;
}
