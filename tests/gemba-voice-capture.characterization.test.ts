import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("Gemba Voice Capture — observation model integration", () => {
  it("saves a manual observation with no voice note exactly as before (voiceNote stays optional)", async () => {
    const store = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Manual issue", description: "Manual description", location: "Zone B", peopleInvolved: [], evidence: [] },
      actor
    );
    expect(observation).not.toBeNull();
    expect(observation?.voiceNote).toBeUndefined();
  });

  it("persists a voice note on the observation and logs a voice_note_added activity", async () => {
    const store = await gembaStore();
    const voiceNote = {
      id: "GEM-VOICE-1",
      durationSeconds: 27,
      mimeType: "audio/webm",
      transcript: "There are two pallets blocking the emergency exit.",
      audioUrl: "blob:session-local-url",
      createdAt: "2026-09-14T10:00:00+05:30",
      createdBy: actor.name,
    };
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Voice-captured issue", description: "Auto-generated description", location: "Zone B", peopleInvolved: [], evidence: [], voiceNote },
      actor
    );
    expect(observation?.voiceNote).toEqual(voiceNote);

    const walk = store.getGembaWalk("GEM-2026-015");
    expect(walk?.activity.some((event) => event.type === "voice_note_added" && event.observationId === observation?.id)).toBe(true);
  });

  it("does not re-log voice_note_added when editing an observation without changing its voice note", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-2", durationSeconds: 12, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const created = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Opportunity", title: "Move label stock", description: "Description", location: "Label Station", peopleInvolved: [], evidence: [], voiceNote },
      actor
    )!;
    store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Opportunity", title: "Move label stock (edited)", description: "Description", location: "Label Station", peopleInvolved: [], evidence: [], voiceNote },
      actor,
      created.id
    );
    const walk = store.getGembaWalk("GEM-2026-015");
    const voiceEvents = walk?.activity.filter((event) => event.type === "voice_note_added" && event.observationId === created.id) ?? [];
    expect(voiceEvents.length).toBe(1);
  });

  it("keeps Action creation/linking unaffected by voice-captured observations", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-3", durationSeconds: 18, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Voice issue for action", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [], voiceNote },
      actor
    )!;
    const linked = store.linkGembaAction("GEM-2026-015", observation.id, "ACT-TEST-VOICE-01", actor);
    expect(linked).toBe(true);
    const updated = store.getGembaObservations("GEM-2026-015").find((item) => item.id === observation.id);
    expect(updated?.actionId).toBe("ACT-TEST-VOICE-01");
    expect(updated?.voiceNote).toEqual(voiceNote);
  });
});

describe("Gemba Voice Capture — evidence + voice note coexistence (Add Observation enhancement)", () => {
  // Photo binary lives in IndexedDB (lib/gemba/gemba-photo-storage.ts); the observation only
  // ever holds this lightweight metadata/storageKey reference — never a data: URL.
  const photo = { id: "GEM-EV-1", name: "floor.jpg", storageKey: "GEM-EV-1", mimeType: "image/jpeg", size: 12345, uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name };

  it("saves a manual observation with a photo and no voice note", async () => {
    const store = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Manual issue with photo", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [photo] },
      actor
    );
    expect(observation?.evidence).toEqual([photo]);
    expect(observation?.voiceNote).toBeUndefined();
  });

  it("saves an observation with both a photo and a voice note together (voice + live/uploaded photo)", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-10", durationSeconds: 14, mimeType: "audio/webm", transcript: "Pallets are blocking the exit.", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Voice + photo issue", description: "Auto-generated description", location: "Zone B", peopleInvolved: [], evidence: [photo], voiceNote },
      actor
    );
    expect(observation?.evidence).toEqual([photo]);
    expect(observation?.voiceNote).toEqual(voiceNote);
  });

  it("removing the photo on edit does not remove the voice note", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-11", durationSeconds: 9, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const created = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Voice + photo, then removed", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [photo], voiceNote },
      actor
    )!;
    const updated = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: created.title, description: created.description, location: created.location, peopleInvolved: [], evidence: [], voiceNote: created.voiceNote },
      actor,
      created.id
    );
    expect(updated?.evidence).toEqual([]);
    expect(updated?.voiceNote).toEqual(voiceNote);
  });

  it("retaking/replacing the photo on edit does not remove the voice note", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-12", durationSeconds: 21, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const created = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Voice + photo, then retaken", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [photo], voiceNote },
      actor
    )!;
    const retaken = { ...photo, id: "GEM-EV-2", storageKey: "GEM-EV-2", name: "floor-retake.jpg" };
    const updated = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: created.title, description: created.description, location: created.location, peopleInvolved: [], evidence: [retaken], voiceNote: created.voiceNote },
      actor,
      created.id
    );
    expect(updated?.evidence).toEqual([retaken]);
    expect(updated?.voiceNote).toEqual(voiceNote);
  });

  it("adding a photo on edit does not overwrite the AI-generated title/description/location", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-13", durationSeconds: 16, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const created = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "AI generated title", description: "AI generated description", location: "AI generated location", peopleInvolved: [], evidence: [], voiceNote },
      actor
    )!;
    const updated = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: created.title, description: created.description, location: created.location, peopleInvolved: [], evidence: [photo], voiceNote: created.voiceNote },
      actor,
      created.id
    );
    expect(updated?.title).toBe("AI generated title");
    expect(updated?.description).toBe("AI generated description");
    expect(updated?.location).toBe("AI generated location");
    expect(updated?.evidence).toEqual([photo]);
  });

  it("editing the AI-generated fields does not remove existing evidence", async () => {
    const store = await gembaStore();
    const voiceNote = { id: "GEM-VOICE-14", durationSeconds: 8, mimeType: "audio/webm", createdAt: "2026-09-14T10:00:00+05:30", createdBy: actor.name };
    const created = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Original title", description: "Original description", location: "Zone B", peopleInvolved: [], evidence: [photo], voiceNote },
      actor
    )!;
    const updated = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "User-edited title", description: "User-edited description", location: created.location, peopleInvolved: [], evidence: created.evidence, voiceNote: created.voiceNote },
      actor,
      created.id
    );
    expect(updated?.title).toBe("User-edited title");
    expect(updated?.evidence).toEqual([photo]);
    expect(updated?.voiceNote).toEqual(voiceNote);
  });
});
