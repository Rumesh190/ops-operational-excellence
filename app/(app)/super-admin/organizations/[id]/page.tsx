import { OrganizationDetailPage } from "@/features/super-admin/super-admin";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OrganizationDetailPage organizationId={id} />; }
