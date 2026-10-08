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
  uploadBytes,
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { User } from 'firebase/auth';
import { db, storage, ensureFirebaseAuth } from './config';
import { MediaItem, UserQuotaStats } from '../types';
import { processAndStripExif } from '../utils/imageProcessor';

// Configurable Quota Limits
export const QUOTA_CONFIG = {
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB Max Free File Size
  maxFileSizeLabel: '5 MB',
  anonymousLimit: 30,
  registeredLimit: 200,
  promotionalQuota: 1000,
  desktopBonus: 100,
};

export function isDesktopClient(): boolean {
  if (typeof window === 'undefined') return false;
  return !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function getUserQuotaStats(totalUploadsCount: number, user: User | null): UserQuotaStats {
  const isRegistered = Boolean(user && !user.isAnonymous);
  const desktopBonus = isDesktopClient() ? QUOTA_CONFIG.desktopBonus : 0;
  const baseLimit = isRegistered ? QUOTA_CONFIG.registeredLimit : QUOTA_CONFIG.anonymousLimit;
  const totalLimit = baseLimit + desktopBonus;
  const remaining = Math.max(0, totalLimit - totalUploadsCount);

  return {
    used: totalUploadsCount,
    limit: totalLimit,
    remaining,
    planName: isRegistered ? 'Registered Free Tier' : 'Anonymous Free Tier',
    isRegistered,
    bonusApplied: desktopBonus,
    maxFileSizeBytes: QUOTA_CONFIG.maxFileSizeBytes,
    maxFileSizeLabel: QUOTA_CONFIG.maxFileSizeLabel,
  };
}

function detectMediaType(ext: string, mime?: string): 'audio' | 'video' | 'image' {
  const cleanExt = ext.toLowerCase();
  const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac', '.webm'];
  const videoExts = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.ogv'];

  if (audioExts.includes(cleanExt) || (mime && mime.startsWith('audio/'))) return 'audio';
  if (videoExts.includes(cleanExt) || (mime && mime.startsWith('video/'))) return 'video';
  return 'image';
}

function detectFormatName(filename: string, mime: string): string {
  const ext = filename.split('.').pop()?.toUpperCase();
  if (ext && ext.length <= 5) return ext;
  if (mime.includes('/')) return mime.split('/')[1].toUpperCase();
  return 'FILE';
}

/**
 * Single Centralized Media Workflow:
 * Upload -> Process -> Firebase Storage -> Verify -> Persistent URL -> Firestore -> Ready
 */
export async function uploadMediaFileToFirebase(
  file: File,
  ownerId: string,
  user: User | null,
  folder: string = 'public',
  onProgress?: (percent: number) => void
): Promise<MediaItem> {
  if (!storage || !db) {
    throw new Error('Firebase services are not initialized. Check your network or credentials.');
  }

  // 1. Enforce Free Hosting File Size Limit (5 MB)
  if (file.size > QUOTA_CONFIG.maxFileSizeBytes) {
    throw new Error(`File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum free limit of ${QUOTA_CONFIG.maxFileSizeLabel}.`);
  }

  // Ensure authenticated session to pass storage security rules
  await ensureFirebaseAuth();

  // 2. Media Processing: Strip EXIF metadata for images
  let uploadBlob: Blob = file;
  let uploadMime = file.type || 'application/octet-stream';
  let exifStripped = false;

  if (file.type.startsWith('image/')) {
    try {
      const processed = await processAndStripExif(file);
      uploadBlob = processed.blob;
      uploadMime = processed.mimeType;
      exifStripped = true;
    } catch {
      uploadBlob = file;
    }
  }

  // 3. Unique Storage Path Construction
  const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || 'bin');
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const uniqueId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const finalFilename = `${baseName}_${uniqueId}${fileExt}`;
  const storagePath = `media/${ownerId}/${finalFilename}`;

  // 4. Firebase Storage Upload (Atomic upload with content type, minimal headers to prevent CORS issues)
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: uploadMime,
  };

  if (onProgress) onProgress(15);

  let downloadURL = '';
  try {
    // Attempt standard uploadBytes
    const snapshot = await uploadBytes(storageRef, uploadBlob, metadata);
    if (onProgress) onProgress(80);
    downloadURL = await getDownloadURL(snapshot.ref);
  } catch (err: any) {
    // Fallback attempt via uploadBytesResumable
    try {
      const uploadTask = uploadBytesResumable(storageRef, uploadBlob, metadata);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const p = Math.min(90, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 85) + 5);
              onProgress(p);
            }
          },
          (e) => reject(e),
          () => resolve()
        );
      });
      downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    } catch (innerErr: any) {
      const msg = innerErr?.message || err?.message || 'Storage upload error';
      if (msg.includes('CORS') || msg.includes('preflight') || msg.includes('network')) {
        throw new Error('Firebase Storage CORS preflight rejected by bucket. Apply cors.json to bucket using gsutil or Cloud Shell.');
      }
      throw new Error(msg);
    }
  }

  // 5. Verify Persistent URL
  if (!downloadURL || !downloadURL.startsWith('http')) {
    throw new Error('Failed to generate a verified persistent download URL from Firebase Storage.');
  }

  if (onProgress) onProgress(95);

  // 6. Firestore Metadata Record Persistence
  const mediaDocId = uniqueId;
  const mediaType = detectMediaType(fileExt, uploadMime);
  const formatName = detectFormatName(finalFilename, uploadMime);

  const mediaRecord: MediaItem = {
    id: mediaDocId,
    documentId: mediaDocId,
    storagePath,
    downloadURL,
    directUrl: downloadURL,
    directAudioUrl: downloadURL,
    playerUrl: `/?view=${mediaDocId}`,
    filename: finalFilename,
    originalName: file.name,
    mimeType: uploadMime,
    size: uploadBlob.size,
    format: formatName,
    mediaType,
    folder: folder || 'public',
    createdAt: new Date().toISOString(),
    ownerId,
    userEmail: user?.email || undefined,
    status: 'ready',
    isGuest: !user || user.isAnonymous,
    metadata: {
      exifStripped,
      storageVerified: true,
      format: formatName,
    },
  };

  await setDoc(doc(db, 'media', mediaDocId), mediaRecord, { merge: true });

  if (onProgress) onProgress(100);

  return mediaRecord;
}

