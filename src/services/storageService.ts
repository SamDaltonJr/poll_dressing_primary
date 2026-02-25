import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export async function uploadPhoto(file: File, docId: string): Promise<{ url: string; path: string }> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

  const storagePath = `photos/${docId}.jpg`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(storageRef);

  return { url, path: storagePath };
}

export async function deletePhoto(photoPath: string): Promise<void> {
  if (photoPath) {
    await deleteObject(ref(storage, photoPath));
  }
}
