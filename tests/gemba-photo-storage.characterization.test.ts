import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Minimal fake IndexedDB — just enough of the event-based IDBOpenDBRequest /
 * IDBObjectStore API surface that lib/gemba/gemba-photo-storage.ts uses
 * (open/onupgradeneeded, transaction/objectStore, get/put/delete). Vitest's
 * "node" test environment has no real IndexedDB, and the project has no
 * existing IndexedDB abstraction/test helper to reuse, so this is scoped
 * tightly to this one file rather than shipped as app code.
 */
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
  };
}

async function photoStorage() {
  vi.resetModules();
  vi.stubGlobal("indexedDB", createFakeIndexedDb());
  return import("@/lib/gemba/gemba-photo-storage");
}

beforeEach(() => { vi.stubGlobal("indexedDB", undefined); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("Gemba photo storage — IndexedDB abstraction", () => {
  it("saves and retrieves a photo Blob", async () => {
    const storage = await photoStorage();
    const blob = new Blob(["fake-jpeg-bytes"], { type: "image/jpeg" });
    await storage.saveGembaPhoto("GEM-EV-1", blob);
    const retrieved = await storage.getGembaPhoto("GEM-EV-1");
    expect(retrieved).toBeInstanceOf(Blob);
    expect(retrieved?.type).toBe("image/jpeg");
  });

  it("returns undefined for a photo that was never saved", async () => {
    const storage = await photoStorage();
    expect(await storage.getGembaPhoto("does-not-exist")).toBeUndefined();
  });

  it("deletes a saved photo", async () => {
    const storage = await photoStorage();
    const blob = new Blob(["fake"], { type: "image/jpeg" });
    await storage.saveGembaPhoto("GEM-EV-2", blob);
    expect(await storage.hasGembaPhoto("GEM-EV-2")).toBe(true);
    await storage.deleteGembaPhoto("GEM-EV-2");
    expect(await storage.hasGembaPhoto("GEM-EV-2")).toBe(false);
  });

  it("reports storage as unavailable when indexedDB does not exist, without throwing synchronously", async () => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    const storage = await import("@/lib/gemba/gemba-photo-storage");
    expect(storage.isGembaPhotoStorageAvailable()).toBe(false);
    await expect(storage.saveGembaPhoto("x", new Blob(["a"]))).rejects.toThrow();
  });

  it("converts a legacy base64 data URL into a Blob with the correct mime type", async () => {
    const storage = await photoStorage();
    const dataUrl = `data:image/png;base64,${Buffer.from("hello-world").toString("base64")}`;
    const blob = storage.dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe("image/png");
    const text = await blob!.text();
    expect(text).toBe("hello-world");
  });

  it("returns null for a malformed data URL instead of throwing", async () => {
    const storage = await photoStorage();
    expect(storage.dataUrlToBlob("not-a-data-url")).toBeNull();
    expect(storage.dataUrlToBlob("data:image/png,not-base64-encoded")).toBeNull();
  });
});
