import {
  doc, updateDoc, deleteDoc,
  collection, serverTimestamp, onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PlannedSignLocation, PlannedSignLocationInput, PlannedSignStatus } from '../types';

const COLLECTION = 'plannedSignLocations';

export async function addPlannedSign(
  input: PlannedSignLocationInput,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    status: input.status ?? 'planned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlannedSign(
  id: string,
  input: PlannedSignLocationInput,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlannedSignStatus(
  id: string,
  status: PlannedSignStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlannedSign(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToPlannedSigns(
  callback: (signs: PlannedSignLocation[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const signs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as PlannedSignLocation));
      callback(signs);
    },
    (err) => {
      console.error('Planned signs subscription error:', err);
      if (onError) onError(err);
    },
  );
}
