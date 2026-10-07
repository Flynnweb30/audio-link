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

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const LOCAL_MAX_BATCH = 5;
const PROD_MAX_BATCH = 50;

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
  const isLocalEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const maxBatchFiles = isLocalEnvironment ? LOCAL_MAX_BATCH : PROD_MAX_BATCH;

  const [internalFilter, setInternalFilter] = useState<'all' | 'audio' | 'video' | 'image'>('all');
  const activeMediaFilter = currentFilter !== undefined ? currentFilter : internalFilter;

  const handleFilterSelection = (filter: 'all' | 'audio' | 'video' | 'image') => {
    setInternalFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

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

  const isQuotaExhausted = !user && guestRemaining <= 0;

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.opus', '.flac', '.aac'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext);
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(ext);

    if (!isAudio && !isVideo && !isImage && !ALLOWED_EXTS.includes(ext)) {
      return `Format "${ext || file.type}" is not supported. Supported: MP3, WAV, M4A, OGG, MP4, WEBM, PNG, JPG, WEBP.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds 100MB limit.`;
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

  const handleSingleFileSelection = (file: File) => {
    if (isQuotaExhausted) return;
    setValidationError(null);
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }
    startSingleUpload(file);
  };

  const handleAddFilesToBatch = (files: FileList | File[]) => {
    if (isQuotaExhausted) return;
    setValidationError(null);
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (batchQueue.length + fileList.length > maxBatchFiles) {
      setValidationError(
        isLocalEnvironment 
          ? `Local mode is limited to a maximum of ${LOCAL_MAX_BATCH} files per batch.` 
          : `Maximum ${PROD_MAX_BATCH} files can be queued per batch.`
      );
      return;
    }

    if (!user) {
      const totalCount = batchQueue.length + fileList.length;
      if (totalCount > guestRemaining) {
        setValidationError(
          `You have ${guestRemaining} guest credit(s) remaining today. Sign in with Google for unlimited permanent conversions.`
        );
      }
    }

    const newItems: BatchFileItem[] = [];
    const errors: string[] = [];

    fileList.forEach((file) => {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
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

    if (errors.length > 0 && newItems.length === 0) {
      setValidationError(errors[0]);
      return;
    }

    setBatchQueue((prev) => [...prev, ...newItems]);
    setUploadMode('batch');
  };

  const removeBatchItem = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBatchQueue = () => {
    setBatchQueue([]);
    setBatchCompletedItems([]);
    setValidationError(null);
  };

  const startSingleUpload = (file: File) => {
    setUploadProgress({
      state: 'uploading',
      percentage: 10,
      errorMessage: null,
      uploadedMedia: null,
    });

    // Upload directly to server endpoint (Same-Origin: completely avoids GCS CORS preflight failures)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'public');

    const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest');
    formData.append('userId', effectiveUserId);
    if (user?.email) {
      formData.append('userEmail', user.email);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('x-user-id', effectiveUserId);
    if (user?.email) {
      xhr.setRequestHeader('x-user-email', user.email);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(95, Math.round((event.loaded / event.total) * 90) + 5);
        setUploadProgress((prev) => ({
          ...prev,
          state: 'uploading',
          percentage: percent,
        }));
      }
    };

    xhr.onload = () => {
      let response: any = null;
      try {
        const raw = (xhr.responseText || '').trim();
        if (!raw) throw new Error('Empty server response');
        response = JSON.parse(raw);
      } catch {
        setUploadProgress({
          state: 'error',
          percentage: 0,
          errorMessage: xhr.status >= 400
            ? `Server error ${xhr.status}. Please retry upload.`
            : 'Server returned an invalid format. Check network.',
          uploadedMedia: null,
        });
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && response) {
        const mediaItem: MediaItem = response.item || (response.items && response.items[0]);
        if (!mediaItem) {
          setUploadProgress({
            state: 'error',
            percentage: 0,
            errorMessage: response.error || 'Server did not return media details.',
            uploadedMedia: null,
          });
          return;
        }

        const safeItem: MediaItem = {
          ...mediaItem,
          userId: user ? user.uid : effectiveUserId,
          userEmail: user?.email || undefined,
          isGuest: !user,
          duration: Number(mediaItem?.duration ?? mediaItem?.metadata?.duration ?? 0),
        };

        setUploadProgress({
          state: 'success',
          percentage: 100,
          errorMessage: null,
          uploadedMedia: safeItem,
        });

        onUploadSuccess(safeItem);
      } else {
        setUploadProgress({
          state: 'error',
          percentage: 0,
          errorMessage: response?.error || `Upload failed with status ${xhr.status}.`,
          uploadedMedia: null,
        });
      }
    };

    xhr.onerror = () => {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'Network error encountered during upload. Please retry.',
        uploadedMedia: null,
      });
    };

    xhr.send(formData);
  };

  const startBatchUpload = async () => {
    if (batchQueue.length === 0) return;

    const pendingItems = batchQueue.filter((item) => item.status !== 'completed');
    if (pendingItems.length === 0) return;

    const filesToUploadCount = pendingItems.length;
    if (!user && guestRemaining < filesToUploadCount) {
      if (guestRemaining === 0) {
        setValidationError('You have 0 guest credits left today. Sign in with Google for unlimited permanent conversions.');
        return;
      }
      setValidationError(
        `You have ${guestRemaining} credits left today, but selected ${filesToUploadCount} files. Please reduce selection or Sign In.`
      );
      return;
    }

    setUploadProgress({
      state: 'uploading',
      percentage: 5,
      errorMessage: null,
      uploadedMedia: null,
      batchTotal: batchQueue.length,
      batchCompleted: batchQueue.length - pendingItems.length,
    });

    const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_guest_id') || 'guest');
    const successfulItems: MediaItem[] = [];

    const uploadSingleItem = (item: BatchFileItem): Promise<MediaItem | null> => {
      return new Promise((resolve) => {
        try {
          setBatchQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q))
          );

          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('folder', 'public');
          formData.append('userId', effectiveUserId);
          if (user?.email) formData.append('userEmail', user.email);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload', true);
          xhr.setRequestHeader('x-user-id', effectiveUserId);
          if (user?.email) xhr.setRequestHeader('x-user-email', user.email);

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const p = Math.min(95, Math.round((evt.loaded / evt.total) * 90) + 10);
              setBatchQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress: p } : q))
              );
            }
          };

          xhr.onload = () => {
            try {
              const raw = (xhr.responseText || '').trim();
              if (!raw) {
                setBatchQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id ? { ...q, status: 'error', progress: 0, error: `Empty response (${xhr.status})` } : q
                  )
                );
                return resolve(null);
              }

              let res: any = null;
              try {
                res = JSON.parse(raw);
              } catch {
                setBatchQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id
                      ? { ...q, status: 'error', progress: 0, error: `Invalid response format (${xhr.status})` }
                      : q
                  )
                );
                return resolve(null);
              }

              if (xhr.status >= 200 && xhr.status < 300) {
                const mediaItem: MediaItem | undefined = res?.item || (res?.items && res.items[0]);
                if (mediaItem) {
                  const safeMedia: MediaItem = {
                    ...mediaItem,
                    userId: user ? user.uid : effectiveUserId,
                    userEmail: user?.email || undefined,
                    isGuest: !user,
                    duration: Number(mediaItem?.duration ?? mediaItem?.metadata?.duration ?? 0),
                  };
                  setBatchQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id
                        ? { ...q, status: 'completed', progress: 100, result: safeMedia }
                        : q
                    )
                  );
                  return resolve(safeMedia);
                } else {
                  setBatchQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id ? { ...q, status: 'error', progress: 0, error: res?.error || 'No media returned.' } : q
                    )
                  );
                  return resolve(null);
                }
              } else {
                setBatchQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id ? { ...q, status: 'error', progress: 0, error: res?.error || `HTTP ${xhr.status}` } : q
                  )
                );
                return resolve(null);
              }
            } catch (innerErr: any) {
              setBatchQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id ? { ...q, status: 'error', progress: 0, error: innerErr?.message || 'Parse error' } : q
                )
              );
              return resolve(null);
            }
          };

          xhr.onerror = () => {
            setBatchQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'error', progress: 0, error: 'Network error' } : q
              )
            );
            return resolve(null);
          };

          xhr.send(formData);
        } catch (outerErr: any) {
          setBatchQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'error', progress: 0, error: outerErr?.message || 'Upload exception' } : q
            )
          );
          resolve(null);
        }
      });
    };

    const CONCURRENCY_LIMIT = 2;
    let completedCount = 0;
    const itemsQueue = [...pendingItems];

    const worker = async () => {
      while (itemsQueue.length > 0) {
        const itemToUpload = itemsQueue.shift();
        if (!itemToUpload) break;

        const result = await uploadSingleItem(itemToUpload);
        if (result) {
          successfulItems.push(result);
        }
        completedCount++;

        const currentPercentage = Math.min(100, Math.round((completedCount / filesToUploadCount) * 100));
        setUploadProgress((prev) => ({
          ...prev,
          percentage: currentPercentage,
          batchCompleted: completedCount,
        }));
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, itemsQueue.length) },
      () => worker()
    );

    await Promise.all(workers);

    if (successfulItems.length > 0) {
      setBatchCompletedItems((prev) => [...prev, ...successfulItems]);
      setUploadProgress({
        state: 'success',
        percentage: 100,
        errorMessage: null,
        uploadedMedia: successfulItems[0],
        batchTotal: filesToUploadCount,
        batchCompleted: completedCount,
      });

      if (onBatchUploadSuccess) {
        onBatchUploadSuccess(successfulItems);
      } else {
        onUploadSuccess(successfulItems[0]);
      }
    } else {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'All uploads in this batch failed. Please check files and retry.',
        uploadedMedia: null,
      });
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isQuotaExhausted) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isQuotaExhausted) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1 && uploadMode === 'single') {
        handleSingleFileSelection(e.dataTransfer.files[0]);
      } else {
        handleAddFilesToBatch(e.dataTransfer.files);
      }
    }
  };

  const startRecording = async () => {
    if (isQuotaExhausted) return;

    try {
      setValidationError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsProcessingAudio(true);
        setTimeout(() => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const recordedFile = new File([audioBlob], `voice_recording_${Date.now()}.webm`, {
            type: 'audio/webm',
          });
          stream.getTracks().forEach((track) => track.stop());
          setIsProcessingAudio(false);
          handleSingleFileSelection(recordedFile);
        }, 400);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch {
      setValidationError('Microphone permission was denied or device is unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const copyAllBatchLinks = async () => {
    if (batchCompletedItems.length === 0) return;
    const urls = batchCompletedItems.map((item) => item.directUrl).join('\n');
    const success = await copyToClipboard(urls);
    if (success) {
      setCopiedAllBatch(true);
      setTimeout(() => setCopiedAllBatch(false), 2500);
    }
  };

  const copyItemLink = async (url: string, id: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedItemId(id);
      setTimeout(() => setCopiedItemId(null), 2000);
    }
  };

  const downloadBatchUrlList = () => {
    if (batchCompletedItems.length === 0) return;
    const content = batchCompletedItems
      .map((item) => `${item.originalName}\t${item.directUrl}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audiolink_urls_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isUploading = uploadProgress.state === 'uploading';

  const getAcceptString = () => {
    if (activeMediaFilter === 'audio') return 'audio/*,.mp3,.wav,.m4a,.ogg,.opus,.flac';
    if (activeMediaFilter === 'video') return 'video/*,.mp4,.mov,.webm,.mkv';
    if (activeMediaFilter === 'image') return 'image/*,.png,.jpg,.jpeg,.gif,.webp,.svg,.avif';
    return 'audio/*,video/*,image/*,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.png,.jpg,.jpeg,.webp,.avif,.svg';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => handleFilterSelection('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'audio'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'video'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterSelection('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaFilter === 'image'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Images</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/60 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => {
                setUploadMode('single');
                setValidationError(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                uploadMode === 'single'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('batch');
                setValidationError(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                uploadMode === 'batch'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Files className="w-3 h-3" />
              <span>Batch</span>
              {batchQueue.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-[10px] text-white flex items-center justify-center font-mono">
                  {batchQueue.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs">
            {isLocalEnvironment ? (
              <span className="text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                Local Limit: Max {LOCAL_MAX_BATCH} items
              </span>
            ) : user ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Unlimited Pro
              </span>
            ) : (
              <span className="text-slate-400">
                Guest:{' '}
                <strong className={guestRemaining === 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold font-mono"}>
                  {guestRemaining}/5
                </strong>{' '}
                today
              </span>
            )}
          </div>
        </div>
      </div>

      {isQuotaExhausted && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">Daily Guest Limit Reached (0/5 Remaining)</p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Sign in with Google for unlimited permanent conversions and cloud history!
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSigningIn}
            onClick={onSignIn}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Sign In for Unlimited</span>}
          </button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all ${
          isQuotaExhausted
            ? 'border-slate-800 bg-slate-900/40 opacity-70 cursor-not-allowed'
            : isDragging
            ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          disabled={isQuotaExhausted}
          accept={getAcceptString()}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (e.target.files.length > 1) {
                handleAddFilesToBatch(e.target.files);
              } else {
                handleSingleFileSelection(e.target.files[0]);
              }
            }
          }}
        />

        <input
          ref={batchFileInputRef}
          type="file"
          multiple
          disabled={isQuotaExhausted}
          accept={getAcceptString()}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFilesToBatch(e.target.files);
            }
          }}
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="relative mb-4 group">
            {isUploading && (
              <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
            )}
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white transition-all group-hover:scale-105 shadow-xl relative z-10">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              ) : isProcessingAudio ? (
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              ) : isQuotaExhausted ? (
                <Lock className="w-8 h-8 text-slate-500" />
              ) : uploadMode === 'batch' ? (
                <Files className="w-8 h-8 text-emerald-400" />
              ) : (
                <UploadCloud className="w-8 h-8 text-emerald-400" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {isQuotaExhausted
              ? 'Guest Allowance Limit'
              : isUploading
              ? uploadMode === 'batch'
                ? `Converting batch (${batchQueue.length} files)...`
                : 'Uploading and creating direct link...'
              : uploadMode === 'batch'
              ? 'Batch Media Converter'
              : 'Drag & Drop Media Here'}
          </h2>

          <p className="text-sm text-slate-400 mb-5 leading-relaxed max-w-md">
            {isQuotaExhausted
              ? 'Sign in with Google to continue uploading with unlimited permanent cloud storage.'
              : uploadMode === 'batch'
              ? `Select multiple files (audio, video, images) to convert together. ${
                  isLocalEnvironment ? `Local max: ${LOCAL_MAX_BATCH} files.` : ''
                }`
              : 'Permanent HTTP 206 Byte-Range streaming for MP3, WAV, M4A, OGG, MP4, MOV, WEBM, PNG & JPG.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isQuotaExhausted ? (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onSignIn}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Sign in with Google for Unlimited</span>
              </button>
            ) : uploadMode === 'single' ? (
              <>
                <button
                  type="button"
                  disabled={isUploading || isRecording || isProcessingAudio}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Select File</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isRecording}
                  onClick={() => {
                    setUploadMode('batch');
                    batchFileInputRef.current?.click();
                  }}
                  className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Files className="w-4 h-4 text-emerald-400" />
                  <span>Batch Upload</span>
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={startRecording}
                    className="px-4 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-rose-400" />
                    <span>Record Audio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all inline-flex items-center gap-2 animate-pulse cursor-pointer shadow-lg shadow-rose-600/20"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Recording ({recordSeconds}s)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Files</span>
                </button>

                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={startBatchUpload}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                    <span>{isUploading ? 'Converting...' : `Start Batch (${batchQueue.length} files)`}</span>
                  </button>
                )}

                {batchQueue.length > 0 && !isUploading && (
                  <button
                    type="button"
                    onClick={clearBatchQueue}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
            )}
          </div>

          {!isUploading && batchQueue.length === 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-500">Try a sample:</span>
              <button
                type="button"
                onClick={() => onSelectSample('sample_lofi_beat')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🎵 Lofi Chill Beat
              </button>
              <button
                type="button"
                onClick={() => onSelectSample('sample_nature_ambience')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🌲 Forest Ambience
              </button>
            </div>
          )}

          {uploadMode === 'batch' && batchQueue.length > 0 && (
            <div className="w-full mt-6 bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:p-4 text-left animate-in fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-semibold">
                <span>Queue: {batchQueue.length} / {maxBatchFiles} items</span>
                <span>Total: {formatFileSize(batchQueue.reduce((acc, f) => acc + f.size, 0))}</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {batchQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-slate-800 shrink-0">
                        {getMediaIcon(item)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate" title={item.name}>
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{item.progress}%</span>
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[11px] font-semibold text-rose-400" title={item.error}>
                          Failed
                        </span>
                      )}
                      {item.status === 'pending' && !isUploading && (
                        <button
                          type="button"
                          onClick={() => removeBatchItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchCompletedItems.length > 0 && (
            <div className="w-full mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {batchCompletedItems.length} Files Converted Successfully!
                    </h4>
                    <p className="text-[11px] text-emerald-300/80 mt-0.5">
                      Direct URLs ready for immediate streaming.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyAllBatchLinks}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedAllBatch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAllBatch ? 'Copied All!' : 'Copy All URLs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadBatchUrlList}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {batchCompletedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getMediaIcon(item)}
                      <span className="font-semibold text-white truncate" title={item.originalName}>
                        {item.originalName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyItemLink(item.directUrl, item.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedItemId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <a
                        href={item.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="w-full mt-6 space-y-2 animate-in fade-in">
              <div className="flex justify-between text-xs text-slate-400">
                <span className="font-medium flex items-center gap-1.5 text-white">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  {uploadMode === 'batch'
                    ? `Converting batch (${uploadProgress.percentage}%)...`
                    : 'Streaming to CDN storage...'}
                </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  {uploadProgress.percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {validationError && (
            <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Notice</p>
                <p className="mt-0.5 text-rose-300">{validationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {uploadProgress.state === 'error' && uploadProgress.errorMessage && (
            <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Upload Error</p>
                <p className="mt-0.5 text-rose-300">{uploadProgress.errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadProgress((p) => ({ ...p, state: 'idle', errorMessage: null }))}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};