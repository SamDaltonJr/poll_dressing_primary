import {
  doc, setDoc, updateDoc, deleteDoc,
  collection, serverTimestamp, onSnapshot, increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DressingRecord, DressingInput } from '../types';

const COLLECTION = 'dressings';

export async function claimLocation(
  locationId: string,
  input: DressingInput,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, locationId), {
    locationId,
    isClaimed: true,
    claimedAt: serverTimestamp(),
    isDressed: false,
    signCount: 0,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    dressedAt: null,
    dressedBy: 'volunteer',
    revertedAt: null,
    revertedBy: null,
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function confirmDressed(
  locationId: string,
  signCount: number,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    isDressed: true,
    signCount,
    dressedAt: serverTimestamp(),
    dressedBy: 'volunteer',
    updatedAt: serverTimestamp(),
  });
}

export async function unclaimLocation(locationId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, locationId));
}

export async function markDressed(
  locationId: string,
  input: DressingInput,
  signCount: number,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, locationId), {
    locationId,
    isClaimed: true,
    claimedAt: serverTimestamp(),
    isDressed: true,
    signCount,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    dressedAt: serverTimestamp(),
    dressedBy: 'volunteer',
    revertedAt: null,
    revertedBy: null,
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function adminMarkDressed(
  locationId: string,
  input: DressingInput,
  signCount: number,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, locationId), {
    locationId,
    isClaimed: true,
    claimedAt: serverTimestamp(),
    isDressed: true,
    signCount,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    dressedAt: serverTimestamp(),
    dressedBy: 'admin',
    revertedAt: null,
    revertedBy: null,
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function revertDressing(locationId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    isDressed: false,
    signCount: 0,
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

export async function reportLocation(
  locationId: string,
  reason: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    reportCount: increment(1),
    lastReportedAt: serverTimestamp(),
    lastReportReason: reason,
    updatedAt: serverTimestamp(),
  });
}

export async function dismissReports(locationId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, locationId), {
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
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
