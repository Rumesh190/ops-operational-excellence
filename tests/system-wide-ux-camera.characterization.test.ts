import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const camera = source("components/ops/ops-camera-capture.tsx");

describe("system-wide OPS live camera", () => {
  it("uses getUserMedia with video only and an environment-facing preference", () => {
    expect(camera).toContain("navigator.mediaDevices.getUserMedia");
    expect(camera).toContain('audio: false, video: { facingMode: { ideal: "environment" } }');
    expect(camera).toContain("Live camera preview");
  });

  it("captures a JPEG Blob, returns a File, and supports review plus retake", () => {
    expect(camera).toContain('canvas.toBlob');
    expect(camera).toContain('new File([capture.blob]');
    for (const label of ["Capture", "Review Photo", "Retake", "Use Photo"]) expect(camera).toContain(label);
  });

  it("stops MediaStream tracks and revokes temporary object URLs", () => {
    expect(camera).toContain("getTracks().forEach((track) => track.stop())");
    expect(camera).toContain("URL.revokeObjectURL");
    expect(camera).toContain("useEffect(() => () => {");
    expect(camera).toContain("stopCamera();");
  });

  it("handles permission, unsupported, missing-camera, and unavailable states with an honest upload fallback", () => {
    for (const copy of ["Camera access was denied", "No camera is available", "Camera access is not supported", "Unable to start the camera", "Upload Photo"]) expect(camera).toContain(copy);
    expect(camera).toContain('type="file" accept="image/*"');
    expect(camera).not.toContain('capture="environment"');
  });

  it.each([
    ["Gemba", "features/gemba/gemba-walk-page.tsx"],
    ["Audit", "features/five-s/components/FiveSAuditExecution.tsx"],
    ["Actions", "features/five-s/action-detail-page.tsx"],
    ["Red Flag", "features/red-flag/red-flag-components.tsx"],
    ["Red Tag", "features/five-s/red-tag/red-tag-module.tsx"],
    ["Continuous Improvement", "features/five-s/continuous-improvement/components.tsx"],
    ["Visual Improvement", "features/visual-improvement/visual-improvement-components.tsx"],
  ])("integrates %s with the shared camera without replacing its upload pipeline", (_module, path) => {
    const moduleSource = source(path);
    expect(moduleSource).toContain("OpsCameraCapture");
    expect(moduleSource).toContain('accept="image/*');
  });
});

describe("system-wide workspace and Gemba observation detail", () => {
  it("keeps the shell and active operational workspaces fluid while reports remain documents", () => {
    expect(source("components/layout/app-shell.tsx")).not.toContain("max-w-[1680px]");
    expect(source("features/gemba/gemba-walk-page.tsx")).toContain("gemba-active-walk max-w-none");
    expect(source("features/actions/action-center-page.tsx")).toContain('PageContainer className="max-w-none"');
    expect(source("features/five-s/continuous-improvement/detail-page.tsx")).toContain('PageContainer className="max-w-none"');
    expect(source("features/reports/report-summary-page.tsx")).toContain("max-w-[1180px]");
    expect(source("features/five-s/components/FiveSAuditReport.tsx")).toContain("max-w-[1120px]");
  });

  it("uses a responsive operational detail surface with inspectable evidence and conditional follow-up", () => {
    const detail = source("features/gemba/gemba-components.tsx");
    expect(detail).toContain("sm:max-w-[860px]");
    expect(detail).toContain("aspect-[16/10]");
    for (const label of ["Observation", "Evidence ·", "Follow-up", "Corrective Action", "Why no Action", "Horizontal Deployment", "LinkedRecord"]) expect(detail).toContain(label);
    expect(detail).toContain("observation.evidence.length > 0");
    expect(detail).toContain('observation.type !== "Positive"');
  });
});
