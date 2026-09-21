import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("current 5S route surface", () => {
  it("keeps canonical and compatibility Action routes on the shared Action Center", () => {
    const bridge = read("features/five-s/actions-page.tsx");
    expect(bridge.trim()).toBe('export { default } from "@/features/actions/action-center-page";');
    expect(read("app/(app)/actions/page.tsx")).toContain('from "@/features/five-s/actions-page"');
    expect(read("app/(app)/5s/actions/page.tsx")).toContain('from "@/features/five-s/actions-page"');
  });

  it.each([
    "app/(app)/5s/listing/page.tsx",
    "app/(app)/5s/audits/[auditId]/report/page.tsx",
    "app/(app)/5s/actions/[actionId]/page.tsx",
    "app/(app)/5s/actions/[actionId]/report/page.tsx",
    "app/(app)/5s/continuous-improvement/[improvementId]/page.tsx",
    "app/(app)/5s/continuous-improvement/[improvementId]/report/page.tsx",
    "app/(app)/continuous-improvement/[id]/page.tsx",
    "app/(app)/continuous-improvement/[id]/edit/page.tsx",
    "app/(app)/continuous-improvement/[id]/report/page.tsx",
    "app/(app)/5s/red/page.tsx",
    "app/(app)/5s/red/create/page.tsx",
    "app/(app)/5s/red/[tagId]/page.tsx",
    "app/(app)/5s/red/[tagId]/print/page.tsx",
  ])("keeps %s", (routeFile) => expect(existsSync(resolve(routeFile))).toBe(true));

  it("characterizes encoded audit/action/CI IDs and raw Red Tag IDs", () => {
    const reservedId = "ID /?#";
    expect(`/5s/audits/${encodeURIComponent(reservedId)}/report?from=audit`).toBe(
      "/5s/audits/ID%20%2F%3F%23/report?from=audit",
    );
    expect(`/5s/actions/${encodeURIComponent(reservedId)}/report`).toBe(
      "/5s/actions/ID%20%2F%3F%23/report",
    );
    expect(read("features/five-s/components/FiveSAuditExecution.tsx")).toContain(
      "encodeURIComponent(audit.id)",
    );
    expect(read("features/five-s/action-detail-page.tsx")).toContain(
      "encodeURIComponent(action.id)",
    );
    expect(read("features/five-s/continuous-improvement/detail-page.tsx")).toContain(
      "`/continuous-improvement/${encodeURIComponent(item.id)}/report`",
    );
    expect(read("features/five-s/red-tag/red-tag-module.tsx")).toContain(
      "`/5s/red/${tag.id}/print`",
    );
  });

  it("reuses the Action Center visibility selector in direct detail and report views", () => {
    expect(read("features/five-s/action-detail-page.tsx")).toContain("getRoleVisibleActions(actions, actor, adminUser)");
    expect(read("features/five-s/action-report-route.tsx")).toContain("getRoleVisibleActions(actions, currentUser, adminUser)");
  });

  it("writes canonical source metadata from both Audit Action creation paths", () => {
    for (const file of [
      "features/five-s/components/FiveSAuditExecution.tsx",
      "features/five-s/components/FiveSAuditChecklist.tsx",
    ]) {
      const source = read(file);
      expect(source).toContain('sourceModule: "audit"');
      expect(source).toContain("sourceId: audit.id");
      expect(source).toContain('sourceLabel: "Audit"');
      expect(source).toContain("sourceObservationId: question.id");
    }
  });
});

describe("date-only timezone behavior", () => {
  function evaluate(tz: string, expression: string) {
    return execFileSync(process.execPath, ["-e", `process.stdout.write(${expression})`], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
  }

  it("keeps local-midnight parsing on the same calendar date in two timezone contexts", () => {
    const expression = "new Date('2026-08-27T00:00:00').getDate().toString()";
    expect(evaluate("Asia/Kolkata", expression)).toBe("27");
    expect(evaluate("America/Los_Angeles", expression)).toBe("27");
  });

  it("characterizes the shift risk of parsing a bare ISO date as UTC", () => {
    const expression = "new Date('2026-08-27').getDate().toString()";
    expect(evaluate("Asia/Kolkata", expression)).toBe("27");
    expect(evaluate("America/Los_Angeles", expression)).toBe("26");
  });
});
