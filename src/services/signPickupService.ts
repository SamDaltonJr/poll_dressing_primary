import {
  doc, setDoc, deleteDoc, query, where,
  collection, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SignPickup } from '../types';

const COLLECTION = 'signPickups';

/** Normalize email to use as doc ID component (lowercase, trimmed). */
function emailToId(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Composite doc ID — `${campaignId}__${normalizedEmail}`. A volunteer working
 * on both campaigns has separate pickup records per campaign.
 */
function pickupDocId(campaignId: string, email: string): string {
  return `${campaignId}__${emailToId(email)}`;
}

export async function setSignPickup(
  volunteerEmail: string,
  signCount: number,
  campaignId: string,
): Promise<void> {
  const normalized = emailToId(volunteerEmail);
  await setDoc(doc(db, COLLECTION, pickupDocId(campaignId, volunteerEmail)), {
    campaignId,
    volunteerEmail: normalized,
    signCount,
    pickedUpAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSignPickupCount(
  volunteerEmail: string,
  signCount: number,
  campaignId: string,
): Promise<void> {
  // setDoc (not updateDoc) preserves the original create-then-update semantics
  // from the previous implementation. Field shape unchanged.
  const normalized = emailToId(volunteerEmail);
  await setDoc(doc(db, COLLECTION, pickupDocId(campaignId, volunteerEmail)), {
    campaignId,
    volunteerEmail: normalized,
    signCount,
    pickedUpAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeSignPickup(
  volunteerEmail: string,
  campaignId: string,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, pickupDocId(campaignId, volunteerEmail)));
}

export function subscribeToSignPickups(
  campaignId: string,
  callback: (pickups: SignPickup[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      const pickups = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as SignPickup));
      callback(pickups);
    },
    (err) => {
      console.error('Sign pickups subscription error:', err);
      if (onError) onError(err);
    },
  );
}
