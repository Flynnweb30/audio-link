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
import { sortHistory } from '../utils/history';

export async function saveMediaToFirestore(userId: string, item: MediaItem): Promise<void> {
  const userMediaRef = doc(db, 'users', userId, 'media', item.id);
  await setDoc(userMediaRef, {
    ...item,
    userId,
    syncedAt: new Date().toISOString(),
  }, { merge: true });
}

export function subscribeToUserMedia(
  userId: string,
  callback: (items: MediaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const mediaColRef = collection(db, 'users', userId, 'media');
  const q = query(mediaColRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(sortHistory(snapshot.docs.map((docSnap) => docSnap.data() as MediaItem)));
    },
    (error) => {
      console.warn('Firestore subscription warning:', error);
      onError?.(error);
    }
  );
}

export async function migrateGuestItemsToUser(userId: string, guestItems: MediaItem[]): Promise<void> {
  if (!guestItems.length) return;
  await Promise.all(guestItems.map((item) => saveMediaToFirestore(userId, item)));
}

export async function deleteMediaFromFirestore(userId: string, mediaId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'media', mediaId));
}
