import {
  collection, doc, onSnapshot, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { coordinatorIdForCode, randomCode } from '../utils/hash';
import type { Coordinator } from '../types';

const COLLECTION = 'coordinators';

export function subscribeToCoordinators(
  campaignId: string,
  callback: (coordinators: Coordinator[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Coordinator)));
    },
    (err) => {
      console.error('Coordinators subscription error:', err);
      if (onError) onError(err);
    },
  );
}

/**
 * Create a coordinator and return their login code. The code is only ever
 * shown here — Firestore stores its hash as the doc ID — so the admin must
 * copy it now. Losing it means deleting and recreating the coordinator.
 */
export async function createCoordinator(
  campaignId: string,
  input: { name: string; email: string; counties: string[] },
): Promise<string> {
  const code = randomCode(12);
  const id = await coordinatorIdForCode(campaignId, code);
  await setDoc(doc(db, COLLECTION, id), {
    campaignId,
    name: input.name,
    email: input.email,
    counties: input.counties,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function updateCoordinator(
  id: string,
  data: { name?: string; email?: string; counties?: string[] },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteCoordinator(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
