/**
 * CSV → polling locations for one county.
 *
 * Counties publish EV and election-day site lists in all kinds of shapes, so
 * import is: parse → auto-map columns (admin can override) → match each row
 * to an existing site in that county (by normalized street address, then by
 * normalized site name) → geocode only the rows that need it → merge.
 *
 * Matching matters: a site keeps its ID across re-uploads and across the EV
 * and election-day lists, so volunteer claims stay attached when a county
 * republishes its list or when the ED list arrives after the EV list.
 */

import Papa from 'papaparse';
import { shortHash } from './hash';
import { countySlug } from '../config/texasCounties';
import type { LocationSize, StoredLocation } from '../types';

export type ListKind = 'ev' | 'ed';

export type ColumnKey = 'name' | 'address' | 'city' | 'zip' | 'latitude' | 'longitude' | 'size' | 'evTotal';

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Site name',
  address: 'Street address',
  city: 'City',
  zip: 'ZIP',
  latitude: 'Latitude',
  longitude: 'Longitude',
  size: 'Size (S/M/L)',
  evTotal: 'Turnout / EV total',
};

export type ColumnMap = Partial<Record<ColumnKey, string>>;

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  name: ['name', 'site name', 'location name', 'polling place', 'polling location', 'polling place name', 'location', 'site', 'facility', 'facility name', 'place', 'vote center', 'building'],
  address: ['address', 'street address', 'address 1', 'address1', 'street', 'location address', 'site address', 'polling address', 'physical address'],
  city: ['city', 'town', 'municipality'],
  zip: ['zip', 'zip code', 'zipcode', 'postal code', 'zip5'],
  latitude: ['latitude', 'lat', 'y'],
  longitude: ['longitude', 'lng', 'lon', 'long', 'x'],
  size: ['size', 'tier', 'priority'],
  evTotal: ['ev total', 'evtotal', 'turnout', 'total votes', 'ballots', 'votes', 'dem ballots'],
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h !== '');
  return { headers, rows: result.data };
}

/** Best-guess mapping from our fields to the CSV's headers. */
export function guessColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<string>();
  const normalized = headers.map((h) => ({ raw: h, norm: normHeader(h) }));
  // Exact alias matches first, then "header contains alias", so e.g. a
  // "Polling Place Address" column goes to address rather than name.
  for (const pass of ['exact', 'contains'] as const) {
    for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if (map[key]) continue;
      for (const alias of HEADER_ALIASES[key]) {
        const hit = normalized.find((h) =>
          !used.has(h.raw) && (pass === 'exact' ? h.norm === alias : alias.length > 3 && h.norm.includes(alias)),
        );
        if (hit) {
          map[key] = hit.raw;
          used.add(hit.raw);
          break;
        }
      }
    }
  }
  return map;
}

export interface ImportRow {
  rowNumber: number;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  size?: LocationSize;
  evTotal?: number;
}

function parseSize(v: string | undefined): LocationSize | undefined {
  const s = (v ?? '').trim().toUpperCase();
  if (s === 'S' || s.startsWith('SMALL')) return 'S';
  if (s === 'M' || s.startsWith('MED')) return 'M';
  if (s === 'L' || s.startsWith('LARGE')) return 'L';
  return undefined;
}

