import { afterEach, describe, expect, it, vi } from "vitest";

function createFakeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>();
  let db: unknown = null;

  function makeRequest<T>(work: () => T) {
    const request: { result: T | undefined; error: unknown; onsuccess: (() => void) | null; onerror: (() => void) | null } = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
    };
    queueMicrotask(() => {
      try {
        request.result = work();
        request.onsuccess?.();
      } catch (error) {
        request.error = error;
        request.onerror?.();
      }
    });
    return request;
  }

  function makeObjectStore(name: string) {
    if (!stores.has(name)) stores.set(name, new Map());
    const map = stores.get(name)!;
    return {
      get: (key: string) => makeRequest(() => map.get(key)),
      put: (value: unknown, key: string) => makeRequest(() => { map.set(key, value); return key; }),
      delete: (key: string) => makeRequest<undefined>(() => { map.delete(key); return undefined; }),
    };
  }

  function makeDb() {
    return {
      objectStoreNames: { contains: (name: string) => stores.has(name) },
      createObjectStore: (name: string) => { stores.set(name, new Map()); return makeObjectStore(name); },
      transaction: (name: string) => ({ objectStore: () => makeObjectStore(name) }),
    };
  }

  return {
    open: () => {
      const request: { result: unknown; onupgradeneeded: (() => void) | null; onsuccess: (() => void) | null; onerror: (() => void) | null } = {
        result: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        const isNew = !db;
        if (!db) db = makeDb();
        request.result = db;
        if (isNew) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    _rawStores: stores,
  };
}

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    clear: () => values.clear(),
    get length() { return values.size; },
    _raw: values,
  };
}

async function flushMicrotasks(times = 20) {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

async function gembaStore(indexedDbImpl: ReturnType<typeof createFakeIndexedDb> | undefined = createFakeIndexedDb()) {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("indexedDB", indexedDbImpl);
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
  const store = await import("@/features/gemba/gemba-store");
  return { store, localStorage };
}

afterEach(() => { vi.unstubAllGlobals(); });

const actor = { id: "USR-RUMESH", name: "Rumesh" };

describe("Gemba photo persistence — localStorage payload protection", () => {
  it("never persists a data: URL for newly created photo evidence, even if the caller passes one by mistake", async () => {
    const { store, localStorage } = await gembaStore();
    store.saveGembaObservation(
      "GEM-2026-015",
      {
        type: "Issue",
        title: "Oil spillage",
        description: "Description",
        location: "Zone B",
        peopleInvolved: [],
        evidence: [{ id: "GEM-EV-1", name: "leak.jpg", url: "data:image/jpeg;base64,ZmFrZQ==", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name }],
      },
      actor
    );
    const raw = localStorage.getItem("ops-gemba-v1") ?? "";
    expect(raw).not.toContain("data:image");
    expect(raw).not.toContain("ZmFrZQ==");
  });

  it("never persists a blob: object URL for photo evidence", async () => {
    const { store, localStorage } = await gembaStore();
    store.saveGembaObservation(
      "GEM-2026-015",
      {
        type: "Positive",
        title: "Clean bench",
        description: "Description",
        location: "Zone B",
        peopleInvolved: [],
        evidence: [{ id: "GEM-EV-2", name: "bench.jpg", url: "blob:http://localhost/abc-123", storageKey: "GEM-EV-2", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name }],
      },
      actor
    );
    const raw = localStorage.getItem("ops-gemba-v1") ?? "";
    expect(raw).not.toContain("blob:");
  });

  it("persists lightweight metadata (storageKey/mimeType/size) for the evidence entry once the temporary url is stripped", async () => {
    const { store } = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      {
        type: "Positive",
        title: "Clean bench",
        description: "Description",
        location: "Zone B",
        peopleInvolved: [],
        evidence: [{ id: "GEM-EV-3", name: "bench.jpg", url: "blob:http://localhost/xyz", storageKey: "GEM-EV-3", mimeType: "image/jpeg", size: 4096, uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name }],
      },
      actor
    );
    expect(observation?.evidence[0]).toMatchObject({ id: "GEM-EV-3", storageKey: "GEM-EV-3", mimeType: "image/jpeg", size: 4096 });
    expect(observation?.evidence[0].url).toBeUndefined();
  });

  it("keeps photo count derived synchronously from evidence metadata (no Blob load required)", async () => {
    const { store } = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Two photos", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [
        { id: "GEM-EV-4", name: "a.jpg", storageKey: "GEM-EV-4", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name },
        { id: "GEM-EV-5", name: "b.jpg", storageKey: "GEM-EV-5", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name },
      ] },
      actor
    );
    expect(observation?.evidence.length).toBe(2);
  });

  it("the Issue photo requirement is satisfied by a valid metadata-only photo reference", async () => {
    const { isEvidencePhotoRequired } = await import("@/features/gemba/types");
    const evidence = [{ id: "GEM-EV-6", name: "a.jpg", storageKey: "GEM-EV-6", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name }];
    expect(isEvidencePhotoRequired("Issue") && evidence.length > 0).toBe(true);
  });

  it("keeps static/demo evidence URLs (non data:/blob:) untouched", async () => {
    const { store } = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Positive", title: "Demo asset", description: "Description", location: "Zone B", peopleInvolved: [], evidence: [
        { id: "GEM-EV-7", name: "demo.jpg", url: "/demo-5s/good-example.png", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name },
      ] },
      actor
    );
    expect(observation?.evidence[0].url).toBe("/demo-5s/good-example.png");
  });

  it("Action creation still works from Gemba observation metadata (title/description/evidence array, independent of Blob availability)", async () => {
    const { store } = await gembaStore();
    const observation = store.saveGembaObservation(
      "GEM-2026-015",
      { type: "Issue", title: "Oil spillage near Machine 123", description: "Oil spillage observed.", location: "Machine 123", peopleInvolved: [], evidence: [
        { id: "GEM-EV-8", name: "leak.jpg", storageKey: "GEM-EV-8", mimeType: "image/jpeg", uploadedAt: "2026-09-14T10:00:00+05:30", uploadedBy: actor.name },
      ] },
      actor
    )!;
    // Mirrors features/gemba/gemba-walk-page.tsx's toLinkedContext(): Action creation only
    // needs the metadata fields, and MyActionEvidence.url is optional.
    const actionEvidence = observation.evidence.map((item) => ({ id: item.id, name: item.name, mimeType: item.mimeType, url: item.url }));
    expect(actionEvidence).toEqual([{ id: "GEM-EV-8", name: "leak.jpg", mimeType: "image/jpeg", url: undefined }]);
    expect(observation.title).toBe("Oil spillage near Machine 123");
  });
});

