import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadPhoto, deletePhoto } from './storageService';
import type { SignSubmission, SignSubmissionInput } from '../types';

const COLLECTION = 'submissions';

export async function createSubmission(input: SignSubmissionInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    volunteerName: input.volunteerName,
    volunteerPhone: input.volunteerPhone,
    volunteerEmail: input.volunteerEmail,
    notes: input.notes,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    postingMethod: input.postingMethod,
    signCount: input.signCount,
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
  data: Partial<Pick<SignSubmission, 'volunteerName' | 'notes' | 'address'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubmission(id: string, photoPath: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
  await deletePhoto(photoPath);
}

export function subscribeToSubmissions(
  callback: (subs: SignSubmission[]) => void
): () => void {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const subs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as SignSubmission));
    callback(subs);
  });
}
