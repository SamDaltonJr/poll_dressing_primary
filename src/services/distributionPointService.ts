import {
  doc, updateDoc, deleteDoc,
  collection, serverTimestamp, onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DistributionPoint, DistributionPointInput } from '../types';

const COLLECTION = 'distributionPoints';

export async function addDistributionPoint(
  input: DistributionPointInput,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDistributionPoint(
  id: string,
  input: DistributionPointInput,
): Promise<void> {
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
  callback: (points: DistributionPoint[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
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
