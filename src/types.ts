export interface AudioItem {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  duration?: number;
  directAudioUrl: string;
  playerUrl: string;
}

export type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadProgress {
  state: UploadState;
  percentage: number;
  errorMessage: string | null;
  uploadedAudio: AudioItem | null;
}