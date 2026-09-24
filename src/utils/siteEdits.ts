/**
 * Bulk edits to already-imported sites from one CSV that can span counties:
 * corrected addresses, pins, room notes, sizes. Each row is matched to a
 * stored site by site ID, then by its current address, then by name; nothing
 * is added or removed. The admin export (with Site ID, Latitude, Longitude)
 * round-trips through here.
 */

import { findCounty } from '../config/texasCounties';
import { addressKey, labelKey } from './locationImport';
import { AUTO_MATCH_SCORE, matchCounty } from './turnoutMatch';
import type { LocationSize, PollingLocationSet, StoredLocation } from '../types';

export type EditColumnKey = 'county' | 'id' | 'name' | 'currentAddress' | 'address' | 'coordinates' | 'latitude' | 'longitude' | 'notes' | 'size';
export type EditColumnMap = Partial<Record<EditColumnKey, string>>;

export const EDIT_COLUMN_LABELS: Record<EditColumnKey, string> = {
  county: 'County',
  id: 'Site ID',
  name: 'Site name',
  currentAddress: 'Current address (to find the site)',
  address: 'New address',
  coordinates: 'New pin as "lat, lng"',
  latitude: 'New pin latitude',
  longitude: 'New pin longitude',
  notes: 'New room / location notes',
  size: 'New size (S/M/L)',
};

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Best guess at which header holds each field. */
export function guessEditColumns(headers: string[]): EditColumnMap {
  const map: EditColumnMap = {};
  const find = (test: (h: string) => boolean) => headers.find((h) => test(norm(h)));
  map.county = find((h) => h === 'county' || h === 'county name');
  map.id = find((h) => h === 'id' || h === 'site id' || h === 'location id');
  map.name = find((h) => ['location name', 'site name', 'name', 'site', 'polling place', 'location'].includes(h));
  const isAddr = (h: string) => h.includes('address');
  map.currentAddress = find((h) => isAddr(h) && /\b(tracker|current|old|existing|original)\b/.test(h));
  map.address = find((h) => isAddr(h) && /\b(corrected|new|fixed|updated|correct)\b/.test(h))
    ?? (map.currentAddress ? undefined : find((h) => h === 'address' || h === 'street address'));
  // A "lat, lng" column pasted from Google Maps wins over separate columns.
  map.coordinates = find((h) => /\b(coordinates|coords|lat lng|lat long|latlng|gps)\b/.test(h));
  if (!map.coordinates) {
    map.latitude = find((h) => h === 'latitude' || h === 'lat' || /\b(new|corrected|google)\b.*\blat(itude)?\b/.test(h));
    map.longitude = find((h) => h === 'longitude' || h === 'lng' || h === 'lon' || h === 'long' || /\b(new|corrected|google)\b.*\b(lng|lon|longitude)\b/.test(h));
  }
  map.notes = find((h) => ['notes', 'room', 'location notes', 'room notes', 'new notes'].includes(h));
  map.size = find((h) => h === 'size' || h === 'new size');
  return map;
}

export interface EditPlanRow {
  rowNumber: number;
  county: string;
  /** Name as written in the file, for display when unmatched. */
  fileName: string;
  site: StoredLocation | null;
  matchedBy: 'id' | 'address' | 'name' | 'similar name' | 'manual' | null;
  newAddress?: string;
  newNotes?: string;
  newSize?: LocationSize;
  /** A pin given directly in the file (used instead of geocoding). */
  newPin?: { latitude: number; longitude: number };
  /** Something wrong in the file itself (county, a non-address); can't be fixed here. */
  blocked?: string;
  /** Why this row won't be applied, if it won't (derived by checkRow). */
  problem?: string;
}

function parseSize(v: string): LocationSize | undefined {
  const s = v.trim().toUpperCase();
  if (s === 'S' || s.startsWith('SMALL')) return 'S';
  if (s === 'M' || s.startsWith('MED')) return 'M';
  if (s === 'L' || s.startsWith('LARGE')) return 'L';
  return undefined;
}

/**
 * "32.7767, -96.797" (as Google Maps copies it) or separate lat/lng cells →
 * a Texas point. Swapped values are put right; anything else is null.
 */
export function parsePin(latOrPair: string, lng?: string): { latitude: number; longitude: number } | null {
  let a: number;
  let b: number;
  if (lng === undefined) {
    // Also takes "29.7604° N, 95.3698° W".
    const nums = latOrPair.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length !== 2) return null;
    a = Number(nums[0]);
    b = Number(nums[1]);
    if (/w\s*$/i.test(latOrPair.trim()) && b > 0) b = -b;
  } else {
    a = Number(latOrPair.trim());
    b = Number(lng.trim());
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 0 && b > 0) [a, b] = [b, a];
  // Texas and a margin: rules out a stray 0, a typo, or a point overseas.
  if (a < 25 || a > 37 || b < -107.5 || b > -93) return null;
  return { latitude: a, longitude: b };
}

/** Pins closer than this (~1 m) count as unchanged, so an untouched export is a no-op. */
const SAME_PIN_DEGREES = 0.00001;

