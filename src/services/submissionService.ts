import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadPhoto, deletePhoto } from './storageService';
import type { SignSubmission, SignSubmissionInput } from '../types';

const COLLECTION = 'submissions';

export async function createSubmission(
  input: SignSubmissionInput,
  campaignId: string,
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    campaignId,
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    notes: input.notes,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    postingMethod: input.postingMethod,
    signCount: input.signCount,
    isRetrieved: false,
    retrievedAt: null,
    photoUrl: '',
    photoPath: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const { url, path } = await uploadPhoto(input.photo, docRef.id);
  await updateDoc(docRef, { photoUrl: url, photoPath: path });

  return docRef.id;
}

export async function updateSubmission(
  id: string,
  data: Partial<Pick<SignSubmission, 'volunteerName' | 'volunteerPhone' | 'volunteerEmail' | 'notes' | 'address' | 'postingMethod' | 'signCount'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function markSignRetrieved(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isRetrieved: true,
    retrievedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubmission(id: string, photoPath: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
  await deletePhoto(photoPath);
}

export function subscribeToSubmissions(
  campaignId: string,
  callback: (subs: SignSubmission[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Composite query (campaignId equality + createdAt order) — Firestore requires
  // a composite index; falls back gracefully without ordering if the index is
  // missing, which can happen on the first deploy after re-enabling submissions.
  const q = query(
    collection(db, COLLECTION),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const subs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as SignSubmission));
      callback(subs);
    },
    (err) => {
      console.error('Submissions subscription error:', err);
      if (onError) onError(err);
    },
  );
}
