import { afterEach, describe, expect, it, vi } from "vitest";

import { isEvidencePhotoRequired } from "@/features/gemba/types";

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

const actor = { id: "USR-RUMESH", name: "Rumesh" };
// Photo binary lives in IndexedDB (lib/gemba/gemba-photo-storage.ts); the observation only
// ever holds this lightweight metadata/storageKey reference — never a data: URL.
const photo = { id: "GEM-EV-1", name: "floor.jpg", storageKey: "GEM-EV-1", mimeType: "image/jpeg", size: 12345, uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name };

describe("Gemba Add Observation simplification — photo-required-for-Issue rule", () => {
  it("does not require a photo for Positive", () => {
    expect(isEvidencePhotoRequired("Positive")).toBe(false);
  });

  it("does not require a photo for Opportunity", () => {
    expect(isEvidencePhotoRequired("Opportunity")).toBe(false);
  });

  it("requires a photo for Issue", () => {
    expect(isEvidencePhotoRequired("Issue")).toBe(true);
  });

  it("reacts to the final selected type, not an earlier classification — Issue reclassified to Opportunity no longer requires a photo", () => {
    // Simulates: Voice AI classifies as Issue, user then changes the type in the canonical form.
    const finalType: "Positive" | "Opportunity" | "Issue" = "Opportunity";
    expect(isEvidencePhotoRequired(finalType)).toBe(false);
  });

  it("reacts to the final selected type — Opportunity reclassified to Issue requires a photo", () => {
    const finalType: "Positive" | "Opportunity" | "Issue" = "Issue";
    expect(isEvidencePhotoRequired(finalType)).toBe(true);
  });
});

describe("Gemba Add Observation simplification — canonical save path for both entry methods", () => {
  it("a Positive observation persists without evidence via the same saveGembaObservation() call manual entry uses", async () => {
    const store = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Positive", title: "Clean workstation", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [] },
      actor
    );
    expect(observation).not.toBeNull();
  });

  it("an Issue observation created with a photo (simulating either Take Photo or Upload Photo) persists via saveGembaObservation()", async () => {
    const store = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Oil spillage near Machine 123", description: "Oil spillage observed near Machine 123.", location: "Machine 123", peopleInvolved: [], evidence: [photo] },
      actor
    );
    expect(observation?.evidence).toEqual([photo]);
  });

  it("a voice-originated Issue observation (AI-extracted fields + voice note + a photo) persists through the exact same store function as manual entry", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-20", durationSeconds: 14, mimeType: "audio/webm", transcript: "There is oil spillage near Machine 123. This is an issue.", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Oil spillage near Machine 123", description: "Oil spillage observed near Machine 123.", location: "Machine 123", peopleInvolved: [], evidence: [photo], voiceNote },
      actor
    );
    expect(observation?.type).toBe("Issue");
    expect(observation?.title).toBe("Oil spillage near Machine 123");
    expect(observation?.location).toBe("Machine 123");
    expect(observation?.voiceNote).toEqual(voiceNote);
    expect(observation?.evidence).toEqual([photo]);
  });

  it("an extraction-failure voice observation still saves with the transcript preserved as the description and no other AI fields fabricated", async () => {
    const store = await gembaStore();
    const transcript = "There is oil spillage near Machine 123. This is an issue.";
    const voiceNote = { id: "GEM-VOICE-21", durationSeconds: 11, mimeType: "audio/webm", transcript, createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    // Mirrors VoiceCaptureFlow's extraction-failure fallback: description = transcript, type/title/location left for the user to fill manually.
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Positive", title: "Untitled observation", description: transcript, location: "Zone B", peopleInvolved: [], evidence: [], voiceNote },
      actor
    );
    expect(observation?.description).toBe(transcript);
    expect(observation?.voiceNote?.transcript).toBe(transcript);
  });
});
