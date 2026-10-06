import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/ops/page-form-action-bar.tsx"), "utf8");

describe("shared page form action bar", () => {
  it("supports contextual primary and non-submitting secondary actions", () => {
    expect(source).toContain("primaryLabel");
    expect(source).toContain("secondaryLabel");
    expect(source).toContain('type="button" variant="outline"');
    expect(source).toContain("type={primaryType}");
    expect(source).toContain("onClick={primaryAction}");
    expect(source).not.toContain("Red Tag");
  });

  it("shares submitting protection, loading copy, and validation feedback", () => {
    expect(source).toContain("disabled={isSubmitting || primaryDisabled}");
    expect(source).toContain("isSubmitting ? submittingLabel ?? primaryLabel : primaryLabel");
    expect(source).toContain("validationSummary");
    expect(source).toContain('role="status"');
  });

  it("uses a responsive sticky content-aligned surface with mobile safe-area support", () => {
    for (const token of ["sticky bottom-3", "mobile-safe-bottom", "sm:flex-row", "sm:justify-end", "backdrop-blur", "shadow-"]) expect(source).toContain(token);
  });
});
