import {
  collection, doc, onSnapshot, query, where, deleteDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { countySlug } from '../config/texasCounties';
import type { LocationNotesPatch, PollingLocationSet, StoredLocation, TurnoutPatch } from '../types';

const COLLECTION = 'pollingLocationSets';

function setDocId(campaignId: string, county: string): string {
  return `${campaignId}__${countySlug(county)}`;
}

export function subscribeToLocationSets(
  campaignId: string,
  callback: (sets: PollingLocationSet[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PollingLocationSet)));
    },
    (err) => {
      console.error('Polling locations subscription error:', err);
      if (onError) onError(err);
    },
  );
}

// Firestore rejects undefined field values, so strip optional keys that
// aren't set rather than writing `size: undefined`.
function cleanLocation(l: StoredLocation): StoredLocation {
  const out: StoredLocation = {
    id: l.id,
    label: l.label,
    address: l.address,
    latitude: l.latitude,
    longitude: l.longitude,
    ev: l.ev,
    ed: l.ed,
  };
  if (l.size) out.size = l.size;
  if (typeof l.evTotal === 'number') out.evTotal = l.evTotal;
  if (typeof l.evDem === 'number') out.evDem = l.evDem;
  if (typeof l.evRep === 'number') out.evRep = l.evRep;
  if (l.evEstimated) out.evEstimated = true;
  if (l.notes) out.notes = l.notes;
  if (l.tip) {
    out.tip = l.tip;
    if (l.tipBy) out.tipBy = l.tipBy;
    if (typeof l.tipAt === 'number') out.tipAt = l.tipAt;
  }
  return out;
}

/**
 * Replace a county's full location list. `listKind` records which list (early
 * voting or election day) the admin just uploaded, for the "last updated" display.
 */
export async function saveCountyLocations(
  campaignId: string,
  county: string,
  locations: StoredLocation[],
  listKind: 'ev' | 'ed',
  updatedBy: string,
): Promise<void> {
  const ref = doc(db, COLLECTION, setDocId(campaignId, county));
  await runTransaction(db, async (tx) => {
    // The import was planned against a snapshot that may be minutes old, so
    // carry over notes and tips saved since then instead of dropping them.
    const snap = await tx.get(ref);
    const current = new Map<string, StoredLocation>(
      ((snap.data()?.locations ?? []) as StoredLocation[]).map((l) => [l.id, l]),
    );
    const merged = locations.map((l) => {
      const prev = current.get(l.id);
      if (!prev) return cleanLocation(l);
      return cleanLocation({
        ...l,
        notes: l.notes || prev.notes,
        ...(l.tip ? {} : { tip: prev.tip, tipBy: prev.tipBy, tipAt: prev.tipAt }),
      });
    });
    tx.set(
      ref,
      {
        campaignId,
        county,
        locations: merged,
        [listKind === 'ev' ? 'evUpdatedAt' : 'edUpdatedAt']: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy,
      },
      { merge: true },
    );
  });
}

/**
 * Update the notes and/or volunteer tip on one site. Sites live in an array
 * inside the county doc, so this rewrites the array in a transaction to avoid
 * clobbering a concurrent edit to a different site. Empty strings clear.
 */
export async function updateLocationNotes(
  campaignId: string,
  county: string,
  locationId: string,
  patch: LocationNotesPatch,
): Promise<void> {
  const ref = doc(db, COLLECTION, setDocId(campaignId, county));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`No locations saved for ${county} County`);
    const locations = (snap.data().locations ?? []) as StoredLocation[];
    const i = locations.findIndex((l) => l.id === locationId);
    if (i === -1) throw new Error('That site is no longer on the county list');
    const next = [...locations];
    next[i] = cleanLocation({ ...locations[i], ...patch });
    tx.update(ref, { locations: next, updatedAt: serverTimestamp() });
  });
}

/**
 * Change fields on some of a county's sites without touching the site list
 * itself. A key set to undefined in a patch clears that field. Ids no longer
 * on the list are skipped. Returns how many sites were updated.
 */
export async function patchCountySites(
  campaignId: string,
  county: string,
  patches: Map<string, Partial<Omit<StoredLocation, 'id'>>>,
  updatedBy: string,
): Promise<number> {
  const ref = doc(db, COLLECTION, setDocId(campaignId, county));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`No locations saved for ${county} County`);
    const locations = (snap.data().locations ?? []) as StoredLocation[];
    let changed = 0;
    const next = locations.map((l) => {
      const p = patches.get(l.id);
      if (!p) return l;
      changed++;
      return cleanLocation({ ...l, ...p });
    });
    tx.update(ref, { locations: next, updatedAt: serverTimestamp(), updatedBy });
    return changed;
  });
}

const NO_TURNOUT: TurnoutPatch = { evTotal: undefined, evDem: undefined, evRep: undefined, evEstimated: undefined };

/**
 * Set or clear turnout numbers on a county's sites. `patches` maps site id →
 * numbers, or null to clear them; sites not in the map keep what they have.
 */
export async function saveCountyTurnout(
  campaignId: string,
  county: string,
  patches: Map<string, TurnoutPatch | null>,
  updatedBy: string,
): Promise<number> {
  const full = new Map([...patches].map(([id, p]) => [id, { ...NO_TURNOUT, ...(p ?? {}) }]));
  return patchCountySites(campaignId, county, full, updatedBy);
}

export async function deleteCountyLocations(campaignId: string, county: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, setDocId(campaignId, county)));
}
