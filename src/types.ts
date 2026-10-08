export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;              // Primary key / documentId
  documentId: string;      // Firestore Document ID
  storagePath: string;     // Firebase Storage object path
  downloadURL: string;     // Verified permanent Firebase Storage HTTPS URL
  directUrl: string;       // Direct URL alias
  directAudioUrl?: string; // Audio direct alias
  playerUrl?: string;      // In-app player URL
  filename: string;        // Stored filename
  originalName: string;    // Uploaded original filename
  mimeType: string;        // MIME type
  size: number;            // File size in bytes
  format: string;          // Extension/format in uppercase (e.g., MP3, WEBP, MP4)
  folder: string;          // Organizing folder (e.g., 'public', 'Work', etc.)
  createdAt: string;       // ISO 8601 creation timestamp
  ownerId: string;         // Firebase Auth UID or anonymous/guest ID
  userEmail?: string;      // User email if logged in
  status: 'ready' | 'uploading' | 'converting' | 'error';
  isGuest: boolean;
  duration?: number;
  width?: number;
  height?: number;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    sampleRate?: number;
    exifStripped?: boolean;
    storageVerified?: boolean;
  };
}

export interface UserQuotaStats {
  used: number;
  limit: number;
  remaining: number;
  planName: string;
  isRegistered: boolean;
  bonusApplied: number;
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
}

export interface UploadProgress {
  state: 'idle' | 'uploading' | 'converting' | 'verifying' | 'success' | 'error';
  percentage: number;
  errorMessage: string | null;
  uploadedMedia: MediaItem | null;
  batchTotal?: number;
  batchCompleted?: number;
}

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'converting' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: MediaItem;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:5';

export interface VideoClip {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio' | 'image';
  startTime: number;
  endTime: number;
  duration: number;
  volume: number;
  speed: number;
  muted: boolean;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  startTime: number;
  endTime: number;
}