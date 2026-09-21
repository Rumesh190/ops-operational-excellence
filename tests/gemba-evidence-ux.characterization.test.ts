import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const walkSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-walk-page.tsx"), "utf8");
const componentsSource = readFileSync(resolve(process.cwd(), "features/gemba/gemba-components.tsx"), "utf8");

describe("Gemba Phase 2A evidence UX", () => {
  it("keeps separate camera and upload inputs with the correct native hints", () => {
    expect(walkSource).toMatch(/ref=\{cameraRef\}[^>]*accept="image\/\*"[^>]*capture="environment"/);
    expect(walkSource).toMatch(/ref=\{uploadRef\}[^>]*accept="image\/\*"[^>]*multiple/);
    expect(walkSource).not.toMatch(/ref=\{uploadRef\}[^>]*capture=/);
  });

  it("offers View, Replace, and Remove for each attached photo and reuses the shared lightbox", () => {
    expect(walkSource).toContain(">View</button>");
    expect(walkSource).toContain(">Replace</button>");
    expect(walkSource).toContain(">Remove</button>");
    expect(walkSource).toContain("<GembaEvidenceLightbox evidence={previewEvidence}");
    expect(componentsSource).toContain("export function GembaEvidenceLightbox");
    expect(componentsSource).toContain("<OpsEvidenceViewer");
  });

  it("persists a replacement before deleting the prior IndexedDB asset", () => {
    const replacement = walkSource.slice(walkSource.indexOf("async function replaceEvidence"), walkSource.indexOf("function beginReplace"));
    expect(replacement.indexOf("await storeEvidenceFile(file, item.note)")).toBeGreaterThan(-1);
    expect(replacement.indexOf("await deleteEvidenceAsset(item)")).toBeGreaterThan(replacement.indexOf("await storeEvidenceFile(file, item.note)"));
  });

  it("rolls back a failed replacement and preserves the existing evidence state", () => {
    const replacement = walkSource.slice(walkSource.indexOf("async function replaceEvidence"), walkSource.indexOf("function beginReplace"));
    expect(replacement).toContain("await deleteGembaPhoto(replacement.storageKey)");
    expect(replacement).toContain("The existing photo remains attached.");
    expect(replacement).not.toContain("setEvidence((items) => items.filter");
  });

  it("cleans removed assets and retains Issue validation after the only photo is removed", () => {
    expect(walkSource).toContain("await deleteEvidenceAsset(item)");
    expect(walkSource).toContain("items.filter((candidate) => candidate.id !== item.id)");
    expect(walkSource).toContain("isEvidencePhotoRequired(type) && evidence.length === 0");
    expect(walkSource).toContain("Photo evidence is required for an Issue");
  });
});