function parseNum(v: string | undefined): number | undefined {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Turn mapped CSV rows into import rows. Builds a full one-line address
 * ("street, city, TX zip") from whichever parts the county provided. Rows
 * without a name or address are dropped and reported by row number.
 */
export function toImportRows(
  parsed: ParsedCsv,
  columns: ColumnMap,
): { rows: ImportRow[]; skipped: number[] } {
  const rows: ImportRow[] = [];
  const skipped: number[] = [];
  parsed.rows.forEach((r, i) => {
    const get = (k: ColumnKey) => (columns[k] ? (r[columns[k]!] ?? '').trim() : '');
    const label = get('name').replace(/\s+/g, ' ');
    let street = get('address').replace(/\s+/g, ' ');
    const city = get('city');
    const zip = get('zip');
    if (!label || !street) {
      // Header row is row 1, so data rows start at 2 in spreadsheet terms.
      skipped.push(i + 2);
      return;
    }
    const lower = street.toLowerCase();
    if (city && !lower.includes(city.toLowerCase())) street += `, ${city}`;
    if (!/\btx\b|\btexas\b/i.test(street)) street += ', TX';
    if (zip && !street.includes(zip)) street += ` ${zip}`;
    const lat = parseNum(get('latitude'));
    const lng = parseNum(get('longitude'));
    const hasCoords = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat !== 0;
    rows.push({
      rowNumber: i + 2,
      label,
      address: street,
      latitude: hasCoords ? lat : undefined,
      longitude: hasCoords ? lng : undefined,
      size: parseSize(get('size')),
      evTotal: parseNum(get('evTotal')),
    });
  });
  return { rows, skipped };
}

// --- Normalization -------------------------------------------------------

const STREET_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bstreet\b/g, 'st'], [/\bavenue\b/g, 'ave'], [/\broad\b/g, 'rd'], [/\bdrive\b/g, 'dr'],
  [/\bboulevard\b/g, 'blvd'], [/\bparkway\b/g, 'pkwy'], [/\bhighway\b/g, 'hwy'], [/\blane\b/g, 'ln'],
  [/\bcourt\b/g, 'ct'], [/\bfreeway\b/g, 'fwy'], [/\bexpressway\b/g, 'expy'], [/\bplace\b/g, 'pl'],
  [/\bcircle\b/g, 'cir'], [/\btrail\b/g, 'trl'], [/\bnorth\b/g, 'n'], [/\bsouth\b/g, 's'],
  [/\beast\b/g, 'e'], [/\bwest\b/g, 'w'], [/\bfarm to market\b/g, 'fm'], [/\bfarm road\b/g, 'fm'],
];

/**
 * Street + city key, e.g. "901 N Polk Street, Suite 2, DeSoto, TX 75115" →
 * "901 n polk st|desoto". Suites/rooms are dropped since counties are
 * inconsistent about including them.
 */