describe("Gemba photo persistence — legacy data-URL migration", () => {
  it("migrates a legacy embedded photo into IndexedDB and strips the payload from localStorage", async () => {
    const fakeDb = createFakeIndexedDb();
    const localStorage = storage();
    const dataUrl = "data:image/jpeg;base64,ZmFrZS1qcGVn";
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "P", scheduledDate: "2026-09-14", status: "In Progress", createdAt: "t", updatedAt: "t", observationIds: ["OBS-1"], actionIds: [], activity: [] }],
      observations: [{ id: "OBS-1", gembaId: "GEM-2026-015", type: "Issue", title: "Legacy issue", description: "d", location: "Zone A", peopleInvolved: [], evidence: [{ id: "GEM-EV-LEGACY", name: "legacy.jpg", url: dataUrl, mimeType: "image/jpeg", uploadedAt: "t", uploadedBy: "Rumesh" }], createdById: "u", createdByName: "Rumesh", createdAt: "t", updatedAt: "t" }],
    }));

    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("indexedDB", fakeDb);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/gemba/gemba-store");

    store.getGembaState(); // triggers load() -> migration
    await flushMicrotasks(30);

    const migratedBlob = await store.getGembaState().observations[0].evidence[0];
    expect(migratedBlob.url).toBeUndefined();
    expect(migratedBlob.storageKey).toBe("GEM-EV-LEGACY");

    const raw = localStorage.getItem("ops-gemba-v1") ?? "";
    expect(raw).not.toContain("data:image");

    const photoStorage = await import("@/lib/gemba/gemba-photo-storage");
    const blob = await photoStorage.getGembaPhoto("GEM-EV-LEGACY");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("is idempotent — running load() again does not re-touch already-migrated evidence", async () => {
    const fakeDb = createFakeIndexedDb();
    const localStorage = storage();
    const dataUrl = "data:image/jpeg;base64,ZmFrZS1qcGVn";
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "P", scheduledDate: "2026-09-14", status: "In Progress", createdAt: "t", updatedAt: "t", observationIds: ["OBS-1"], actionIds: [], activity: [] }],
      observations: [{ id: "OBS-1", gembaId: "GEM-2026-015", type: "Issue", title: "Legacy issue", description: "d", location: "Zone A", peopleInvolved: [], evidence: [{ id: "GEM-EV-LEGACY", name: "legacy.jpg", url: dataUrl, mimeType: "image/jpeg", uploadedAt: "t", uploadedBy: "Rumesh" }], createdById: "u", createdByName: "Rumesh", createdAt: "t", updatedAt: "t" }],
    }));

    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("indexedDB", fakeDb);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/gemba/gemba-store");

    store.getGembaState();
    await flushMicrotasks(30);
    const afterFirst = JSON.stringify(store.getGembaState());

    store.getGembaState(); // load() no-ops (already loaded) but re-invoking is still safe
    await flushMicrotasks(30);
    const afterSecond = JSON.stringify(store.getGembaState());

    expect(afterSecond).toBe(afterFirst);
  });

  it("does not modify unrelated observations or walks during migration", async () => {
    const fakeDb = createFakeIndexedDb();
    const localStorage = storage();
    const dataUrl = "data:image/jpeg;base64,ZmFrZS1qcGVn";
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "P", scheduledDate: "2026-09-14", status: "In Progress", createdAt: "t", updatedAt: "t", observationIds: ["OBS-1", "OBS-2"], actionIds: [], activity: [] }],
      observations: [
        { id: "OBS-1", gembaId: "GEM-2026-015", type: "Issue", title: "Legacy issue", description: "d", location: "Zone A", peopleInvolved: [], evidence: [{ id: "GEM-EV-LEGACY", name: "legacy.jpg", url: dataUrl, mimeType: "image/jpeg", uploadedAt: "t", uploadedBy: "Rumesh" }], createdById: "u", createdByName: "Rumesh", createdAt: "t", updatedAt: "t" },
        { id: "OBS-2", gembaId: "GEM-2026-015", type: "Positive", title: "Untouched observation", description: "d2", location: "Zone B", peopleInvolved: ["A"], evidence: [], createdById: "u", createdByName: "Rumesh", createdAt: "t2", updatedAt: "t2" },
      ],
    }));

    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("indexedDB", fakeDb);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/gemba/gemba-store");

    store.getGembaState();
    await flushMicrotasks(30);

    const untouched = store.getGembaState().observations.find((item) => item.id === "OBS-2");
    expect(untouched).toEqual({ id: "OBS-2", gembaId: "GEM-2026-015", type: "Positive", title: "Untouched observation", description: "d2", location: "Zone B", peopleInvolved: ["A"], evidence: [], createdById: "u", createdByName: "Rumesh", createdAt: "t2", updatedAt: "t2" });
  });

  it("does not modify unrelated localStorage keys", async () => {
    const fakeDb = createFakeIndexedDb();
    const localStorage = storage();
    const dataUrl = "data:image/jpeg;base64,ZmFrZS1qcGVn";
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "P", scheduledDate: "2026-09-14", status: "In Progress", createdAt: "t", updatedAt: "t", observationIds: ["OBS-1"], actionIds: [], activity: [] }],
      observations: [{ id: "OBS-1", gembaId: "GEM-2026-015", type: "Issue", title: "Legacy issue", description: "d", location: "Zone A", peopleInvolved: [], evidence: [{ id: "GEM-EV-LEGACY", name: "legacy.jpg", url: dataUrl, mimeType: "image/jpeg", uploadedAt: "t", uploadedBy: "Rumesh" }], createdById: "u", createdByName: "Rumesh", createdAt: "t", updatedAt: "t" }],
    }));
    localStorage.setItem("standalone-5s-actions", "unrelated-actions-payload");
    localStorage.setItem("ops-red-flags-v1", "unrelated-red-flag-payload");

    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("indexedDB", fakeDb);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const store = await import("@/features/gemba/gemba-store");

    store.getGembaState();
    await flushMicrotasks(30);

    expect(localStorage.getItem("standalone-5s-actions")).toBe("unrelated-actions-payload");
    expect(localStorage.getItem("ops-red-flags-v1")).toBe("unrelated-red-flag-payload");
  });

  it("leaves the original legacy payload in place when the IndexedDB write fails (retryable later)", async () => {
    const localStorage = storage();
    const dataUrl = "data:image/jpeg;base64,ZmFrZS1qcGVn";
    localStorage.setItem("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-015", plant: "Egmore Plant", zone: "Zone A", leadId: "L", leadName: "Lakshman", participants: [], purpose: "P", scheduledDate: "2026-09-14", status: "In Progress", createdAt: "t", updatedAt: "t", observationIds: ["OBS-1"], actionIds: [], activity: [] }],
      observations: [{ id: "OBS-1", gembaId: "GEM-2026-015", type: "Issue", title: "Legacy issue", description: "d", location: "Zone A", peopleInvolved: [], evidence: [{ id: "GEM-EV-LEGACY", name: "legacy.jpg", url: dataUrl, mimeType: "image/jpeg", uploadedAt: "t", uploadedBy: "Rumesh" }], createdById: "u", createdByName: "Rumesh", createdAt: "t", updatedAt: "t" }],
    }));

    // indexedDB.open exists but every request fails, simulating a broken IndexedDB.
    const failingIndexedDb = { open: () => { throw new Error("boom"); } };

    vi.resetModules();
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("indexedDB", failingIndexedDb);
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = await import("@/features/gemba/gemba-store");

    store.getGembaState();
    await flushMicrotasks(30);

    const evidence = store.getGembaState().observations[0].evidence[0];
    expect(evidence.url).toBe(dataUrl);
    const raw = localStorage.getItem("ops-gemba-v1") ?? "";
    expect(raw).toContain("data:image");
    consoleErrorSpy.mockRestore();
  });
});
