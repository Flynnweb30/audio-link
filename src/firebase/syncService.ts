import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  Unsubscribe 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './config';
import { MediaItem } from '../types';

/**
 * Strips all undefined fields to prevent Firestore serialization runtime errors
 */
export function sanitizeForFirestore(item: MediaItem): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(item)) {
    if (v !== undefined) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const nestedClean: Record<string, any> = {};
        for (const [nk, nv] of Object.entries(v)) {
          if (nv !== undefined) nestedClean[nk] = nv;
        }
        clean[k] = nestedClean;
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

/**
 * Persists a media record to Firestore centralized repository
 */
export async function syncRecordToFirebase(item: MediaItem, user?: User | null): Promise<boolean> {
  if (!db) return false;
  try {
    const payload: MediaItem = {
      ...item,
      userId: user ? user.uid : (item.userId || 'guest'),
      userEmail: user?.email || item.userEmail || undefined,
      isGuest: !user,
      expiresAt: user ? undefined : item.expiresAt, // Logged-in users are permanent
      status: 'ready',
      syncedToFirebase: true,
    };

    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'media', item.id), cleanData, { merge: true });
    return true;
  } catch (err: any) {
    if (err?.code !== 'permission-denied' && !err?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.warn('Firebase sync notice:', err?.message || err);
    }
    return false;
  }
}

/**
 * Batch saves multiple media records to Firestore
 */
export async function syncBatchToFirebase(items: MediaItem[], user?: User | null): Promise<void> {
  if (!db || items.length === 0) return;
  await Promise.all(items.map((item) => syncRecordToFirebase(item, user)));
}

/**
 * Deletes a media record from Firestore
 */
export async function deleteRecordFromFirebase(id: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'media', id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribes in real-time to a user's (or guest's) media history in Firestore
 */
export function subscribeToUserHistory(
  userId: string,
  onUpdate: (items: MediaItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db || !userId) return null;

  try {
    const q = query(collection(db, 'media'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const remoteItems: MediaItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MediaItem;
          if (data && data.id) {
            remoteItems.push({
              ...data,
              duration: Number(data.duration ?? data.metadata?.duration ?? 0),
            });
          }
        });

        remoteItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(remoteItems);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}