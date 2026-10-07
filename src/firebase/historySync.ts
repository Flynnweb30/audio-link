import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './config';
import { MediaItem } from '../types';

export async function saveMediaToFirestore(userId: string, item: MediaItem): Promise<void> {
  try {
    const userMediaRef = doc(db, 'users', userId, 'media', item.id);
    await setDoc(userMediaRef, {
      ...item,
      userId,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Could not sync media to Firestore:', error);
  }
}

export function subscribeToUserMedia(
  userId: string, 
  callback: (items: MediaItem[]) => void
): () => void {
  try {
    const mediaColRef = collection(db, 'users', userId, 'media');
    const q = query(mediaColRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MediaItem);
      });
      callback(items);
    }, (error) => {
      console.warn('Firestore subscription warning:', error);
    });
  } catch (error) {
    console.warn('Failed to initialize Firestore listener:', error);
    return () => {};
  }
}

export async function migrateGuestItemsToUser(userId: string, guestItems: MediaItem[]): Promise<void> {
  try {
    const promises = guestItems.map((item) => saveMediaToFirestore(userId, item));
    await Promise.all(promises);
  } catch (error) {
    console.warn('Failed to migrate guest media to user account:', error);
  }
}

export async function deleteMediaFromFirestore(userId: string, mediaId: string): Promise<void> {
  try {
    const userMediaRef = doc(db, 'users', userId, 'media', mediaId);
    await deleteDoc(userMediaRef);
  } catch (error) {
    console.warn('Failed to delete media from Firestore:', error);
  }
}
