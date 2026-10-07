export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;
  originalName: string;
  filename: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  createdAt: string;
  duration?: number;
  width?: number;
  height?: number;
  userId: string;
  userEmail?: string;
  isGuest: boolean;
  folder?: string;
  directUrl: string;
  directAudioUrl?: string;
  playerUrl?: string;
  customSlug?: string;
  expiresAt?: string; // undefined for permanent logged-in users, ISO string for 48h guests
  password?: string;
  hasPassword?: boolean;
  views?: number;
  plays?: number;
  downloads?: number;
  status?: 'ready' | 'converted';
  syncedToFirebase?: boolean;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    sampleRate?: number;
  };
}

export interface GuestQuotaInfo {
  remaining: number;
  maxDaily: number;
  used: number;
  retentionHours: number;
}

export interface UploadProgress {
  state: 'idle' | 'uploading' | 'success' | 'error';
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
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: MediaItem;
}