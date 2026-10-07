import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  Unsubscribe 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './config';
import { MediaItem } from '../types';

let isFirestoreAccessible = true;

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
 * Resilient Firestore sync: if an ad-blocker blocks Firestore, mutes gracefully
 * and relies on the server backend without throwing console errors.
 */
export async function syncRecordToFirebase(item: MediaItem, user?: User | null): Promise<boolean> {
  if (!db || !isFirestoreAccessible) return false;
  try {
    const payload: MediaItem = {
      ...item,
      userId: user ? user.uid : (item.userId || 'guest'),
      userEmail: user?.email || item.userEmail || undefined,
      isGuest: !user,
      expiresAt: user ? undefined : item.expiresAt,
      status: 'ready',
      syncedToFirebase: true,
    };

    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'media', item.id), cleanData, { merge: true });
    return true;
  } catch (err: any) {
    if (
      err?.code === 'permission-denied' ||
      err?.code === 'unavailable' ||
      err?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
      err?.message?.includes('Failed to load resource')
    ) {
      isFirestoreAccessible = false;
    }
    return false;
  }
}

export async function syncBatchToFirebase(items: MediaItem[], user?: User | null): Promise<void> {
  if (!db || !isFirestoreAccessible || items.length === 0) return;
  await Promise.all(items.map((item) => syncRecordToFirebase(item, user)));
}

export async function deleteRecordFromFirebase(id: string): Promise<boolean> {
  if (!db || !isFirestoreAccessible) return false;
  try {
    await deleteDoc(doc(db, 'media', id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback self-healing: retrieves record from Firestore if available
 */
export async function fetchRecordFromFirestore(id: string): Promise<MediaItem | null> {
  if (!db || !isFirestoreAccessible) return null;
  try {
    const docRef = doc(db, 'media', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MediaItem;
      return {
        ...data,
        duration: Number(data.duration ?? data.metadata?.duration ?? 0),
      };
    }

    const q = query(collection(db, 'media'), where('filename', '==', id));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data() as MediaItem;
      return {
        ...data,
        duration: Number(data.duration ?? data.metadata?.duration ?? 0),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function subscribeToUserHistory(
  userId: string,
  onUpdate: (items: MediaItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db || !isFirestoreAccessible || !userId) return null;

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
        if (
          error?.code === 'permission-denied' ||
          error?.code === 'unavailable' ||
          error?.message?.includes('ERR_BLOCKED_BY_CLIENT')
        ) {
          isFirestoreAccessible = false;
        }
        if (onError) onError(error);
      }
    );
  } catch (err) {
    isFirestoreAccessible = false;
    if (onError) onError(err);
    return null;
  }
}