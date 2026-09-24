import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isEvidencePhotoRequired } from "@/features/gemba/types";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const gemba = source("features/gemba/gemba-walk-page.tsx");
const audit = source("features/five-s/components/FiveSAuditExecution.tsx");
const action = source("features/five-s/action-detail-page.tsx");
const redFlag = source("features/red-flag/red-flag-components.tsx");
const redTag = source("features/five-s/red-tag/red-tag-module.tsx");
const ci = source("features/five-s/continuous-improvement/components.tsx");
const visual = source("features/visual-improvement/visual-improvement-components.tsx");
const report = source("features/gemba/gemba-report-page.tsx");
const photoStore = source("lib/gemba/gemba-photo-storage.ts");

describe("Team Feedback #15/#33/#35 — evidence capture consistency", () => {
  it.each([
    ["Gemba", gemba], ["Audit", audit], ["Actions", action], ["Red Flag", redFlag], ["Red Tag", redTag], ["CI", ci], ["Visual Improvement compatibility", visual],
  ])("%s has distinct Take Photo and Upload Photo controls", (_name, moduleSource) => {
    expect(moduleSource).toContain("Take Photo");
    expect(moduleSource).toContain("Upload Photo");
  });

  it.each([
    ["Gemba", gemba], ["Audit", audit], ["Actions", action], ["Red Flag", redFlag], ["Red Tag", redTag], ["CI", ci], ["Visual Improvement compatibility", visual],
  ])("%s Take Photo uses an image input with the environment hint", (_name, moduleSource) => {
    expect(moduleSource).toMatch(/type="file"[^>]*accept="image\/\*"[^>]*capture="environment"/);
  });

  it("keeps Upload Photo inputs free of a forced capture hint", () => {
    for (const moduleSource of [gemba, audit, action, redFlag, redTag, ci, visual]) {
      expect(moduleSource).toMatch(/type="file"[^>]*accept="image\/\*[^>]*"/);
    }
    expect(gemba).toContain('ref={uploadRef} hidden type="file" accept="image/*" multiple');
    expect(redFlag).toContain('ref={uploadRef} type="file" accept="image/*" multiple');
  });

  it("preserves multiple-image and single-image workflow cardinality", () => {
    expect(gemba).toContain('accept="image/*" multiple');
    expect(redFlag).toContain('accept="image/*" multiple');
    expect(ci).toContain('accept="image/*" multiple');
    expect(redTag).toContain('ref={uploadRef} hidden type="file" accept="image/*" onChange={imageChanged}');
  });

  it("provides immediate preview plus View, Replace, and Remove where editing permits", () => {
    for (const moduleSource of [gemba, redFlag, ci]) {
      expect(moduleSource).toContain("View");
      expect(moduleSource).toContain("Replace");
      expect(moduleSource).toContain("Remove");
    }
    expect(redTag).toContain("Before item preview");
    expect(redTag).toContain(">Replace</Button>");
    expect(action).toContain("onPreview={setPreview}");
  });

  it("preserves Gemba evidence policy and IndexedDB/cancel cleanup", () => {
    expect(isEvidencePhotoRequired("Issue")).toBe(true);
    expect(isEvidencePhotoRequired("Positive")).toBe(false);
    expect(isEvidencePhotoRequired("Opportunity")).toBe(false);
    expect(photoStore).toContain('DB_NAME = "ops-local-assets"');
    expect(photoStore).toContain('STORE_NAME = "gemba-photos"');
    expect(gemba).toContain("sessionStorageKeysRef");
    expect(gemba).toContain("removedOriginalBlobsRef");
    expect(gemba).toContain("deleteGembaPhoto");
  });

  it("keeps established evidence requirements and module lifecycle code in place", () => {
    expect(audit).toContain("requiresEvidence");
    expect(action).toContain("ACTION_LIFECYCLE_STAGES");
    expect(redTag).toContain("Awaiting Verification");
    expect(ci).toContain("ImprovementStatusBadge");
    expect(source("features/red-flag/types.ts")).toContain('"Awaiting Closure"');
  });

  it("keeps reports read-only and Feedback #7 deployment intact", () => {
    expect(report).not.toMatch(/Take Photo|Upload Photo|Replace|Remove/);
    expect(report).not.toMatch(/saveGemba|createAction|createRedTag|createImprovement/);
    expect(report).toContain("Horizontal Deployment");
    expect(gemba).toContain("Deployment Opportunity at other Zones");
  });

  it("uses accessible, responsive controls", () => {
    expect(redFlag).toContain('aria-label={`View ${item.name}`}');
    expect(redFlag).toContain('aria-label={`Replace ${item.name}`}');
    expect(ci).toContain('aria-label={`Remove ${item.name}`}');
    expect(redTag).toContain("grid-cols-2 gap-2 sm:flex");
    expect(action).toContain("grid grid-cols-2 gap-2");
  });

  it("does not add Base64 persistence or downstream workflow creation to Gemba capture", () => {
    expect(gemba).toContain("saveGembaPhoto");
    expect(gemba).not.toContain("readAsDataURL");
    expect(gemba).not.toMatch(/createAction\(|createRedTag\(|createImprovement\(/);
  });
});
