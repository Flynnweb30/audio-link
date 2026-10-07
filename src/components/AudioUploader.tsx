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
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_BATCH_FILES = 50;

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
}) => {
  const [activeMediaFilter, setActiveMediaFilter] = useState<'all' | 'audio' | 'video' | 'image'>('all');
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
      return `Unsupported format "${ext || file.type}". Supported: MP3, WAV, M4A, OGG, MP4, WEBM, MOV, PNG, JPG, WEBP, AVIF.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds 100MB limit.`;
    }

    if (file.size === 0) {
      return `"${file.name}" is empty (0 bytes).`;
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

    if (batchQueue.length + fileList.length > MAX_BATCH_FILES) {
      setValidationError(`Maximum ${MAX_BATCH_FILES} files can be uploaded per batch.`);
      return;
    }

    if (!user) {
      const totalCount = batchQueue.length + fileList.length;
      if (totalCount > guestRemaining) {
        setValidationError(
          `You have ${guestRemaining} guest credit(s) remaining this month. Sign in with Google for unlimited batch conversions.`
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'public');

    const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_user_id') || 'guest');
    formData.append('userId', effectiveUserId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('x-user-id', effectiveUserId);

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
            ? `Server error ${xhr.status}. Please try again.`
            : 'Server returned an invalid format. Please verify connection.',
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
            errorMessage: response.error || 'Server did not return media item details.',
            uploadedMedia: null,
          });
          return;
        }

        setUploadProgress({
          state: 'success',
          percentage: 100,
          errorMessage: null,
          uploadedMedia: mediaItem,
        });

        try {
          onUploadSuccess(mediaItem);
        } catch (callbackErr) {
          console.error('Error in onUploadSuccess callback:', callbackErr);
        }
      } else {
        const errorMsg = response?.error || `Upload failed with status ${xhr.status}.`;
        setUploadProgress({
          state: 'error',
          percentage: 0,
          errorMessage: errorMsg,
          uploadedMedia: null,
        });
      }
    };

    xhr.onerror = () => {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'Network connection lost during upload. Please retry.',
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
        setValidationError('You have 0 guest credits left. Sign in with Google for unlimited batch conversions.');
        return;
      }
      setValidationError(
        `You have ${guestRemaining} credits left, but selected ${filesToUploadCount} files. Please reduce selection or Sign In.`
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

    const effectiveUserId = user ? user.uid : (localStorage.getItem('audiolink_user_id') || 'guest');
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

          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload', true);
          xhr.setRequestHeader('x-user-id', effectiveUserId);

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
                  setBatchQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id
                        ? { ...q, status: 'completed', progress: 100, result: mediaItem }
                        : q
                    )
                  );
                  return resolve(mediaItem);
                } else {
                  setBatchQueue((prev) =>
                    prev.map((q) =>
                      q.id === item.id ? { ...q, status: 'error', progress: 0, error: res?.error || 'No item returned.' } : q
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
                  q.id === item.id ? { ...q, status: 'error', progress: 0, error: innerErr.message } : q
                )
              );
              return resolve(null);
            }
          };

          xhr.onerror = () => {
            setBatchQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'error', progress: 0, error: 'Network error occurred.' } : q
              )
            );
            return resolve(null);
          };

          xhr.send(formData);
        } catch (outerErr: any) {
          setBatchQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'error', progress: 0, error: outerErr.message } : q
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

      try {
        if (onBatchUploadSuccess) {
          onBatchUploadSuccess(successfulItems);
        } else {
          onUploadSuccess(successfulItems[0]);
        }
      } catch (cbErr) {
        console.error('Error invoking batch callback:', cbErr);
      }
    } else {
      setUploadProgress({
        state: 'error',
        percentage: 0,
        errorMessage: 'All uploads in the batch failed. Please verify files and retry.',
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
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setValidationError('Microphone access was denied or is unavailable on this device.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMediaFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMediaFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMediaFilter('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMediaFilter === 'audio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-500" />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMediaFilter('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMediaFilter === 'video'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-500" />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMediaFilter('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeMediaFilter === 'image'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Images</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setUploadMode('single');
                setValidationError(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                uploadMode === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
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
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                uploadMode === 'batch'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Files className="w-3 h-3" />
              <span>Batch Upload</span>
              {batchQueue.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-[10px] text-white flex items-center justify-center font-mono">
                  {batchQueue.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs">
            {user ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Unlimited active
              </span>
            ) : (
              <span className="text-slate-500">
                Guest limit:{' '}
                <strong className={guestRemaining === 0 ? "text-rose-600 font-bold" : "text-slate-800 font-bold font-mono"}>
                  {guestRemaining}/30
                </strong>{' '}
                left
              </span>
            )}
          </div>
        </div>
      </div>

      {isQuotaExhausted && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">Monthly Guest Limit Reached (0/30 Remaining)</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Sign in with Google for unlimited batch conversions and persistent cloud history!
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSigningIn}
            onClick={onSignIn}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSigningIn ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <span>Sign In for Unlimited</span>}
          </button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all ${
          isQuotaExhausted
            ? 'border-slate-200 bg-slate-50/70 opacity-75 cursor-not-allowed'
            : isDragging
            ? 'border-emerald-600 bg-emerald-50/70 ring-4 ring-emerald-100 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
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
              <span className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping" />
            )}
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 transition-all duration-300 group-hover:scale-105 shadow-2xs relative z-10">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              ) : isProcessingAudio ? (
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              ) : isQuotaExhausted ? (
                <Lock className="w-8 h-8 text-slate-400" />
              ) : uploadMode === 'batch' ? (
                <Files className="w-8 h-8 text-emerald-600" />
              ) : (
                <UploadCloud className="w-8 h-8 text-slate-800" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {isQuotaExhausted
              ? 'Guest Limit Reached'
              : isUploading
              ? uploadMode === 'batch'
                ? `Converting batch of ${batchQueue.length} files...`
                : 'Uploading and generating direct URL...'
              : uploadMode === 'batch'
              ? 'Batch Media Uploader'
              : 'Drop All Media Here'}
          </h2>

          <p className="text-sm text-slate-500 mb-5 leading-relaxed max-w-md">
            {isQuotaExhausted
              ? 'You have used your 30 free guest conversions for this month. Sign in with Google for unlimited batch uploads.'
              : uploadMode === 'batch'
              ? `Select multiple files (audio, video, images) to convert simultaneously. ${
                  !user ? `Guest allowance: ${guestRemaining}/30 left.` : 'Unlimited Pro batch upload active.'
                }`
              : 'Upload MP3, WAV, M4A, OGG, MP4, MOV, WEBM, PNG, JPG, or AVIF. Generates permanent streamable URLs.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isQuotaExhausted ? (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onSignIn}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Sign in with Google to Continue</span>
              </button>
            ) : uploadMode === 'single' ? (
              <>
                <button
                  type="button"
                  disabled={isUploading || isRecording || isProcessingAudio}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Browse Media File</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isRecording}
                  onClick={() => {
                    setUploadMode('batch');
                    batchFileInputRef.current?.click();
                  }}
                  className="px-4 py-2.5 border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Files className="w-4 h-4 text-emerald-600" />
                  <span>Batch Upload</span>
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={startRecording}
                    className="px-4 py-2.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-sm font-medium rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-rose-500" />
                    <span>Record Audio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 animate-pulse shadow-sm cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop & Upload ({recordSeconds}s)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Files to Batch</span>
                </button>

                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={startBatchUpload}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                    <span>{isUploading ? 'Converting Batch...' : `Upload All (${batchQueue.length} files)`}</span>
                  </button>
                )}

                {batchQueue.length > 0 && !isUploading && (
                  <button
                    type="button"
                    onClick={clearBatchQueue}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
            )}
          </div>

          {uploadMode === 'batch' && batchQueue.length > 0 && (
            <div className="w-full mt-6 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                <div className="flex items-center gap-2">
                  <span>Queue ({batchQueue.length} files)</span>
                  {!user && (
                    <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Consumes {Math.min(batchQueue.length, guestRemaining)}/{guestRemaining} credits
                    </span>
                  )}
                </div>
                <span>Total: {formatFileSize(batchQueue.reduce((acc, f) => acc + f.size, 0))}</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {batchQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1 rounded-md bg-slate-100 shrink-0">
                        {getMediaIcon(item)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{item.progress}%</span>
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>Uploaded</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[11px] font-semibold text-rose-600" title={item.error}>
                          Failed
                        </span>
                      )}
                      {item.status === 'pending' && !isUploading && (
                        <button
                          type="button"
                          onClick={() => removeBatchItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
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
            <div className="w-full mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      {batchCompletedItems.length} Files Converted Successfully!
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Direct URLs generated and streamable across all browsers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyAllBatchLinks}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedAllBatch ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>All Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All URLs</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={downloadBatchUrlList}
                    className="px-2.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
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
                    className="flex items-center justify-between gap-2 p-2 bg-white/90 border border-emerald-100 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getMediaIcon(item)}
                      <span className="font-semibold text-slate-800 truncate" title={item.originalName}>
                        {item.originalName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyItemLink(item.directUrl, item.id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedItemId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
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
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
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
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  {uploadMode === 'batch'
                    ? `Converting batch files (${uploadProgress.percentage}%)...`
                    : 'Streaming to cloud & generating permanent link...'}
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {uploadProgress.percentage}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {validationError && (
            <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5 text-rose-700">{validationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {uploadProgress.state === 'error' && uploadProgress.errorMessage && (
            <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Upload Failed</p>
                <p className="mt-0.5 text-rose-700">{uploadProgress.errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadProgress((p) => ({ ...p, state: 'idle', errorMessage: null }))}
                className="text-rose-400 hover:text-rose-700 font-bold cursor-pointer"
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
