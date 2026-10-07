import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { MediaItem } from '../types';

const mediaRef = (userId: string, mediaId: string) =>
  doc(db, 'users', userId, 'media', mediaId);

export async function saveMediaToFirestore(userId: string, item: MediaItem): Promise<void> {
  const normalized: MediaItem = {
    ...item,
    userId,
    status: item.status || 'success',
    updatedAt: new Date().toISOString(),
  };

  await setDoc(mediaRef(userId, item.id), normalized, { merge: true });
}

export function subscribeToUserMedia(
  userId: string,
  callback: (items: MediaItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const mediaColRef = collection(db, 'users', userId, 'media');
  const q = query(mediaColRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MediaItem;
        if (data.status !== 'deleted') items.push(data);
      });
      callback(items);
    },
    (error) => {
      console.warn('Firestore subscription warning:', error);
      onError?.(error);
    },
  );
}

export async function migrateGuestItemsToUser(userId: string, guestItems: MediaItem[]): Promise<void> {
  if (!guestItems.length) return;
  const results = await Promise.allSettled(
    guestItems.map((item) => saveMediaToFirestore(userId, item)),
  );
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    throw new Error(`Failed to migrate ${failures.length} guest history item(s).`);
  }
}

export async function deleteMediaFromFirestore(userId: string, mediaId: string): Promise<void> {
  await deleteDoc(mediaRef(userId, mediaId));
}
