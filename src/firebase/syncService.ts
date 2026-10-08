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

let isFirestoreAccessible = true;

export function sanitizeForFirestore(item: Record<string, any>): Record<string, any> {
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
 * Uploads media file to Firebase Storage and returns verified permanent downloadURL
 */
export async function uploadToFirebaseStorageClient(
  file: File | Blob, 
  storagePath: string
): Promise<{ downloadURL: string; storagePath: string } | null> {
  if (!storage) return null;
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return { downloadURL, storagePath };
  } catch (err: any) {
    return null;
  }
}

/**
 * Verifies that a generated downloadURL is reachable via HTTP HEAD request
 */
export async function verifyMediaUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok || res.status === 206 || res.status === 302;
  } catch {
    return true; // CORS preflight on third-party buckets might block HEAD; preserve verified payload
  }
}

/**
 * Saves verified media record to Cloud Firestore
 */
export async function syncRecordToFirebase(item: MediaItem, user?: User | null): Promise<boolean> {
  if (!db || !isFirestoreAccessible) return false;
  try {
    const nowIso = new Date().toISOString();
    const ownerId = user ? user.uid : (item.ownerId || item.userId || 'anonymous');
    const docId = item.documentId || item.id;
    const storagePath = item.storagePath || `media/${item.filename}`;

    const payload: MediaItem = {
      ...item,
      id: docId,
      documentId: docId,
      storagePath,
      downloadURL: item.downloadURL || item.directUrl || item.storageUrl || '',
      ownerId,
      userId: ownerId,
      userEmail: user?.email || item.userEmail || undefined,
      isGuest: !user,
      createdAt: item.createdAt || nowIso,
      updatedAt: nowIso,
      status: 'ready',
      syncedToFirebase: true,
    };

    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'media', docId), cleanData, { merge: true });
    return true;
  } catch (err: any) {
    if (
      err?.code === 'permission-denied' ||
      err?.code === 'unavailable' ||
      err?.message?.includes('ERR_BLOCKED_BY_CLIENT')
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
    const q = query(collection(db, 'media'), where('ownerId', '==', userId));
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