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
  directUrl: string;
  playerUrl: string;
}

export type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadProgress {
  state: UploadState;
  percentage: number;
  errorMessage: string | null;
  uploadedMedia: MediaItem | null;
}