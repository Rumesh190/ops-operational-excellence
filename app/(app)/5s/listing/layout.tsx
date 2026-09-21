import type { ReactNode } from "react";
import { ModuleGate } from "@/components/modules/module-gate";
export default function Layout({ children }: { children: ReactNode }) { return <ModuleGate id="audit">{children}</ModuleGate>; }
