"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, Image, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { AuditNav } from "@/features/five-s/audit-nav";
import { DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID, useCustomAuditQuestions } from "./custom-audit-questions/store";
import { AuditConfigurationAccessDenied, useCanManageAuditConfiguration } from "./settings-access";

export default function AuditConfigurationPage() {
  const questions = useCustomAuditQuestions().filter((question) => (question.organizationId ?? DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID) === DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID);
  const allowed = useCanManageAuditConfiguration();
  if (!allowed) return <PageContainer><FiveSPageHeader eyebrow="OPS Workspace" title="Audits" description="Plan, conduct, and review 5S workplace audits." /><AuditNav /><AuditConfigurationAccessDenied /></PageContainer>;
  const rows = [
    { title: "5S Standard Checklist", description: "39 questions", detail: "Locked", icon: LockKeyhole },
    { title: "Custom Questions", description: `${questions.filter((question) => question.active).length} active questions`, detail: "Manage", icon: ClipboardList, href: "/audits/settings/custom-questions" },
    { title: "Scoring", description: "Current 5S scoring rules", detail: "Configure", icon: SlidersHorizontal, href: "/audits/settings/scoring" },
    { title: "Evidence Rules", description: "Audit evidence requirements", detail: "Configure", icon: Image, href: "/audits/settings/evidence-rules" },
  ];
  return <PageContainer>
    <FiveSPageHeader eyebrow="OPS Workspace" title="Audits" description="Plan, conduct, and review 5S workplace audits." />
    <AuditNav />
    <div className="space-y-3">{rows.map((row) => {
      const card = <Card className="transition-colors hover:border-primary/30"><CardContent className="flex items-center gap-4 p-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><row.icon className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{row.title}</h2><p className="mt-1 text-sm text-muted-foreground">{row.description}</p></div>{row.title === "5S Standard Checklist" ? <Badge variant="outline">Locked</Badge> : <span className="flex items-center gap-1 text-sm font-medium text-primary">{row.detail}<ChevronRight className="size-4" /></span>}</CardContent></Card>;
      return row.href ? <Link key={row.title} href={row.href} className="block">{card}</Link> : <div key={row.title} aria-disabled="true">{card}</div>;
    })}</div>
  </PageContainer>;
}
