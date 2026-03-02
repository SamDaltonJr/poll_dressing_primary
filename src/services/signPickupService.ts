import {
  doc, setDoc, deleteDoc,
  collection, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SignPickup } from '../types';

const COLLECTION = 'signPickups';

/** Normalize email to use as doc ID (lowercase, no dots before @) */
function emailToId(email: string): string {
  return email.toLowerCase().trim();
}

export async function setSignPickup(
  volunteerEmail: string,
  signCount: number,
): Promise<void> {
  const id = emailToId(volunteerEmail);
  await setDoc(doc(db, COLLECTION, id), {
    volunteerEmail: id,
    signCount,
    pickedUpAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSignPickupCount(
  volunteerEmail: string,
  signCount: number,
): Promise<void> {
  const id = emailToId(volunteerEmail);
  await setDoc(doc(db, COLLECTION, id), {
    volunteerEmail: id,
    signCount,
    pickedUpAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeSignPickup(volunteerEmail: string): Promise<void> {
  const id = emailToId(volunteerEmail);
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToSignPickups(
  callback: (pickups: SignPickup[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
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
