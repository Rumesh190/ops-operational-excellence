import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildGembaReportSummary } from "@/features/gemba/gemba-report-page";
import type { GembaObservation } from "@/features/gemba/types";

const reportSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-report-page.tsx"), "utf8");
const detailSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-detail-page.tsx"), "utf8");
const routeSource = readFileSync(resolve(process.cwd(), "app/(app)/gemba/[id]/report/page.tsx"), "utf8");
const reportsSource = readFileSync(resolve(process.cwd(), "features/reports/report-data.ts"), "utf8");
const evidenceHookSource = readFileSync(resolve(process.cwd(), "features/gemba/use-gemba-evidence-url.ts"), "utf8");

function observation(id: string, type: GembaObservation["type"], patch: Partial<GembaObservation> = {}): GembaObservation {
  return {
    id, gembaId: "GEM-REPORT", type, title: `${type} title`, description: `${type} description`, location: "Machine 04",
    peopleInvolved: [], evidence: [], createdById: "USR-1", createdByName: "Observer", createdAt: "2026-09-24T08:00:00.000Z", updatedAt: "2026-09-24T08:00:00.000Z", ...patch,
  };
}

describe("Team Feedback #13 — Gemba Walk Report", () => {
  it("uses the existing canonical dynamic report route and resolves the requested walk ID", () => {
    expect(routeSource).toContain('GembaReportPage walkId={id}');
    expect(reportSource).toContain('state.walks.find((item) => item.id === walkId)');
    expect(reportSource).toContain("canViewGembaWalk");
  });

  it("handles missing walks and zero-observation reports safely", () => {
    expect(reportSource).toContain("Gemba report unavailable");
    expect(reportSource).toContain("No observations captured");
    expect(buildGembaReportSummary([])).toEqual({ total: 0, positive: 0, opportunity: 0, issue: 0, actions: 0, redTags: 0, improvements: 0, horizontalDeployments: 0 });
  });

  it("keeps report access on completed walk detail and in the existing Reports module", () => {
    expect(detailSource).toContain('walk.status === "Completed"');
    expect(detailSource).toContain("View Report");
    expect(reportsSource).toContain('previewHref: `/gemba/${encodeURIComponent(walk.id)}/report`');
  });

  it("derives all summary counts from canonical observations and unique links", () => {
    const records = [
      observation("O-1", "Positive", { actionId: "ACT-1" }),
      observation("O-2", "Opportunity", { actionId: "ACT-1", improvementId: "CI-1", horizontalDeployment: { enabled: true, targetZoneIds: ["ZONE-C"], recipients: [], createdAt: "t", updatedAt: "t" } }),
      observation("O-3", "Issue", { redTagId: "RT-1" }),
    ];
    expect(buildGembaReportSummary(records)).toEqual({ total: 3, positive: 1, opportunity: 1, issue: 1, actions: 1, redTags: 1, improvements: 1, horizontalDeployments: 1 });
  });

  it("renders canonical walk metadata, participants, completion data, and every observation field", () => {
    for (const text of ["Gemba Walk Report", "Walk Lead", "Participants", "Purpose", "Notes", "Started", "Completed", "Duration", "OBSERVATION", "observation.title", "observation.description", "observation.location", "observation.createdByName", "peopleInvolved"]) expect(reportSource).toContain(text);
    expect(reportSource).toContain("item.homeZone");
    expect(reportSource).toContain("formatGembaZoneLabel(item.homeZone)");
  });

  it("supports multiple photos through the IndexedDB evidence resolver and a missing-image fallback", () => {
    expect(reportSource).toContain("observation.evidence.map");
    expect(reportSource).toContain("useGembaEvidenceUrl(evidence)");
    expect(reportSource).toContain("Evidence unavailable");
    expect(evidenceHookSource).toContain("getGembaPhoto(storageKey)");
    expect(evidenceHookSource).toContain("URL.createObjectURL(blob)");
  });

  it("resolves linked records dynamically and degrades safely when they were deleted", () => {
    expect(reportSource).toContain("useActionStore()");
    expect(reportSource).toContain("useRedTags()");
    expect(reportSource).toContain("useImprovements()");
    expect(reportSource.match(/Linked record unavailable/g)?.length).toBeGreaterThanOrEqual(3);
    expect(reportSource).toContain("responsiblePersonName");
    expect(reportSource).toContain("redTag.decisionRecord");
    expect(reportSource).toContain("improvement.title");
  });

  it("renders Feedback #7 deployment recipients without claiming email delivery", () => {
    expect(reportSource).toContain("Horizontal Deployment");
    expect(reportSource).toContain("recipient.leaderName");
    expect(reportSource).toContain("Notification unavailable");
    expect(reportSource).not.toMatch(/email sent/i);
  });

  it("represents voice capture in a print-safe way without an audio player", () => {
    expect(reportSource).toContain("Voice note attached");
    expect(reportSource).toContain("Structured observation text shown above");
    expect(reportSource).not.toContain("<audio");
  });

  it("uses browser print/PDF with print-safe page rules and performs no report-time mutation", () => {
    expect(reportSource).toContain("window.print()");
    expect(reportSource).toContain("@page{size:A4 portrait");
    expect(reportSource).toContain("break-inside:avoid");
    expect(reportSource).not.toMatch(/saveGemba|linkGemba|createAction|createRedTag|createImprovement|createNotification/);
    const records = [observation("O-1", "Positive")];
    const before = JSON.stringify(records);
    buildGembaReportSummary(records);
    expect(JSON.stringify(records)).toBe(before);
  });
});
