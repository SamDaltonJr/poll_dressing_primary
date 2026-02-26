import {
  doc, setDoc, updateDoc,
  collection, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DressingRecord, DressingInput } from '../types';

const COLLECTION = 'dressings';

export async function markDressed(
  locationId: string,
  input: DressingInput,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, locationId), {
    locationId,
    isDressed: true,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    dressedAt: serverTimestamp(),
    dressedBy: 'volunteer',
    revertedAt: null,
    revertedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export async function adminMarkDressed(
  locationId: string,
  input: DressingInput,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, locationId), {
    locationId,
    isDressed: true,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    dressedAt: serverTimestamp(),
    dressedBy: 'admin',
    revertedAt: null,
    revertedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export async function revertDressing(locationId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    isDressed: false,
    revertedAt: serverTimestamp(),
    revertedBy: 'admin',
    updatedAt: serverTimestamp(),
  });
}

export async function updateDressingVolunteer(
  locationId: string,
  data: Partial<DressingInput>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToDressings(
  callback: (records: DressingRecord[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        locationId: d.id,
        ...d.data(),
      } as DressingRecord));
      callback(records);
    },
    (err) => {
      console.error('Dressings subscription error:', err);
      if (onError) onError(err);
    },
  );
}
