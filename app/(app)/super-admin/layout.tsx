import type { ReactNode } from "react";
import { SuperAdminGuard } from "@/components/super-admin/super-admin-guard";
export default function Layout({ children }: { children: ReactNode }) { return <SuperAdminGuard>{children}</SuperAdminGuard>; }
