/**
 * Canonical Gemba zone display labels.
 *
 * This is display metadata only — it does not change the canonical zone
 * IDs/names (`lib/organization-store.ts` / `lib/five-s/configuration.ts`),
 * which other modules (5S audits, Actions) already depend on. Gemba simply
 * renders a more descriptive area label next to the same zone name.
 */
const GEMBA_ZONE_AREA: Record<string, string> = {
  "Zone A": "Office",
  "Zone B": "Production",
  "Zone C": "Warehouse",
  "Zone D": "Utility",
};

/** Formats a zone name as "Zone A · Office" (or just the zone name if it has no known area). */
export function formatGembaZoneLabel(zone: string): string {
  const area = GEMBA_ZONE_AREA[zone];
  return area ? `${zone} · ${area}` : zone;
}
