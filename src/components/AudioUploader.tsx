import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  Video, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Mic, 
  Square, 
  Sparkles, 
  Layers, 
  Lock, 
  Files, 
  X, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Plus 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MediaItem, UploadProgress, BatchFileItem } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/formatters';
import { computeUserLimits } from '../utils/quotas';
import { syncRecordToFirebase, syncBatchToFirebase } from '../firebase/syncService';

interface AudioUploaderProps {
  onUploadSuccess: (item: MediaItem) => void;
  onBatchUploadSuccess?: (items: MediaItem[]) => void;
  onSelectSample: (sampleId: string) => void;
  user: User | null;
  guestRemaining: number;
  onSignIn: () => void;
  isSigningIn?: boolean;
  currentFilter?: 'all' | 'audio' | 'video' | 'image';
  onFilterChange?: (filter: 'all' | 'audio' | 'video' | 'image') => void;
}

const ALLOWED_EXTS = [
  '.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac',
  '.mp4', '.mov', '.webm', '.mkv', '.m4v',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onUploadSuccess,
  onBatchUploadSuccess,
  onSelectSample,
  user,
  guestRemaining,
  onSignIn,
  isSigningIn = false,
  currentFilter,
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<'all' | 'audio' | 'video' | 'image'>('all');
  const activeMediaFilter = currentFilter !== undefined ? currentFilter : internalFilter;

  const handleFilterSelection = (filter: 'all' | 'audio' | 'video' | 'image') => {
    setInternalFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  const userLimits = computeUserLimits(user, 30 - guestRemaining);

  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [batchQueue, setBatchQueue] = useState<BatchFileItem[]>([]);
  const [batchCompletedItems, setBatchCompletedItems] = useState<MediaItem[]>([]);
  const [copiedAllBatch, setCopiedAllBatch] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    state: 'idle',
    percentage: 0,
    errorMessage: null,
    uploadedMedia: null,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const isQuotaExhausted = userLimits.remainingUploads <= 0;

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext);
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(ext);

    if (!isAudio && !isVideo && !isImage && !ALLOWED_EXTS.includes(ext)) {
      return `Format "${ext || file.type}" is not supported. Supported: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP.`;
    }

    if (file.size > userLimits.maxFileSizeBytes) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds ${formatFileSize(userLimits.maxFileSizeBytes)} limit for your tier.`;
    }

    if (file.size === 0) {
      return `"${file.name}" is an empty file (0 bytes).`;
    }

    return null;
  };

  const getMediaIcon = (fileOrItem: { name?: string; originalName?: string; type?: string; mediaType?: string }) => {
    const name = fileOrItem.name || fileOrItem.originalName || '';
    const ext = '.' + (name.split('.').pop() || '').toLowerCase();
    const type = fileOrItem.type || fileOrItem.mediaType || '';

    if (type.startsWith('video') || ['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
      return <Video className="w-4 h-4 text-rose-500" />;
    }
    if (type.startsWith('image') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    }
    return <FileAudio className="w-4 h-4 text-indigo-500" />;
  };

  const getApiUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.startsWith('http')) {
      return envUrl.replace(/\/$/, '');
    }
    return '';
  };

  const startSingleUpload = async (file: File) => {
    setUploadProgress({
      state: 'uploading',
      percentage: 15,
      errorMessage: null,
      uploadedMedia: null,
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'public');

    const effectiveOwnerId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'anonymous');
    formData.append('ownerId', effectiveOwnerId);

    const token = user ? await user.getIdToken() : '';
    const targetUrl = `${getApiUrl()}/api/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', targetUrl, true);
    xhr.setRequestHeader('x-user-id', effectiveOwnerId);
    if (user?.email) xhr.setRequestHeader('x-user-email', user.email);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(85, Math.round((event.loaded / event.total) * 70) + 15);
        setUploadProgress((prev) => ({ ...prev, percentage: percent }));
      }
    };

    xhr.onload = async () => {
      try {
        const response = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && response.item) {
          setUploadProgress((prev) => ({ ...prev, percentage: 90, state: 'verifying' }));
          
          const verifiedItem: MediaItem = {
            ...response.item,
            ownerId: effectiveOwnerId,
            status: 'ready',
          };

          // Verify and save to Firestore
          await syncRecordToFirebase(verifiedItem, user);

          setUploadProgress({
            state: 'success',
            percentage: 100,
            errorMessage: null,
            uploadedMedia: verifiedItem,
          });

          onUploadSuccess(verifiedItem);
        } else {
          setUploadProgress({
            state: 'error',
            percentage: 0,
            errorMessage: response.error || `Upload failed (${xhr.status}).`,
            uploadedMedia: null,
          });
        }
      } catch {
        setUploadProgress({
          state: 'error',
          percentage: 0,
          errorMessage: 'Server returned invalid response.',
          uploadedMedia: null,
        });
      }
    };

    xhr.onerror = () => {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'Network error communicating with Render Media API.',
        uploadedMedia: null,
      });
    };

    xhr.send(formData);
  };

  const startBatchUpload = async () => {
    if (batchQueue.length === 0) return;
    const pendingItems = batchQueue.filter((item) => item.status !== 'completed');
    if (pendingItems.length === 0) return;

    setUploadProgress({
      state: 'uploading',
      percentage: 10,
      errorMessage: null,
      uploadedMedia: null,
      batchTotal: batchQueue.length,
      batchCompleted: 0,
    });

    const effectiveOwnerId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'anonymous');
    const token = user ? await user.getIdToken() : '';
    const successfulItems: MediaItem[] = [];

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q));

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('folder', 'public');
      formData.append('ownerId', effectiveOwnerId);

      try {
        const res = await fetch(`${getApiUrl()}/api/upload`, {
          method: 'POST',
          headers: {
            'x-user-id': effectiveOwnerId,
            ...(user?.email ? { 'x-user-email': user.email } : {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const mediaItem: MediaItem = data.item;
          successfulItems.push(mediaItem);
          setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'completed', progress: 100, result: mediaItem } : q));
        } else {
          setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'error', progress: 0, error: 'Upload failed' } : q));
        }
      } catch {
        setBatchQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'error', progress: 0, error: 'Network error' } : q));
      }

      const overallProgress = Math.round(((i + 1) / pendingItems.length) * 100);
      setUploadProgress((prev) => ({ ...prev, percentage: overallProgress, batchCompleted: i + 1 }));
    }

    if (successfulItems.length > 0) {
      await syncBatchToFirebase(successfulItems, user);
      setBatchCompletedItems((prev) => [...prev, ...successfulItems]);
      setUploadProgress({
        state: 'success',
        percentage: 100,
        errorMessage: null,
        uploadedMedia: successfulItems[0],
      });
      if (onBatchUploadSuccess) onBatchUploadSuccess(successfulItems);
    }
  };

  const handleAddFilesToBatch = (files: FileList | File[]) => {
    if (isQuotaExhausted) return;
    setValidationError(null);
    const fileList = Array.from(files);
    const newItems: BatchFileItem[] = [];

    fileList.forEach((file) => {
      const err = validateFile(file);
      if (err) {
        setValidationError(err);
      } else {
        newItems.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          status: 'pending',
          progress: 0,
        });
      }
    });

    setBatchQueue((prev) => [...prev, ...newItems]);
    setUploadMode('batch');
  };

  const copyAllBatchLinks = async () => {
    if (batchCompletedItems.length === 0) return;
    const urls = batchCompletedItems.map((item) => item.downloadURL || item.directUrl).join('\n');
    const success = await copyToClipboard(urls);
    if (success) {
      setCopiedAllBatch(true);
      setTimeout(() => setCopiedAllBatch(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Format Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => handleFilterSelection('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'audio' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'video' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'image' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Images</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">
            {userLimits.tierName.toUpperCase()} Limit:{' '}
            <strong className="text-emerald-400 font-mono">
              {userLimits.remainingUploads}/{userLimits.maxUploads}
            </strong>{' '}
            (Max: {formatFileSize(userLimits.maxFileSizeBytes)})
          </span>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            if (e.dataTransfer.files.length === 1 && uploadMode === 'single') {
              const file = e.dataTransfer.files[0];
              const err = validateFile(file);
              if (err) setValidationError(err);
              else startSingleUpload(file);
            } else {
              handleAddFilesToBatch(e.dataTransfer.files);
            }
          }
        }}
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all ${
          isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              const file = e.target.files[0];
              const err = validateFile(file);
              if (err) setValidationError(err);
              else startSingleUpload(file);
            }
          }}
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white mb-4">
            {uploadProgress.state === 'uploading' ? (
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-emerald-400" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Upload & Convert to Permanent URL</h2>
          <p className="text-sm text-slate-400 mb-5">
            Verified storage in Firebase Storage + Cloud Firestore metadata.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl cursor-pointer"
            >
              Select File
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('batch');
                fileInputRef.current?.click();
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-sm font-semibold rounded-xl border border-slate-700 cursor-pointer"
            >
              Batch Upload
            </button>
          </div>

          {validationError && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300">
              {validationError}
            </div>
          )}

          {uploadProgress.state === 'uploading' && (
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading to Render API & Firebase Storage...</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-200" 
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};