export function addressKey(address: string): string {
  const parts = address.toLowerCase().split(',').map((p) => p.trim()).filter(Boolean);
  const isUnit = (p: string) => /^(suite|ste|unit|room|rm|bldg|building|#)\b/.test(p) || p.startsWith('#');
  const streetParts = parts.filter((p) => !isUnit(p));
  let street = (streetParts[0] ?? '')
    .replace(/\s(suite|ste|unit|room|rm|bldg|building|#)\s*\S+$/, '')
    .replace(/[.#]/g, '');
  for (const [re, abbr] of STREET_ABBREVIATIONS) street = street.replace(re, abbr);
  street = street.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const city = (streetParts[1] ?? '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  return `${street}|${city}`;
}

/** Site-name key: lowercase, punctuation stripped, common abbreviations expanded. */
export function labelKey(label: string): string {
  let s = label.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  s = s
    .replace(/\bassoc\b/g, 'association')
    .replace(/\bcomm\b/g, 'community')
    .replace(/\bctr\b/g, 'center')
    .replace(/\bctrs\b/g, 'centers')
    .replace(/\belem\b/g, 'elementary')
    .replace(/\bhs\b/g, 'high school')
    .replace(/\bms\b/g, 'middle school')
    .replace(/\blib\b/g, 'library')
    .replace(/\brec\b/g, 'recreation')
    .replace(/\bch\b/g, 'church');
  s = s.replace(/\b(in|at|of the|the)\b/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

// --- Planning & merge ----------------------------------------------------

export interface PlannedRow extends ImportRow {
  /** Existing site this row matched, if any. */
  matchedId: string | null;
  /** How it matched — shown in the preview so admins can sanity-check. */
  matchedBy: 'address' | 'name' | null;
  needsGeocode: boolean;
}

export interface ImportPlan {
  rows: PlannedRow[];
  /** Existing sites on this list that no row matched (they'll leave this list). */
  dropped: StoredLocation[];
}

export function planImport(existing: StoredLocation[], rows: ImportRow[], kind: ListKind): ImportPlan {
  const byAddress = new Map<string, StoredLocation>();
  const byLabel = new Map<string, StoredLocation>();
  for (const loc of existing) {
    byAddress.set(addressKey(loc.address), loc);
    byLabel.set(labelKey(loc.label), loc);
  }
  const usedIds = new Set<string>();
  const planned: PlannedRow[] = rows.map((row) => {
    let match: StoredLocation | undefined;
    let matchedBy: PlannedRow['matchedBy'] = null;
    const a = byAddress.get(addressKey(row.address));
    if (a && !usedIds.has(a.id)) {
      match = a;
      matchedBy = 'address';
    } else {
      const l = byLabel.get(labelKey(row.label));
      if (l && !usedIds.has(l.id)) {
        match = l;
        matchedBy = 'name';
      }
    }
    if (match) usedIds.add(match.id);
    const hasCoords = row.latitude != null && row.longitude != null;
    // Reuse the stored coordinates when the address is unchanged, which saves
    // geocoding calls on re-uploads and preserves manual pin corrections.
    const reuseCoords = !!match && matchedBy === 'address';
    return {
      ...row,
      latitude: hasCoords ? row.latitude : reuseCoords ? match!.latitude : undefined,
      longitude: hasCoords ? row.longitude : reuseCoords ? match!.longitude : undefined,
      matchedId: match?.id ?? null,
      matchedBy,
      needsGeocode: !hasCoords && !reuseCoords,
    };
  });
  const dropped = existing.filter((l) => l[kind] && !usedIds.has(l.id));
  return { rows: planned, dropped };
}

/**
 * Produce the county's new full location list. Rows without coordinates are
 * skipped (the caller surfaces them). Sites on the *other* list are kept
 * untouched; sites on neither list afterwards are removed.
 */
export function applyImport(
  existing: StoredLocation[],
  rows: PlannedRow[],
  kind: ListKind,
  county: string,
): StoredLocation[] {
  const next = new Map<string, StoredLocation>();
  for (const loc of existing) next.set(loc.id, { ...loc, [kind]: false });
  const slug = countySlug(county);
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    if (row.matchedId && next.has(row.matchedId)) {
      const prev = next.get(row.matchedId)!;
      next.set(row.matchedId, {
        ...prev,
        label: row.label,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        [kind]: true,
        size: row.size ?? prev.size,
        evTotal: row.evTotal ?? prev.evTotal,
      });
      continue;
    }
    let id = `${slug}-${shortHash(addressKey(row.address))}`;
    for (let n = 2; next.has(id); n++) id = `${slug}-${shortHash(addressKey(row.address))}-${n}`;
    next.set(id, {
      id,
      label: row.label,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      ev: kind === 'ev',
      ed: kind === 'ed',
      size: row.size,
      evTotal: row.evTotal,
    });
  }
  return [...next.values()].filter((l) => l.ev || l.ed);
}

/** True when the point sits inside the county's bounding box (padded ~3 mi). */
export function withinCountyBBox(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
  pad = 0.05,
): boolean {
  const [w, s, e, n] = bbox;
  return lng >= w - pad && lng <= e + pad && lat >= s - pad && lat <= n + pad;
}

/** Downloadable template so county volunteers know the expected columns. */
export const CSV_TEMPLATE = [
  'Name,Address,City,Zip,Latitude,Longitude,Size',
  'Oak Lawn Branch Library,4100 Cedar Springs Rd,Dallas,75219,,,L',
  'Friendship West Baptist Church,2020 W Wheatland Rd,Dallas,75232,,,M',
].join('\n');
