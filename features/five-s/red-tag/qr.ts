export function getRedTagRecordPath(tagId: string) {
  return `/5s/red/${encodeURIComponent(tagId)}`;
}

/**
 * Uses the active application origin for a physically scannable URL. The
 * relative path fallback keeps server rendering and legacy in-app usage safe.
 */
export function getRedTagQrTarget(tagId: string, origin?: string) {
  const path = getRedTagRecordPath(tagId);
  if (!origin) return path;
  try { return new URL(path, origin).toString(); } catch { return path; }
}
