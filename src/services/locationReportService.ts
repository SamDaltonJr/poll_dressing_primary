import {
  doc, updateDoc, deleteDoc, query, where,
  collection, serverTimestamp, onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LocationReport, LocationReportInput } from '../types';

const COLLECTION = 'locationReports';

export async function addLocationReport(
  input: LocationReportInput,
  campaignId: string,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    campaignId,
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
  campaignId: string,
  callback: (reports: LocationReport[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
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
