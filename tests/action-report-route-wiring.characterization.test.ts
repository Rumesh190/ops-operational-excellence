import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

describe("canonical Action report route wiring", () => {
  it("routes /actions/[actionId]/report to the current canonical renderer", () => {
    const page = source("app/(app)/actions/[actionId]/report/page.tsx");
    const route = source("features/five-s/action-report-route.tsx");
    expect(page).toContain("FiveSActionReportRoute");
    expect(route).toContain("CanonicalActionReportPage");
    expect(route).toContain("resolveActionSourceBeforeEvidence(action, redTags)");
    expect(route).not.toContain('from "./action-report-page"');
  });

  it("renders canonical source-aware language and excludes legacy 5S terminology", () => {
    const report = source("features/reports/canonical-action-report-page.tsx");
    expect(report).toContain("getActionReportTitle(action)");
    expect(report).toContain("Action ID:");
    expect(report).toContain("Before Evidence");
    expect(report).toContain("After Evidence");
    expect(report).toContain("getActionSourceRecordLabel(action)");
    for (const legacy of ["5S Improvement Report", "Improvement No", "Not Good (Before)", "Good (After)", "No original evidence captured"]) expect(report).not.toContain(legacy);
  });

  it("shares one read-only source evidence resolver with Action execution", () => {
    const detail = source("features/five-s/action-detail-page.tsx");
    const route = source("features/five-s/action-report-route.tsx");
    const resolver = source("lib/actions/action-evidence.ts");
    expect(detail).toContain("resolveActionSourceBeforeEvidence(action, redTags)");
    expect(route).toContain("resolveActionSourceBeforeEvidence(action, redTags)");
    expect(resolver).toContain("readOnly: true");
    expect(resolver).toContain("source.imageUrl");
  });
});
