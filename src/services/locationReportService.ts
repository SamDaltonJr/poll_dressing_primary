import {
  doc, updateDoc, deleteDoc,
  collection, serverTimestamp, onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LocationReport, LocationReportInput } from '../types';

const COLLECTION = 'locationReports';

export async function addLocationReport(
  input: LocationReportInput,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    status: 'pending',
    createdAt: serverTimestamp(),
    resolvedAt: null,
    resolvedNote: null,
  });
  return ref.id;
}

export async function resolveLocationReport(
  id: string,
  note?: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedNote: note || null,
  });
}

export async function deleteLocationReport(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToLocationReports(
  callback: (reports: LocationReport[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const reports = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as LocationReport));
      callback(reports);
    },
    (err) => {
      console.error('Location reports subscription error:', err);
      if (onError) onError(err);
    },
  );
}
