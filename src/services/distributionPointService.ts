import {
  doc, updateDoc, deleteDoc, query, where,
  collection, serverTimestamp, onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DistributionPoint, DistributionPointInput } from '../types';

const COLLECTION = 'distributionPoints';

export async function addDistributionPoint(
  input: DistributionPointInput,
  campaignId: string,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    campaignId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDistributionPoint(
  id: string,
  input: DistributionPointInput,
): Promise<void> {
  // No campaignId arg here — the doc's campaignId was set at create and the
  // immutable nature of the binding means we don't need to re-validate on
  // every update. Same for the other update*/delete* functions below.
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSignCount(
  id: string,
  signCount: number,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    signCount,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDistributionPoint(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToDistributionPoints(
  campaignId: string,
  callback: (points: DistributionPoint[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      const points = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as DistributionPoint));
      callback(points);
    },
    (err) => {
      console.error('Distribution points subscription error:', err);
      if (onError) onError(err);
    },
  );
}