export async function renameMediaRecordInFirestore(documentId: string, newOriginalName: string): Promise<boolean> {
  if (!db || !documentId || !newOriginalName.trim()) return false;
  try {
    const docRef = doc(db, 'media', documentId);
    await updateDoc(docRef, { originalName: newOriginalName.trim() });
    return true;
  } catch {
    return false;
  }
}

export async function moveMediaRecordFolderInFirestore(documentId: string, newFolder: string): Promise<boolean> {
  if (!db || !documentId) return false;
  try {
    const docRef = doc(db, 'media', documentId);
    await updateDoc(docRef, { folder: newFolder.trim() || 'public' });
    return true;
  } catch {
    return false;
  }
}

export async function deleteMediaRecordFromFirebase(item: MediaItem): Promise<boolean> {
  if (!db) return false;
  let storageDeleted = false;
  let firestoreDeleted = false;

  if (storage && item.storagePath) {
    try {
      const storageRef = ref(storage, item.storagePath);
      await deleteObject(storageRef);
      storageDeleted = true;
    } catch (err: any) {
      if (err?.code === 'storage/object-not-found') storageDeleted = true;
    }
  }

  const docId = item.documentId || item.id;
  if (docId) {
    try {
      await deleteDoc(doc(db, 'media', docId));
      firestoreDeleted = true;
    } catch {}
  }

  return storageDeleted || firestoreDeleted;
}

export function subscribeToOwnerMediaLibrary(
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
        const records: MediaItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as MediaItem;
          if (data && (data.downloadURL || data.directUrl)) {
            records.push({
              ...data,
              id: data.documentId || data.id || d.id,
              documentId: data.documentId || data.id || d.id,
              downloadURL: data.downloadURL || data.directUrl,
              directUrl: data.downloadURL || data.directUrl,
              folder: data.folder || 'public',
            });
          }
        });

        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(records);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}

export async function fetchMediaRecordById(documentId: string): Promise<MediaItem | null> {
  if (!db || !documentId) return null;
  try {
    const snap = await getDoc(doc(db, 'media', documentId));
    if (snap.exists()) {
      const data = snap.data() as MediaItem;
      return {
        ...data,
        id: data.documentId || data.id || snap.id,
        documentId: data.documentId || data.id || snap.id,
        downloadURL: data.downloadURL || data.directUrl,
        directUrl: data.downloadURL || data.directUrl,
      };
    }
    return null;
  } catch {
    return null;
  }
}