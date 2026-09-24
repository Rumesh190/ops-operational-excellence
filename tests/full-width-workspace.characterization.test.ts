import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Team Feedback #24 — full-width OPS workspace", () => {
  it("keeps the shared page container fluid within the app shell", () => {
    const pageContainer = source("components/layout/page-container.tsx");
    const appShell = source("components/layout/app-shell.tsx");

    expect(pageContainer).toContain(
      '"motion-page-enter flex w-full flex-1 flex-col gap-5 lg:gap-6"',
    );
    expect(appShell).toContain(
      'className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col"',
    );
  });

  it("lets the Gemba creation form use the available workspace", () => {
    const gembaNew = source("features/gemba/gemba-new-page.tsx");

    expect(gembaNew).toContain("return <PageContainer>");
    expect(gembaNew).not.toContain(
      '<PageContainer className="max-w-5xl">',
    );
    expect(gembaNew).toContain('className="grid gap-4 md:grid-cols-2"');
    expect(gembaNew).toContain('<Field label="Walk Lead">');
    expect(gembaNew).toContain('<p className="text-sm font-medium">When *</p>');
    expect(gembaNew).toContain(
      'router.push(startNow ? `/gemba/${walk.id}/walk` : `/gemba/${walk.id}`)',
    );
    expect(gembaNew).toContain(
      '<DialogContent className="max-w-md">',
    );
  });

  it("lets the Continuous Improvement creation form use wider metadata grids", () => {
    const improvementNew = source(
      "features/five-s/continuous-improvement/new-page.tsx",
    );

    expect(improvementNew).toContain(
      '<PageContainer className="pb-24 sm:pb-8">',
    );
    expect(improvementNew).not.toContain(
      '<PageContainer className="max-w-5xl pb-24 sm:pb-8">',
    );
    expect(improvementNew.match(/xl:grid-cols-4/g)).toHaveLength(2);
    expect(improvementNew).toContain('<Field label="Problem / Opportunity *">');
    expect(improvementNew).toContain(
      '<Field label="Expected Benefit Description *">',
    );
    expect(improvementNew).toContain("createImprovement({");
    expect(improvementNew).toContain(
      'router.push(`/continuous-improvement/${encodeURIComponent(item.id)}`)',
    );
  });
});
