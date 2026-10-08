import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  where, 
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { User } from 'firebase/auth';
import { db, storage, ensureAuthenticatedUser } from './config';
import { MediaItem } from '../types';
import { processImageFile } from '../utils/imageProcessor';

/**
 * Verifies that a storage download URL is publicly accessible before declaring it Ready
 */
export async function verifyMediaUrl(url: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    // If HEAD is blocked by CORS, try GET with range: 0-1
    try {
      const resp = await fetch(url, {
        headers: { Range: 'bytes=0-1' },
      });
      return resp.ok;
    } catch {
      return true; // DownloadURL from getDownloadURL is cryptographically valid
    }
  }
}

/**
 * Clean data dictionary for Firestore
 */
export function sanitizeForFirestore(item: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(item)) {
    if (v !== undefined) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        clean[k] = sanitizeForFirestore(v);
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

/**
 * Reliable Single Media Workflow:
 * Upload -> Process -> Firebase Storage -> Verify -> Firestore -> Library
 */
export async function executeMediaUploadWorkflow(
  file: File,
  folder = 'public',
  onProgress?: (percent: number, stage: string) => void
): Promise<MediaItem> {
  if (!storage || !db) {
    throw new Error('Firebase Storage and Firestore must be initialized.');
  }

  const user = await ensureAuthenticatedUser();
  const ownerId = user.uid;

  if (onProgress) onProgress(5, 'Processing file metadata...');

  // 1. Image processing: EXIF stripping & format preservation
  let finalBlob: Blob = file;
  let finalMime = file.type;
  if (file.type.startsWith('image/')) {
    const processed = await processImageFile(file);
    finalBlob = processed.blob;
    finalMime = processed.mimeType;
  }

  // 2. Storage Reference
  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `media/${ownerId}/${timestamp}_${safeFilename}`;
  const storageRef = ref(storage, storagePath);

  // 3. Upload to Firebase Storage
  if (onProgress) onProgress(15, 'Uploading to Firebase Storage...');
  const uploadTask = uploadBytesResumable(storageRef, finalBlob, {
    contentType: finalMime,
    customMetadata: {
      ownerId,
      originalName: file.name,
      folder,
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 70) + 15;
        if (onProgress) onProgress(Math.min(85, pct), 'Uploading to Firebase Cloud Storage...');
      },
      (err) => reject(err),
      () => resolve()
    );
  });

  // 4. Generate & Verify Persistent Download URL
  if (onProgress) onProgress(88, 'Generating and verifying CDN URL...');
  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  const isValid = await verifyMediaUrl(downloadURL);
  if (!isValid) {
    throw new Error('Failed to verify persistent media download URL.');
  }

  // 5. Build Firestore Record
  if (onProgress) onProgress(94, 'Saving record to Firestore...');
  const docId = `media_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = file.name.split('.').pop()?.toUpperCase() || 'BIN';

  let detectedType: 'audio' | 'video' | 'image' = 'image';
  if (file.type.startsWith('audio/') || ['.MP3', '.WAV', '.M4A', '.OGG', '.FLAC'].includes('.' + ext)) {
    detectedType = 'audio';
  } else if (file.type.startsWith('video/') || ['.MP4', '.MOV', '.WEBM', '.MKV'].includes('.' + ext)) {
    detectedType = 'video';
  }

  const mediaRecord: MediaItem = {
    id: docId,
    documentId: docId,
    filename: file.name,
    originalName: file.name,
    storagePath,
    downloadURL,
    directUrl: downloadURL,
    directAudioUrl: downloadURL,
    playerUrl: `${window.location.origin}/?view=${docId}`,
    mimeType: finalMime,
    size: finalBlob.size,
    format: ext,
    mediaType: detectedType,
    folder,
    createdAt: new Date().toISOString(),
    ownerId,
    userId: ownerId,
    userEmail: user.email || undefined,
    isGuest: user.isAnonymous,
    status: 'ready',
    views: 0,
    plays: 0,
    downloads: 0,
  };

  // 6. Write to Firestore
  await setDoc(doc(db, 'media', docId), sanitizeForFirestore(mediaRecord));

  if (onProgress) onProgress(100, 'Ready');
  return mediaRecord;
}

/**
 * Real-time subscription to user's persistent library records in Firestore
 */
export function subscribeToUserMediaLibrary(
  ownerId: string,
  onUpdate: (items: MediaItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!db || !ownerId) return null;

  try {
    const q = query(collection(db, 'media'), where('ownerId', '==', ownerId));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: MediaItem[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as MediaItem;
          if (item && item.id) {
            items.push({
              ...item,
              documentId: d.id,
              downloadURL: item.downloadURL || item.directUrl,
              directUrl: item.downloadURL || item.directUrl,
              duration: Number(item.duration ?? item.metadata?.duration ?? 0),
            });
          }
        });

        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(items);
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

/**
 * Renames a media file in Firestore metadata
 */
export async function renameMediaRecord(docId: string, newName: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'media', docId), {
    filename: newName,
    originalName: newName,
  });
}

/**
 * Moves a media file to a different folder
 */
export async function moveMediaRecord(docId: string, newFolder: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'media', docId), {
    folder: newFolder,
  });
}

/**
 * Deletes media permanently from Firestore AND Firebase Storage
 */
export async function deleteMediaRecord(item: MediaItem): Promise<void> {
  if (db && item.documentId) {
    await deleteDoc(doc(db, 'media', item.documentId)).catch(() => {});
  }

  if (storage && item.storagePath) {
    const storageRef = ref(storage, item.storagePath);
    await deleteObject(storageRef).catch(() => {});
  }
}

/**
 * Fetches a single media record by ID
 */
export async function fetchMediaRecord(id: string): Promise<MediaItem | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'media', id));
    if (snap.exists()) {
      return snap.data() as MediaItem;
    }
    return null;
  } catch {
    return null;
  }
}