/** True when the row's pin from the file differs from the site's current pin. */
export function pinChanges(r: EditPlanRow): boolean {
  if (!r.site || !r.newPin) return false;
  return Math.abs(r.newPin.latitude - r.site.latitude) > SAME_PIN_DEGREES
    || Math.abs(r.newPin.longitude - r.site.longitude) > SAME_PIN_DEGREES;
}

/** A street address has a number and a word ("CHECK DALLAS COUNTY LIST" doesn't). */
export function looksLikeAddress(v: string): boolean {
  return /\d/.test(v) && /[a-z]{2,}/i.test(v);
}

/** True when the row's new address differs from the site's current one. */
export function addressChanges(r: EditPlanRow): boolean {
  return !!r.site && r.newAddress != null && r.newAddress.trim() !== r.site.address.trim();
}

/** True when a row would change something on its site. */
export function rowChanges(r: EditPlanRow): boolean {
  if (!r.site) return false;
  return addressChanges(r)
    || pinChanges(r)
    || (r.newNotes != null && r.newNotes !== (r.site.notes ?? ''))
    || (r.newSize != null && r.newSize !== r.site.size);
}

/** Recompute a row's problem after its site changes (e.g. a manual match). */
export function checkRow(r: EditPlanRow): EditPlanRow {
  let problem: string | undefined = r.blocked;
  if (!problem && !r.site) problem = 'No matching site in this county';
  if (!problem && !rowChanges(r)) {
    const hasValues = r.newAddress != null || r.newPin != null || r.newNotes != null || r.newSize != null;
    problem = hasValues ? 'Already up to date' : 'Nothing to change';
  }
  return { ...r, problem };
}

export function planEdits(
  rows: Record<string, string>[],
  columns: EditColumnMap,
  sets: PollingLocationSet[],
  allowedCounties: Set<string> | null,
): EditPlanRow[] {
  const get = (r: Record<string, string>, k: EditColumnKey) => (columns[k] ? (r[columns[k]!] ?? '').trim() : '');
  const out: EditPlanRow[] = [];

  rows.forEach((r, i) => {
    const rawCounty = get(r, 'county');
    const county = findCounty(rawCounty)?.name ?? rawCounty;
    const row: EditPlanRow = { rowNumber: i + 2, county, fileName: get(r, 'name'), site: null, matchedBy: null };

    const addr = get(r, 'address');
    if (addr) {
      if (looksLikeAddress(addr)) row.newAddress = addr;
      else row.blocked = `New address isn’t an address: “${addr}”`;
    }
    const pair = get(r, 'coordinates');
    const lat = get(r, 'latitude');
    const lng = get(r, 'longitude');
    if (pair || lat || lng) {
      const pin = pair ? parsePin(pair) : lat && lng ? parsePin(lat, lng) : null;
      if (pin) row.newPin = pin;
      else row.blocked = `Pin isn’t a Texas “lat, lng”: “${pair || `${lat}, ${lng}`}”`;
    }
    if (get(r, 'notes')) row.newNotes = get(r, 'notes');
    if (get(r, 'size')) row.newSize = parseSize(get(r, 'size'));

    const set = sets.find((s) => s.county === county);
    const countyProblem = !county ? 'County is blank'
      : allowedCounties && !allowedCounties.has(county) ? `${county} isn’t one of your counties`
      : !set ? `${county} County has no sites imported`
      : null;
    if (countyProblem) {
      out.push({ ...row, blocked: countyProblem, problem: countyProblem });
      return;
    }

    const sites = set!.locations ?? [];
    const id = get(r, 'id');
    const cur = get(r, 'currentAddress');
    const name = get(r, 'name');
    let site: StoredLocation | undefined;
    if (id) {
      site = sites.find((s) => s.id === id);
      if (site) row.matchedBy = 'id';
    }
    if (!site && cur) {
      const hits = sites.filter((s) => addressKey(s.address) === addressKey(cur));
      // Two sites at one address (EV-only and ED-only rooms): the name decides.
      site = hits.length > 1 && name ? hits.find((s) => labelKey(s.label) === labelKey(name)) ?? hits[0] : hits[0];
      if (site) row.matchedBy = 'address';
    }
    if (!site && name) {
      site = sites.find((s) => labelKey(s.label) === labelKey(name));
      if (site) row.matchedBy = 'name';
    }
    if (!site && name) {
      const m = matchCounty(sites, [{ site: name }], county);
      const best = [...m.entries()].find(([, v]) => v.score >= AUTO_MATCH_SCORE);
      if (best) {
        site = sites.find((s) => s.id === best[0]);
        row.matchedBy = 'similar name';
      }
    }
    row.site = site ?? null;
    out.push(checkRow(row));
  });
  return flagDuplicates(out);
}

/** A second row editing the same site would silently overwrite the first. */
export function flagDuplicates(rows: EditPlanRow[]): EditPlanRow[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    if (!r.site || r.problem) return r;
    const first = seen.get(r.site.id);
    if (first != null) return { ...r, problem: `Same site as row ${first}` };
    seen.set(r.site.id, r.rowNumber);
    return r;
  });
}
