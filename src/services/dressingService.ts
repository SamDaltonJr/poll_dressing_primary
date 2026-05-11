import {
  doc, setDoc, updateDoc, deleteDoc, query, where,
  collection, serverTimestamp, onSnapshot, increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DressingRecord, DressingInput } from '../types';

const COLLECTION = 'dressings';

/**
 * Composite doc ID — `${campaignId}__${locationId}`. Lets each campaign claim
 * the same polling location independently (a shared site like a library that
 * sits in both TX-24 and TX-33's coverage area, for example).
 */
function dressingDocId(campaignId: string, locationId: string): string {
  return `${campaignId}__${locationId}`;
}

export async function claimLocation(
  locationId: string,
  input: DressingInput,
  campaignId: string,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    campaignId,
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
    isRetrieved: false,
    retrievedAt: null,
    retrievedSignCount: 0,
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function confirmDressed(
  locationId: string,
  signCount: number,
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    isDressed: true,
    signCount,
    dressedAt: serverTimestamp(),
    dressedBy: 'volunteer',
    updatedAt: serverTimestamp(),
  });
}

export async function unclaimLocation(
  locationId: string,
  campaignId: string,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)));
}

export async function markDressed(
  locationId: string,
  input: DressingInput,
  signCount: number,
  campaignId: string,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    campaignId,
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
    isRetrieved: false,
    retrievedAt: null,
    retrievedSignCount: 0,
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
  campaignId: string,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    campaignId,
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
    isRetrieved: false,
    retrievedAt: null,
    retrievedSignCount: 0,
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function markRetrieved(
  locationId: string,
  retrievedSignCount: number,
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    isRetrieved: true,
    retrievedAt: serverTimestamp(),
    retrievedSignCount,
    updatedAt: serverTimestamp(),
  });
}

export async function revertDressing(
  locationId: string,
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
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
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function reportLocation(
  locationId: string,
  reason: string,
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    reportCount: increment(1),
    lastReportedAt: serverTimestamp(),
    lastReportReason: reason,
    updatedAt: serverTimestamp(),
  });
}

export async function dismissReports(
  locationId: string,
  campaignId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, dressingDocId(campaignId, locationId)), {
    reportCount: 0,
    lastReportedAt: null,
    lastReportReason: null,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToDressings(
  campaignId: string,
  callback: (records: DressingRecord[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Filter server-side. campaignId field is always set on writes; the composite
  // doc ID prevents cross-campaign collisions but the filter is what keeps each
  // campaign's view scoped.
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => d.data() as DressingRecord);
      callback(records);
    },
    (err) => {
      console.error('Dressings subscription error:', err);
      if (onError) onError(err);
    },
  );
}
