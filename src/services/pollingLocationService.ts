import {
  collection, doc, onSnapshot, query, where, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { countySlug } from '../config/texasCounties';
import type { PollingLocationSet, StoredLocation } from '../types';

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
  // Firestore rejects undefined field values, so strip optional keys that
  // aren't set rather than writing `size: undefined`.
  const clean = locations.map((l) => {
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
    return out;
  });
  await setDoc(
    doc(db, COLLECTION, setDocId(campaignId, county)),
    {
      campaignId,
      county,
      locations: clean,
      [listKind === 'ev' ? 'evUpdatedAt' : 'edUpdatedAt']: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true },
  );
}

export async function deleteCountyLocations(campaignId: string, county: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, setDocId(campaignId, county)));
}
