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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';
import { db, storage } from './config';
import { MediaItem } from '../types';

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
 * Uploads media file to Firebase Storage so it survives Render ephemeral redeployments
 */
export async function uploadBinaryToFirebaseStorage(file: File | Blob, filename: string): Promise<string | null> {
  if (!storage) return null;
  try {
    const storageRef = ref(storage, `media/${filename}`);
    const snapshot = await uploadBytesResumable(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err: any) {
    return null;
  }
}

/**
 * Persists record to Firestore
 */
export async function syncRecordToFirebase(item: MediaItem, user?: User | null): Promise<boolean> {
  if (!db) return false;
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
    return false;
  }
}

export async function syncBatchToFirebase(items: MediaItem[], user?: User | null): Promise<void> {
  if (!db || items.length === 0) return;
  await Promise.all(items.map((item) => syncRecordToFirebase(item, user)));
}

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
 * Self-healing recovery: retrieves record from Firestore if local server disk was reset
 */
export async function fetchRecordFromFirestore(id: string): Promise<MediaItem | null> {
  if (!db) return null;
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
  } catch (err) {
    return null;
  }
}

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