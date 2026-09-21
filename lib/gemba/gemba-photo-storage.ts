"use client";

/**
 * Small IndexedDB-backed store for Gemba photo evidence binary.
 *
 * Structured Gemba data (walks/observations) stays in localStorage via
 * features/gemba/gemba-store.ts — only the photo Blob itself lives here, so
 * localStorage never has to hold base64/data-URL image payloads again.
 *
 * One shared database ("ops-local-assets") so future asset stores can be
 * added as additional object stores without a new database per feature.
 */

const DB_NAME = "ops-local-assets";
const DB_VERSION = 1;
const STORE_NAME = "gemba-photos";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isGembaPhotoStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isGembaPhotoStorageAvailable()) {
    return Promise.reject(new Error("Local photo storage is not available in this browser."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Unable to open the local photo database."));
      };
    });
  }
  return dbPromise;
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Local photo storage operation failed."));
      })
  );
}

/** Persists a photo Blob under `key`. Throws on failure — callers must not record an evidence reference unless this resolves. */
export async function saveGembaPhoto(key: string, blob: Blob): Promise<void> {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(blob, key));
}

export async function getGembaPhoto(key: string): Promise<Blob | undefined> {
  const result = await withStore<Blob | undefined>("readonly", (store) => store.get(key));
  return result ?? undefined;
}

export async function deleteGembaPhoto(key: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(key));
}

export async function hasGembaPhoto(key: string): Promise<boolean> {
  return Boolean(await getGembaPhoto(key));
}

/** Converts a legacy embedded `data:image/...;base64,...` payload into a Blob, for one-time migration. Returns null for malformed input rather than throwing. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: match[1] });
  } catch {
    return null;
  }
}
