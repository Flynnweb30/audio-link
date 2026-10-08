export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;
  documentId?: string;
  storagePath?: string;
  downloadURL: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  format?: string;
  folder?: string;
  ownerId: string;
  userId?: string;
  userEmail?: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  directUrl: string;
  directAudioUrl?: string;
  playerUrl?: string;
  storageUrl?: string;
  dataUri?: string;
  isPlaceholder?: boolean;
  customSlug?: string;
  expiresAt?: string;
  duration?: number;
  width?: number;
  height?: number;
  views?: number;
  plays?: number;
  downloads?: number;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    sampleRate?: number;
  };
}

export interface UserTierLimits {
  tierName: 'anonymous' | 'registered' | 'promotional';
  maxUploads: number;
  usedUploads: number;
  remainingUploads: number;
  maxFileSizeBytes: number;
  desktopBonus: number;
}

export interface UploadProgress {
  state: 'idle' | 'uploading' | 'verifying' | 'success' | 'error';
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