export type MediaType = 'audio' | 'video' | 'image';

export interface MediaItem {
  id: string;
  documentId: string;
  filename: string;
  originalName: string;
  storagePath: string;
  downloadURL: string;
  directUrl: string;
  directAudioUrl?: string;
  playerUrl?: string;
  mimeType: string;
  size: number;
  format: string;
  mediaType: MediaType;
  folder: string;
  createdAt: string;
  ownerId: string;
  userId: string;
  userEmail?: string;
  isGuest: boolean;
  status: 'ready' | 'processing' | 'error';
  views?: number;
  plays?: number;
  downloads?: number;
  duration?: number;
  width?: number;
  height?: number;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    sampleRate?: number;
  };
}

export interface UserQuota {
  allowedUploads: number;
  usedUploads: number;
  remainingUploads: number;
  maxFileSizeBytes: number;
  isAnonymous: boolean;
  tierName: string;
}

export interface UploadProgress {
  state: 'idle' | 'processing' | 'uploading' | 'verifying' | 'success' | 'error';
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
  status: 'pending' | 'processing' | 'uploading' | 'completed' | 'error';
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