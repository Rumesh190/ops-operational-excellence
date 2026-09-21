"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";

function AdminPage({ section, title, description, children }: { section: string; title: string; description: string; children: React.ReactNode }) { const access = useSettingsAccess(); return <PageContainer><FiveSPageHeader eyebrow="" title={title} description={description} />{access.canManageConfiguration ? children : <SettingsAccessDenied area={section} />}</PageContainer>; }
function Rows({ rows }: { rows: Array<{ label: string; value: string; detail?: string }> }) { return <Card><CardContent className="divide-y p-0">{rows.map((row) => <div key={row.label} className="flex items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{row.label}</p>{row.detail && <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>}</div><Badge variant="outline">{row.value}</Badge></div>)}</CardContent></Card>; }

export function AuditScoringPage() { return <AdminPage section="Audit Configuration" title="Scoring" description="Current locked 5S scoring behavior."><Rows rows={[{ label: "Non Compliance", value: "0" }, { label: "Partially Compliance", value: "1" }, { label: "Fully Compliance", value: "2" }, { label: "Text / Yes-No custom responses", value: "Not scored" }]} /></AdminPage>; }
export function AuditEvidenceRulesPage() { return <AdminPage section="Audit Configuration" title="Evidence Rules" description="Current Audit evidence requirements."><Rows rows={[{ label: "Standard non-compliance", value: "Required", detail: "Evidence and a corrective Action are required" }, { label: "Custom Compliance questions", value: "Configurable", detail: "Configured per custom question" }, { label: "Text and Yes / No", value: "Optional" }]} /></AdminPage>; }
