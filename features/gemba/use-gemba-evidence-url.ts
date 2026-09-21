"use client";

import { useEffect, useState } from "react";

import { getGembaPhoto } from "@/lib/gemba/gemba-photo-storage";
import type { GembaEvidence } from "./types";

/**
 * Resolves a displayable URL for one piece of Gemba photo evidence.
 *
 * - If `evidence.url` is already set (a static/demo asset, or a session-local
 *   preview/object URL for a just-added photo), it is used directly — no
 *   IndexedDB round-trip needed.
 * - Otherwise, if `evidence.storageKey` is set (the normal case once the
 *   observation has round-tripped through localStorage), the Blob is loaded
 *   from IndexedDB asynchronously and turned into an object URL, which is
 *   revoked when the evidence changes or the component unmounts.
 */
export function useGembaEvidenceUrl(evidence: GembaEvidence | null | undefined): string | undefined {
  const directUrl = evidence?.url;
  const storageKey = evidence?.storageKey;
  const [asyncUrl, setAsyncUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (directUrl || !storageKey) return;

    let cancelled = false;
    let objectUrl: string | undefined;

    getGembaPhoto(storageKey)
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setAsyncUrl(objectUrl);
      })
      .catch((error) => {
        console.error(`[gemba] unable to load photo evidence ${storageKey}`, error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directUrl, storageKey]);

  return directUrl ?? asyncUrl;
}
