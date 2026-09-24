import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const gembaWalkPageSource = source("features/gemba/gemba-walk-page.tsx");
const createActionDialogSource = source("features/actions/create-linked-action-dialog.tsx");

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    clear: () => values.clear(),
    get length() { return values.size; },
  };
}

async function gembaStore() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
  return import("@/features/gemba/gemba-store");
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("Gemba dialog layout polish — Add Observation capture-method selector", () => {
  it("still offers exactly the two capture methods, Enter manually and Use voice", () => {
    expect(gembaWalkPageSource).toContain("Enter manually");
    expect(gembaWalkPageSource).toContain("Use voice");
    expect(gembaWalkPageSource).not.toMatch(/Take a photo instead|Scan document|Import from/i);
  });

  it("no longer renders the redundant Cancel footer on the initial choose screen, but keeps it for voice and form modes", () => {
    expect(gembaWalkPageSource).toMatch(/mode !== "choose" && <DialogFooter/);
  });

  it("keeps the canonical form's own Cancel / Save actions gated behind mode === \"form\"", () => {
    expect(gembaWalkPageSource).toContain('mode === "form" && <Button onClick={submit}');
    expect(gembaWalkPageSource).toContain("Save Observation");
  });

  it("keeps the dialog at the approved 1024px desktop width without going full-screen", () => {
    expect(gembaWalkPageSource).toContain("lg:max-w-[min(1024px,calc(100vw-64px))]");
  });

  it("keeps the Manual → canonical form and Voice → VoiceCaptureFlow → canonical form branching untouched", () => {
    expect(gembaWalkPageSource).toContain('onClick={() => setMode("form")}');
    expect(gembaWalkPageSource).toContain('onClick={() => setMode("voice")}');
    expect(gembaWalkPageSource).toContain("<VoiceCaptureFlow");
  });
});

describe("Gemba dialog layout polish — Create Action from Gemba", () => {
  it("widens the dialog toward the ~940–960px desktop target without going full-screen", () => {
    expect(createActionDialogSource).toContain("lg:max-w-[min(940px,calc(100vw-64px))]");
    expect(createActionDialogSource).not.toMatch(/w-screen|h-screen|inset-0(?!\s*isolate)/);
  });

  it("still renders every existing Action field with no field removed", () => {
    for (const label of ["Priority *", "Due Date", "Action Category *", "Action Owner *", "Zone Leader", "Assigned By"]) {
      expect(createActionDialogSource).toContain(label);
    }
  });

  it("keeps the source-context card read-only and visually distinct from editable fields", () => {
    expect(createActionDialogSource).toContain("Source context · read-only");
  });

  it("keeps derived/read-only fields (Due Date, Zone Leader, Assigned By) using the existing disabled Input treatment, not new logic", () => {
    expect(createActionDialogSource).toMatch(/label="Due Date" derived>*<Input type="date" value=\{dueDate\} disabled/);
    expect(createActionDialogSource).toMatch(/label="Zone Leader" derived>*<Input value=\{zone\?\.leader/);
    expect(createActionDialogSource).toMatch(/label="Assigned By" derived>*<Input value=\{currentUser\.name\} disabled/);
  });

  it("keeps Cancel and Create Action in the footer with unchanged enablement logic", () => {
    expect(createActionDialogSource).toContain("disabled={!context || !category || !responsibleId || busy}");
    expect(createActionDialogSource).toContain(">Cancel</Button>");
  });
});

describe("Gemba dialog layout polish — no change to underlying observation/action behavior", () => {
  const actor = { id: "USR-RUMESH", name: "Rumesh" };

  it("saveGembaObservation() still works exactly as before for a manual observation", async () => {
    const store = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Positive", title: "Layout regression check", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [] },
      actor
    );
    expect(observation).not.toBeNull();
    expect(observation?.title).toBe("Layout regression check");
  });

  it("the Issue photo-required rule is unaffected by this layout pass", async () => {
    const { isEvidencePhotoRequired } = await import("@/features/gemba/types");
    expect(isEvidencePhotoRequired("Issue")).toBe(true);
    expect(isEvidencePhotoRequired("Positive")).toBe(false);
  });
});
