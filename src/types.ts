export type MediaType = 'audio' | 'video' | 'image';

export type MediaStatus =
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'
  | 'delete_error';

export type HistoryAction =
  | 'upload'
  | 'conversion'
  | 'preview'
  | 'copy'
  | 'play'
  | 'download'
  | 'delete'
  | 'error';

export interface MediaItem {
  id: string;
  originalName: string;
  filename: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  status?: MediaStatus;
  error?: string;
  lastAction?: HistoryAction;
  lastActionAt?: string;
  duration?: number;
  width?: number;
  height?: number;
  userId?: string;
  folder?: string;
  directUrl: string;
  playerUrl: string;
  customSlug?: string;
  expiresAt?: string;
  hasPassword?: boolean;
  views?: number;
  plays?: number;
  downloads?: number;
}

export type AudioItem = MediaItem;

export type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error';

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

export interface UploadProgress {
  state: UploadState;
  percentage: number;
  errorMessage: string | null;
  uploadedMedia: MediaItem | null;
  batchItems?: BatchFileItem[];
  batchTotal?: number;
  batchCompleted?: number;
}
